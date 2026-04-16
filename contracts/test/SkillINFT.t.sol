// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { BaseTest } from "./helpers/BaseTest.sol";
import { SkillINFT } from "../src/SkillINFT.sol";
import { IERC7857 } from "../src/interfaces/IERC7857.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract SkillINFTTest is BaseTest {
    SkillINFT internal inft;

    event SkillMinted(uint256 indexed tokenId, address indexed creator, bytes32 dataHash, string storageURI);
    event UsageAuthorized(uint256 indexed tokenId, address indexed user, uint256 expiresAt);
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newDataHash, string newStorageURI);

    Wallet internal oracle;

    function setUp() public {
        oracle = _wallet("oracle");
        vm.prank(deployer);
        inft = new SkillINFT(deployer, oracle.addr);
    }

    /// @dev Build a transfer/clone proof signed by the oracle for (tokenId, from, to, sealedKey).
    function _oracleProof(uint256 tokenId, address from, address to, bytes memory sealedKey)
        internal
        returns (bytes memory)
    {
        bytes32 sealedKeyHash = keccak256(sealedKey);
        bytes32 digest = keccak256(abi.encodePacked(tokenId, from, to, sealedKeyHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oracle.key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _mintDefault() internal returns (uint256 tokenId) {
        vm.prank(creator);
        tokenId = inft.mint(creator, _defaultDataHash(), _defaultStorageURI());
    }

    function test_Mint_SetsStateAndEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit SkillMinted(1, creator, _defaultDataHash(), _defaultStorageURI());

        vm.prank(creator);
        uint256 tokenId = inft.mint(creator, _defaultDataHash(), _defaultStorageURI());

        assertEq(tokenId, 1);
        assertEq(inft.ownerOf(tokenId), creator);
        assertEq(inft.dataHashOf(tokenId), _defaultDataHash());
        assertEq(inft.storageURIOf(tokenId), _defaultStorageURI());
        assertEq(inft.totalMinted(), 1);
    }

    function test_Mint_IncrementsTokenIds() public {
        uint256 first = _mintDefault();
        uint256 second = _mintDefault();
        assertEq(first, 1);
        assertEq(second, 2);
    }

    function test_Mint_RevertsOnZeroDataHash() public {
        vm.expectRevert(SkillINFT.InvalidProof.selector);
        vm.prank(creator);
        inft.mint(creator, bytes32(0), _defaultStorageURI());
    }

    function test_Mint_RevertsOnZeroRecipient() public {
        vm.expectRevert(SkillINFT.Unauthorized.selector);
        vm.prank(creator);
        inft.mint(address(0), _defaultDataHash(), _defaultStorageURI());
    }

    function test_AuthorizeUsage_OnlyOwner() public {
        uint256 tokenId = _mintDefault();

        vm.expectEmit(true, true, false, true);
        emit UsageAuthorized(tokenId, renter, block.timestamp + 1 days);

        vm.prank(creator);
        inft.authorizeUsage(tokenId, renter, block.timestamp + 1 days);

        assertTrue(inft.isAuthorized(tokenId, renter));
    }

    function test_AuthorizeUsage_RevertsForNonOwner() public {
        uint256 tokenId = _mintDefault();

        vm.expectRevert(SkillINFT.NotOwner.selector);
        vm.prank(stranger);
        inft.authorizeUsage(tokenId, renter, block.timestamp + 1 days);
    }

    function test_AuthorizeUsage_RevertsOnPastExpiry() public {
        uint256 tokenId = _mintDefault();

        vm.expectRevert(SkillINFT.ExpiredAuthorization.selector);
        vm.prank(creator);
        inft.authorizeUsage(tokenId, renter, block.timestamp);
    }

    function test_AuthorizeUsage_RevertsOnZeroUser() public {
        uint256 tokenId = _mintDefault();

        vm.expectRevert(SkillINFT.Unauthorized.selector);
        vm.prank(creator);
        inft.authorizeUsage(tokenId, address(0), block.timestamp + 1 days);
    }

    function test_IsAuthorized_FalseAfterExpiry() public {
        uint256 tokenId = _mintDefault();
        uint256 expiresAt = block.timestamp + 1 hours;

        vm.prank(creator);
        inft.authorizeUsage(tokenId, renter, expiresAt);

        assertTrue(inft.isAuthorized(tokenId, renter));

        vm.warp(expiresAt + 1);
        assertFalse(inft.isAuthorized(tokenId, renter));
    }

    function test_Transfer_SucceedsWithOracleProof() public {
        uint256 tokenId = _mintDefault();
        bytes memory proof = _oracleProof(tokenId, creator, renter, STUB_SEALED_KEY);

        vm.prank(creator);
        inft.transfer(creator, renter, tokenId, STUB_SEALED_KEY, proof);

        assertEq(inft.ownerOf(tokenId), renter);
    }

    function test_Transfer_RevertsOnEmptyProof() public {
        uint256 tokenId = _mintDefault();

        // Empty proof → ECDSAInvalidSignatureLength(0) from OZ.
        vm.expectRevert();
        vm.prank(creator);
        inft.transfer(creator, renter, tokenId, STUB_SEALED_KEY, "");
    }

    function test_Transfer_RevertsOnEmptySealedKey() public {
        uint256 tokenId = _mintDefault();
        bytes memory proof = _oracleProof(tokenId, creator, renter, STUB_SEALED_KEY);

        vm.expectRevert(SkillINFT.InvalidProof.selector);
        vm.prank(creator);
        inft.transfer(creator, renter, tokenId, "", proof);
    }

    function test_Transfer_RevertsOnForgedProof() public {
        uint256 tokenId = _mintDefault();
        Wallet memory imposter = _wallet("imposter");
        bytes32 digest = keccak256(abi.encodePacked(tokenId, creator, renter, keccak256(STUB_SEALED_KEY)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(imposter.key, digest);
        bytes memory badProof = abi.encodePacked(r, s, v);

        vm.expectRevert(SkillINFT.InvalidProof.selector);
        vm.prank(creator);
        inft.transfer(creator, renter, tokenId, STUB_SEALED_KEY, badProof);
    }

    function test_Transfer_RevertsForNonOwner() public {
        uint256 tokenId = _mintDefault();
        bytes memory proof = _oracleProof(tokenId, stranger, renter, STUB_SEALED_KEY);

        vm.expectRevert(SkillINFT.NotOwner.selector);
        vm.prank(stranger);
        inft.transfer(stranger, renter, tokenId, STUB_SEALED_KEY, proof);
    }

    function test_Transfer_RevertsIfNotApproved() public {
        uint256 tokenId = _mintDefault();
        bytes memory proof = _oracleProof(tokenId, creator, renter, STUB_SEALED_KEY);

        vm.expectRevert(SkillINFT.Unauthorized.selector);
        vm.prank(stranger);
        inft.transfer(creator, renter, tokenId, STUB_SEALED_KEY, proof);
    }

    function test_Clone_CopiesMetadataToNewToken() public {
        uint256 tokenId = _mintDefault();
        // Oracle proof binds the source tokenId, not the new one — the contract
        // verifies the proof *before* minting.
        bytes memory proof = _oracleProof(tokenId, creator, renter, STUB_SEALED_KEY);

        vm.prank(creator);
        uint256 newTokenId = inft.clone(tokenId, renter, STUB_SEALED_KEY, proof);

        assertEq(newTokenId, 2);
        assertEq(inft.ownerOf(newTokenId), renter);
        assertEq(inft.dataHashOf(newTokenId), inft.dataHashOf(tokenId));
        assertEq(inft.storageURIOf(newTokenId), inft.storageURIOf(tokenId));
    }

    function test_Clone_RevertsForNonOwner() public {
        uint256 tokenId = _mintDefault();

        vm.expectRevert(SkillINFT.NotOwner.selector);
        vm.prank(stranger);
        inft.clone(tokenId, renter, STUB_SEALED_KEY, STUB_PROOF);
    }

    function test_Clone_RevertsOnEmptyProof() public {
        uint256 tokenId = _mintDefault();

        // Empty signature blob → OZ ECDSAInvalidSignatureLength.
        vm.expectRevert();
        vm.prank(creator);
        inft.clone(tokenId, renter, STUB_SEALED_KEY, "");
    }

    function test_UpdateMetadata_RotatesPayload() public {
        uint256 tokenId = _mintDefault();
        bytes32 newHash = keccak256("updated");
        string memory newUri = "og://skills/updated";

        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(tokenId, newHash, newUri);

        vm.prank(creator);
        inft.updateMetadata(tokenId, newHash, newUri);

        assertEq(inft.dataHashOf(tokenId), newHash);
        assertEq(inft.storageURIOf(tokenId), newUri);
    }

    function test_UpdateMetadata_RevertsForNonOwner() public {
        uint256 tokenId = _mintDefault();

        vm.expectRevert(SkillINFT.NotOwner.selector);
        vm.prank(stranger);
        inft.updateMetadata(tokenId, keccak256("x"), "og://skills/x");
    }

    function test_Royalty_Returns5Percent() public {
        uint256 tokenId = _mintDefault();
        (address receiver, uint256 royaltyAmount) = inft.royaltyInfo(tokenId, 10_000);
        assertEq(receiver, creator);
        assertEq(royaltyAmount, 500);
    }

    function test_SupportsInterface_ERC7857AndERC2981AndERC721() public view {
        assertTrue(inft.supportsInterface(type(IERC7857).interfaceId));
        // ERC-721 interface id
        assertTrue(inft.supportsInterface(0x80ac58cd));
        // ERC-2981 interface id
        assertTrue(inft.supportsInterface(0x2a55205a));
    }

    function test_DataHashOf_RevertsForNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, uint256(999)));
        inft.dataHashOf(999);
    }

    function test_StorageURIOf_RevertsForNonexistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, uint256(999)));
        inft.storageURIOf(999);
    }

    function testFuzz_Mint_DataHashRoundtrips(bytes32 dataHash, string calldata uri) public {
        vm.assume(dataHash != bytes32(0));

        vm.prank(creator);
        uint256 tokenId = inft.mint(creator, dataHash, uri);

        assertEq(inft.dataHashOf(tokenId), dataHash);
        assertEq(inft.storageURIOf(tokenId), uri);
    }
}
