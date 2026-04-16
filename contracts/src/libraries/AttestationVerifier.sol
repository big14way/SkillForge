// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title AttestationVerifier
/// @notice Verifies TeeML-backed quality-score attestations submitted to
///         SkillEscrow.verifyWork. Attestations are signed by a whitelisted
///         scorer oracle; the on-chain check recovers the signer and confirms
///         membership in the whitelist.
/// @dev Wire format (matches the TypeScript SDK's `encodeAttestation`):
///      abi.encode(
///          bytes32 requestHash,
///          bytes32 responseHash,
///          address provider,
///          uint256 qualityScore,
///          bytes   signature
///      )
///
///      Signed digest:
///          keccak256(abi.encodePacked(requestHash, responseHash, provider, qualityScore))
library AttestationVerifier {
    struct Attestation {
        bytes32 requestHash;
        bytes32 responseHash;
        address provider;
        uint256 qualityScore;
        bytes signature;
    }

    /// @notice Basis-points cap for the quality score; 10000 = 100%.
    uint256 internal constant MAX_SCORE = 10_000;

    error MalformedAttestation();
    error InvalidSigner();
    error ProviderNotWhitelisted();
    error ScoreOutOfRange();
    error ScoreMismatch();

    /// @notice Decode + verify an attestation and return the score it claims.
    /// @dev Reverts on any failure. The caller should pass in the expected
    ///      `qualityScore` to bind the on-chain state transition to the score
    ///      the scorer actually signed — this prevents an attacker from
    ///      replaying an old attestation with a different score.
    function verify(bytes calldata encoded, mapping(address => bool) storage whitelistedScorers, uint256 expectedScore)
        internal
        view
        returns (uint256 qualityScore, address scorer)
    {
        Attestation memory att = decode(encoded);
        if (att.qualityScore > MAX_SCORE) revert ScoreOutOfRange();
        if (att.qualityScore != expectedScore) revert ScoreMismatch();

        bytes32 digest = keccak256(abi.encodePacked(att.requestHash, att.responseHash, att.provider, att.qualityScore));
        scorer = ECDSA.recover(digest, att.signature);
        if (scorer == address(0)) revert InvalidSigner();
        if (!whitelistedScorers[scorer]) revert ProviderNotWhitelisted();
        qualityScore = att.qualityScore;
    }

    /// @notice Pure decoder. Reverts if the blob is structurally invalid.
    function decode(bytes calldata encoded) internal pure returns (Attestation memory att) {
        if (encoded.length < 160) revert MalformedAttestation();
        (att.requestHash, att.responseHash, att.provider, att.qualityScore, att.signature) =
            abi.decode(encoded, (bytes32, bytes32, address, uint256, bytes));
    }
}
