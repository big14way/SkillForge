// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SkillTypes} from "../libraries/SkillTypes.sol";

/// @title ISkillEscrow
/// @notice Public surface of the SkillForge 8-state rental escrow.
/// @dev Every state transition emits an event and is guarded by the current
///      `RentalState`. Funds flow: renter → escrow → creator (95%) + treasury (5%).
interface ISkillEscrow {
    event RentalRequested(uint256 indexed rentalId, uint256 indexed skillTokenId, address indexed renter);
    event RentalFunded(uint256 indexed rentalId, uint256 amount);
    event AccessAuthorized(uint256 indexed rentalId, address indexed renter, uint256 expiresAt);
    event WorkSubmitted(uint256 indexed rentalId, bytes32 workProofHash);
    event WorkVerified(uint256 indexed rentalId, uint256 qualityScore);
    event RentalCompleted(uint256 indexed rentalId, uint256 creatorPayout, uint256 protocolFee);
    event RentalDisputed(uint256 indexed rentalId, address indexed disputer);
    event DisputeResolved(uint256 indexed rentalId, bool refundedRenter);

    /// @notice Begin a new rental request against a live skill.
    function requestRental(uint256 skillTokenId) external returns (uint256 rentalId);

    /// @notice Deposit the skill's `pricePerUse` to transition Requested → Funded.
    function fundRental(uint256 rentalId) external payable;

    /// @notice Creator authorizes the renter and transitions Funded → Active.
    function authorizeAccess(uint256 rentalId) external;

    /// @notice Renter posts a keccak256 commitment to their executed work.
    function submitWork(uint256 rentalId, bytes32 workProofHash) external;

    /// @notice Record the TeeML verdict and transition Submitted → Verified.
    /// @dev Week 1 validates attestation format only; Week 2 performs full TEE
    ///      signature verification against the 0G Compute TeeML oracle.
    function verifyWork(uint256 rentalId, uint256 qualityScore, bytes calldata teemlAttestation) external;

    /// @notice Settle the rental: payout to creator + protocol fee, update registry.
    function completeRental(uint256 rentalId) external;

    /// @notice Open a dispute from either the renter or the creator.
    function dispute(uint256 rentalId) external;

    /// @notice Owner-side resolution: either refund the renter in full or release to the creator.
    function resolveDispute(uint256 rentalId, bool refundRenter) external;

    function getRental(uint256 rentalId) external view returns (SkillTypes.Rental memory);
}
