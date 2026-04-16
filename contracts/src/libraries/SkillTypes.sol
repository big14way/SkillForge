// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title SkillTypes
/// @notice Shared data structures and enums for the SkillForge protocol.
/// @dev All contracts (SkillINFT, SkillRegistry, SkillEscrow) consume this library to
///      guarantee a single source of truth for on-chain state shapes.
library SkillTypes {
    /// @notice Canonical rental lifecycle states for the 8-state escrow machine.
    /// @dev Transitions are enforced in SkillEscrow. `None` is the zero value for
    ///      uninitialized rentals and must never be reached after creation.
    enum RentalState {
        None,
        Requested,
        Funded,
        Active,
        Submitted,
        Verified,
        Completed,
        Disputed
    }

    /// @notice Canonical on-chain representation of a published skill.
    /// @dev `qualityScore` is expressed in basis points (0-10000) and is updated by
    ///      SkillEscrow once TeeML verification completes. `storageURI` points at
    ///      the encrypted payload on 0G Storage; `metadataHash` is the keccak256
    ///      digest of the encrypted metadata, matching ERC-7857's `dataHash`.
    struct Skill {
        address creator;
        string name;
        string description;
        string category;
        uint256 pricePerUse;
        uint256 qualityScore;
        uint256 totalRentals;
        string storageURI;
        bytes32 metadataHash;
        bool isActive;
        uint256 createdAt;
    }

    /// @notice Full on-chain footprint of a single rental.
    /// @dev `workProofHash` is submitted by the renter; `qualityScore` is written
    ///      by the verifier after TeeML attestation. `completedAt` remains zero
    ///      until the rental terminates in `Completed` or a refunded `Disputed`.
    struct Rental {
        uint256 rentalId;
        uint256 skillTokenId;
        address renter;
        address creator;
        uint256 amount;
        RentalState state;
        bytes32 workProofHash;
        uint256 qualityScore;
        uint256 createdAt;
        uint256 completedAt;
    }
}
