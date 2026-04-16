// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { BaseTest } from "./helpers/BaseTest.sol";
import { AttestationVerifier } from "../src/libraries/AttestationVerifier.sol";

/// @title _AttestationHarness
/// @dev Thin wrapper that exposes AttestationVerifier.verify against a mapping
///      held in the harness's own storage. Needed because Solidity libraries
///      with `storage` args must be called from a contract that owns the mapping.
contract _AttestationHarness {
    mapping(address => bool) public whitelistedScorers;

    function setScorer(address scorer, bool allowed) external {
        whitelistedScorers[scorer] = allowed;
    }

    function verify(bytes calldata encoded, uint256 expectedScore)
        external
        view
        returns (uint256 qualityScore, address scorer)
    {
        return AttestationVerifier.verify(encoded, whitelistedScorers, expectedScore);
    }
}

contract AttestationVerifierTest is BaseTest {
    _AttestationHarness internal harness;
    Wallet internal scorer;

    bytes32 internal constant REQ_HASH = keccak256("req");
    bytes32 internal constant RESP_HASH = keccak256("resp");
    address internal constant PROVIDER = address(0xbeef);

    function setUp() public {
        harness = new _AttestationHarness();
        scorer = _wallet("scorer");
        harness.setScorer(scorer.addr, true);
    }

    function _attestation(Wallet memory signingKey, uint256 score) internal returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked(REQ_HASH, RESP_HASH, PROVIDER, score));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signingKey.key, digest);
        return abi.encode(REQ_HASH, RESP_HASH, PROVIDER, score, abi.encodePacked(r, s, v));
    }

    function test_Verify_HappyPath() public {
        bytes memory att = _attestation(scorer, 8200);
        (uint256 qs, address signer) = harness.verify(att, 8200);
        assertEq(qs, 8200);
        assertEq(signer, scorer.addr);
    }

    function test_Verify_RevertsOnScoreOutOfRange() public {
        bytes memory att = _attestation(scorer, 20_000);
        vm.expectRevert(AttestationVerifier.ScoreOutOfRange.selector);
        harness.verify(att, 20_000);
    }

    function test_Verify_RevertsOnScoreMismatch() public {
        bytes memory att = _attestation(scorer, 7000);
        vm.expectRevert(AttestationVerifier.ScoreMismatch.selector);
        harness.verify(att, 6000);
    }

    function test_Verify_RevertsWhenSignerNotWhitelisted() public {
        Wallet memory rogue = _wallet("rogue");
        bytes memory att = _attestation(rogue, 5000);
        vm.expectRevert(AttestationVerifier.ProviderNotWhitelisted.selector);
        harness.verify(att, 5000);
    }

    function test_Verify_RevertsOnMalformedBlob() public {
        vm.expectRevert(AttestationVerifier.MalformedAttestation.selector);
        harness.verify(hex"aabbcc", 0);
    }
}
