// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { SkillTypes } from "../libraries/SkillTypes.sol";

/// @title ISkillRegistry
/// @notice Public surface of the SkillForge discovery layer.
/// @dev The registry owns the canonical on-chain directory of published skills.
///      SkillEscrow is the only contract permitted to mutate quality/usage metrics.
interface ISkillRegistry {
    event SkillRegistered(
        uint256 indexed tokenId, address indexed creator, string category, uint256 pricePerUse, string storageURI
    );
    event SkillDeactivated(uint256 indexed tokenId);
    event QualityScoreUpdated(uint256 indexed tokenId, uint256 newScore);
    event RentalRecorded(uint256 indexed tokenId, uint256 totalRentals);

    /// @notice Register a newly minted INFT as a publicly rentable skill.
    /// @dev Caller MUST own `tokenId` on the SkillINFT contract. Reverts if the
    ///      skill is already registered.
    function registerSkill(
        uint256 tokenId,
        string calldata name,
        string calldata description,
        string calldata category,
        uint256 pricePerUse,
        string calldata storageURI
    ) external;

    /// @notice Update a skill's TeeML-derived quality score.
    /// @dev Callable only by the configured SkillEscrow address. `newScore` is in
    ///      basis points (0-10000).
    function updateQualityScore(uint256 tokenId, uint256 newScore) external;

    /// @notice Increment the total rental count for `tokenId`.
    /// @dev Callable only by the configured SkillEscrow address.
    function incrementRentals(uint256 tokenId) external;

    /// @notice Retire a skill from active discovery. Existing rentals are unaffected.
    function deactivateSkill(uint256 tokenId) external;

    function getSkillsByCategory(string calldata category) external view returns (uint256[] memory);

    function getSkillsByCreator(address creator) external view returns (uint256[] memory);

    /// @notice Return up to `limit` skill token ids sorted by descending quality score.
    function getTopSkills(uint256 limit) external view returns (uint256[] memory);

    function getSkill(uint256 tokenId) external view returns (SkillTypes.Skill memory);
}
