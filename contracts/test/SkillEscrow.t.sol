// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { BaseTest } from "./helpers/BaseTest.sol";
import { SkillINFT } from "../src/SkillINFT.sol";
import { SkillRegistry } from "../src/SkillRegistry.sol";
import { SkillEscrow } from "../src/SkillEscrow.sol";
import { SkillTypes } from "../src/libraries/SkillTypes.sol";
import { AttestationVerifier } from "../src/libraries/AttestationVerifier.sol";

/// @dev Malicious creator that attempts to re-enter `completeRental` during
///      payout so the reentrancy guard can be exercised.
contract ReentrantCreator {
    SkillEscrow public escrow;
    uint256 public rentalId;
    bool public attacked;

    constructor(SkillEscrow e) {
        escrow = e;
    }

    function setRental(uint256 id) external {
        rentalId = id;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        if (!attacked) {
            attacked = true;
            escrow.completeRental(rentalId);
        }
    }
}

contract SkillEscrowTest is BaseTest {
    SkillINFT internal inft;
    SkillRegistry internal registry;
    SkillEscrow internal escrow;

    uint256 internal skillTokenId;
    uint256 internal constant PRICE = 1 ether;

    Wallet internal scorer;
    Wallet internal oracle;

    function setUp() public {
        scorer = _wallet("scorer");
        oracle = _wallet("oracle");
        vm.startPrank(deployer);
        inft = new SkillINFT(deployer, oracle.addr);
        registry = new SkillRegistry(deployer, address(inft));
        escrow = new SkillEscrow(deployer, address(registry), address(inft), treasury, scorer.addr);
        registry.setSkillEscrow(address(escrow));
        vm.stopPrank();

        // Creator mints a skill and delegates usage-authorization to the escrow.
        vm.startPrank(creator);
        skillTokenId = inft.mint(creator, _defaultDataHash(), _defaultStorageURI());
        inft.setApprovalForAll(address(escrow), true);
        registry.registerSkill(skillTokenId, "quant-bot", "desc", "trading", PRICE, _defaultStorageURI());
        vm.stopPrank();

        vm.deal(renter, 100 ether);
    }

    /// @dev Build an attestation signed by the scorer wallet — binds score so
    ///      replays with a different score are rejected on-chain.
    function _signedAttestation(uint256 qualityScore, address teemlProvider, bytes32 responseHash)
        internal
        returns (bytes memory)
    {
        bytes32 requestHash = keccak256("skillforge.request.canonical");
        bytes32 digest = keccak256(abi.encodePacked(requestHash, responseHash, teemlProvider, qualityScore));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(scorer.key, digest);
        bytes memory signature = abi.encodePacked(r, s, v);
        return abi.encode(requestHash, responseHash, teemlProvider, qualityScore, signature);
    }

    /// @dev Shortcut: default-provider attestation matching whatever score is requested.
    function _stubAttestation(uint256 qualityScore) internal returns (bytes memory) {
        return _signedAttestation(qualityScore, makeAddr("teeml-provider"), keccak256("work-response"));
    }

    // ---------------------------------------------------------------------
    //  Happy path
    // ---------------------------------------------------------------------

    function _requestAndFund() internal returns (uint256 rentalId) {
        vm.prank(renter);
        rentalId = escrow.requestRental(skillTokenId);

        vm.prank(renter);
        escrow.fundRental{ value: PRICE }(rentalId);
    }

    function _runThroughSubmission(uint256 rentalId, bytes32 workProof) internal {
        vm.prank(creator);
        escrow.authorizeAccess(rentalId);

        vm.prank(renter);
        escrow.submitWork(rentalId, workProof);
    }

    function test_FullHappyPath_RequestThroughComplete() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("work"));

        vm.prank(arbitrator);
        escrow.verifyWork(rentalId, 9200, _stubAttestation(9200));

        uint256 creatorBalanceBefore = creator.balance;
        uint256 treasuryBalanceBefore = treasury.balance;

        escrow.completeRental(rentalId);

        uint256 protocolCut = (PRICE * 500) / 10_000;
        uint256 creatorCut = PRICE - protocolCut;

        assertEq(creator.balance - creatorBalanceBefore, creatorCut);
        assertEq(treasury.balance - treasuryBalanceBefore, protocolCut);

        SkillTypes.Rental memory rental = escrow.getRental(rentalId);
        assertEq(uint8(rental.state), uint8(SkillTypes.RentalState.Completed));
        assertEq(rental.qualityScore, 9200);

        // Registry should be updated too.
        assertEq(registry.getSkill(skillTokenId).qualityScore, 9200);
        assertEq(registry.getSkill(skillTokenId).totalRentals, 1);
    }

    function test_AuthorizeAccess_GrantsINFTUsage() public {
        uint256 rentalId = _requestAndFund();
        vm.prank(creator);
        escrow.authorizeAccess(rentalId);

        assertTrue(inft.isAuthorized(skillTokenId, renter));
    }

    // ---------------------------------------------------------------------
    //  Guard clauses
    // ---------------------------------------------------------------------

    function test_Request_RevertsIfSkillInactive() public {
        vm.prank(creator);
        registry.deactivateSkill(skillTokenId);

        vm.expectRevert(SkillEscrow.SkillInactive.selector);
        vm.prank(renter);
        escrow.requestRental(skillTokenId);
    }

    function test_Fund_RevertsOnWrongAmount() public {
        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(skillTokenId);

        vm.expectRevert(SkillEscrow.InsufficientPayment.selector);
        vm.prank(renter);
        escrow.fundRental{ value: PRICE - 1 }(rentalId);
    }

    function test_Fund_RevertsForNonRenter() public {
        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(skillTokenId);

        vm.deal(stranger, 10 ether);
        vm.expectRevert(SkillEscrow.NotRenter.selector);
        vm.prank(stranger);
        escrow.fundRental{ value: PRICE }(rentalId);
    }

    function test_Fund_RevertsInWrongState() public {
        uint256 rentalId = _requestAndFund();

        vm.expectRevert(SkillEscrow.InvalidState.selector);
        vm.prank(renter);
        escrow.fundRental{ value: PRICE }(rentalId);
    }

    function test_Authorize_RevertsBeforeFunding() public {
        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(skillTokenId);

        vm.expectRevert(SkillEscrow.InvalidState.selector);
        vm.prank(creator);
        escrow.authorizeAccess(rentalId);
    }

    function test_Authorize_RevertsForNonCreator() public {
        uint256 rentalId = _requestAndFund();

        vm.expectRevert(SkillEscrow.NotCreator.selector);
        vm.prank(stranger);
        escrow.authorizeAccess(rentalId);
    }

    function test_SubmitWork_OnlyRenter() public {
        uint256 rentalId = _requestAndFund();
        vm.prank(creator);
        escrow.authorizeAccess(rentalId);

        vm.expectRevert(SkillEscrow.NotRenter.selector);
        vm.prank(stranger);
        escrow.submitWork(rentalId, keccak256("w"));
    }

    function test_SubmitWork_RevertsOnZeroProof() public {
        uint256 rentalId = _requestAndFund();
        vm.prank(creator);
        escrow.authorizeAccess(rentalId);

        vm.expectRevert(SkillEscrow.InvalidAttestation.selector);
        vm.prank(renter);
        escrow.submitWork(rentalId, bytes32(0));
    }

    function test_Verify_RevertsOnInvalidScore() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));

        vm.expectRevert(SkillEscrow.InvalidScore.selector);
        escrow.verifyWork(rentalId, 10_001, _stubAttestation(10_001));
    }

    function test_Verify_RevertsOnEmptyAttestation() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));

        // Empty blob can't be ABI-decoded into the Attestation struct.
        vm.expectRevert();
        escrow.verifyWork(rentalId, 9000, "");
    }

    function test_Verify_RevertsWhenScorerNotWhitelisted() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));

        // Sign with an unknown key.
        Wallet memory rogue = _wallet("rogue-scorer");
        bytes32 requestHash = keccak256("req");
        bytes32 responseHash = keccak256("resp");
        address prov = makeAddr("teeml-provider");
        uint256 qs = 8500;
        bytes32 digest = keccak256(abi.encodePacked(requestHash, responseHash, prov, qs));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(rogue.key, digest);
        bytes memory rogueAtt = abi.encode(requestHash, responseHash, prov, qs, abi.encodePacked(r, s, v));

        vm.expectRevert(AttestationVerifier.ProviderNotWhitelisted.selector);
        escrow.verifyWork(rentalId, qs, rogueAtt);
    }

    function test_Verify_RevertsOnScoreMismatch() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));

        // Attestation signed for 9000, but caller claims 8500 → mismatch.
        bytes memory att = _stubAttestation(9000);
        vm.expectRevert(AttestationVerifier.ScoreMismatch.selector);
        escrow.verifyWork(rentalId, 8500, att);
    }

    function test_Complete_RevertsBeforeVerify() public {
        uint256 rentalId = _requestAndFund();

        vm.expectRevert(SkillEscrow.InvalidState.selector);
        escrow.completeRental(rentalId);
    }

    function test_GetRental_RevertsForUnknown() public {
        vm.expectRevert(SkillEscrow.RentalNotFound.selector);
        escrow.getRental(999);
    }

    // ---------------------------------------------------------------------
    //  Dispute path
    // ---------------------------------------------------------------------

    function test_Dispute_RenterRefund() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("bad-work"));

        uint256 renterBefore = renter.balance;

        vm.prank(renter);
        escrow.dispute(rentalId);

        vm.prank(deployer);
        escrow.resolveDispute(rentalId, true);

        assertEq(renter.balance - renterBefore, PRICE);
        assertEq(uint8(escrow.getRental(rentalId).state), uint8(SkillTypes.RentalState.Completed));
    }

    function test_Dispute_CreatorWins() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("good-work"));

        uint256 creatorBefore = creator.balance;

        vm.prank(creator);
        escrow.dispute(rentalId);

        vm.prank(deployer);
        escrow.resolveDispute(rentalId, false);

        uint256 protocolCut = (PRICE * 500) / 10_000;
        assertEq(creator.balance - creatorBefore, PRICE - protocolCut);
    }

    function test_Dispute_OnlyParties() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));

        vm.expectRevert(SkillEscrow.NotParty.selector);
        vm.prank(stranger);
        escrow.dispute(rentalId);
    }

    function test_Dispute_WrongState() public {
        uint256 rentalId = _requestAndFund();

        vm.expectRevert(SkillEscrow.InvalidState.selector);
        vm.prank(renter);
        escrow.dispute(rentalId);
    }

    function test_ResolveDispute_OnlyOwner() public {
        uint256 rentalId = _requestAndFund();
        _runThroughSubmission(rentalId, keccak256("w"));
        vm.prank(renter);
        escrow.dispute(rentalId);

        vm.expectRevert();
        vm.prank(stranger);
        escrow.resolveDispute(rentalId, true);
    }

    // ---------------------------------------------------------------------
    //  Admin / pausable / reentrancy
    // ---------------------------------------------------------------------

    function test_SetProtocolFee_RespectsCap() public {
        vm.prank(deployer);
        escrow.setProtocolFeeBps(1_000);
        assertEq(escrow.protocolFeeBps(), 1_000);

        vm.expectRevert(SkillEscrow.FeeTooHigh.selector);
        vm.prank(deployer);
        escrow.setProtocolFeeBps(1_001);
    }

    function test_SetTreasury_OnlyOwnerNonZero() public {
        vm.expectRevert();
        vm.prank(stranger);
        escrow.setProtocolTreasury(stranger);

        vm.expectRevert(SkillEscrow.ZeroAddress.selector);
        vm.prank(deployer);
        escrow.setProtocolTreasury(address(0));

        address newTreasury = makeAddr("new-treasury");
        vm.prank(deployer);
        escrow.setProtocolTreasury(newTreasury);
        assertEq(escrow.protocolTreasury(), newTreasury);
    }

    function test_Pause_BlocksStateChanges() public {
        vm.prank(deployer);
        escrow.pause();

        vm.expectRevert();
        vm.prank(renter);
        escrow.requestRental(skillTokenId);

        vm.prank(deployer);
        escrow.unpause();

        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(skillTokenId);
        assertGt(rentalId, 0);
    }

    function test_Constructor_RevertsOnZeroAddresses() public {
        vm.expectRevert(SkillEscrow.ZeroAddress.selector);
        new SkillEscrow(deployer, address(0), address(inft), treasury, scorer.addr);

        vm.expectRevert(SkillEscrow.ZeroAddress.selector);
        new SkillEscrow(deployer, address(registry), address(0), treasury, scorer.addr);

        vm.expectRevert(SkillEscrow.ZeroAddress.selector);
        new SkillEscrow(deployer, address(registry), address(inft), address(0), scorer.addr);
    }

    function test_Complete_ReentrancyGuardTrips() public {
        ReentrantCreator attacker = new ReentrantCreator(escrow);

        // Malicious creator mints, approves escrow, and registers a skill.
        vm.startPrank(address(attacker));
        uint256 evilToken = inft.mint(address(attacker), keccak256("evil"), "og://evil");
        inft.setApprovalForAll(address(escrow), true);
        registry.registerSkill(evilToken, "evil", "d", "trading", PRICE, "og://evil");
        vm.stopPrank();

        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(evilToken);
        vm.prank(renter);
        escrow.fundRental{ value: PRICE }(rentalId);

        vm.prank(address(attacker));
        escrow.authorizeAccess(rentalId);
        vm.prank(renter);
        escrow.submitWork(rentalId, keccak256("w"));
        escrow.verifyWork(rentalId, 8000, _stubAttestation(8000));

        attacker.setRental(rentalId);

        // The outer completeRental reverts because receive() tries to re-enter.
        vm.expectRevert();
        escrow.completeRental(rentalId);
    }

    function testFuzz_Complete_DistributesPaymentAccurately(uint96 price, uint16 feeBps) public {
        price = uint96(bound(uint256(price), 1, 100 ether));
        feeBps = uint16(bound(uint256(feeBps), 0, 1_000));

        // Mint a fresh skill at the fuzzed price.
        vm.startPrank(creator);
        uint256 newToken = inft.mint(creator, keccak256(abi.encode(price)), "og://skills/fuzz");
        registry.registerSkill(newToken, "fuzz", "desc", "trading", price, "og://skills/fuzz");
        vm.stopPrank();

        vm.prank(deployer);
        escrow.setProtocolFeeBps(feeBps);

        vm.deal(renter, uint256(price));
        vm.prank(renter);
        uint256 rentalId = escrow.requestRental(newToken);
        vm.prank(renter);
        escrow.fundRental{ value: price }(rentalId);

        vm.prank(creator);
        escrow.authorizeAccess(rentalId);
        vm.prank(renter);
        escrow.submitWork(rentalId, keccak256("w"));
        escrow.verifyWork(rentalId, 8000, _stubAttestation(8000));

        uint256 creatorBefore = creator.balance;
        uint256 treasuryBefore = treasury.balance;

        escrow.completeRental(rentalId);

        uint256 expectedProtocol = (uint256(price) * feeBps) / 10_000;
        uint256 expectedCreator = uint256(price) - expectedProtocol;

        assertEq(creator.balance - creatorBefore, expectedCreator);
        assertEq(treasury.balance - treasuryBefore, expectedProtocol);
    }
}
