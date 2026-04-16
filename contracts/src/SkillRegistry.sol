// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {ISkillRegistry} from "./interfaces/ISkillRegistry.sol";
import {SkillTypes} from "./libraries/SkillTypes.sol";

/// @title SkillRegistry
/// @notice On-chain directory of SkillForge skills. Provides discovery + indexing
///         by category and creator, and exposes top-quality listings.
/// @dev Quality/usage mutations are gated to the configured SkillEscrow address.
contract SkillRegistry is ISkillRegistry, Ownable {
    /// @notice Quality scores are basis points; capped at 100% == 10_000.
    uint256 public constant MAX_QUALITY_SCORE = 10_000;

    IERC721 public immutable skillINFT;

    address public skillEscrow;

    mapping(uint256 => SkillTypes.Skill) private _skills;
    mapping(string => uint256[]) private _skillsByCategory;
    mapping(address => uint256[]) private _skillsByCreator;
    uint256[] private _allSkillIds;

    error NotTokenOwner();
    error AlreadyRegistered();
    error SkillNotFound();
    error NotEscrow();
    error InvalidEscrow();
    error InvalidQualityScore();
    error EmptyCategory();

    event SkillEscrowSet(address indexed escrow);

    constructor(address initialOwner, address skillINFT_) Ownable(initialOwner) {
        if (skillINFT_ == address(0)) revert InvalidEscrow();
        skillINFT = IERC721(skillINFT_);
    }

    /// @notice Configure the SkillEscrow address authorized to update metrics.
    function setSkillEscrow(address escrow) external onlyOwner {
        if (escrow == address(0)) revert InvalidEscrow();
        skillEscrow = escrow;
        emit SkillEscrowSet(escrow);
    }

    /// @inheritdoc ISkillRegistry
    function registerSkill(
        uint256 tokenId,
        string calldata name,
        string calldata description,
        string calldata category,
        uint256 pricePerUse,
        string calldata storageURI
    ) external override {
        if (skillINFT.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (_skills[tokenId].creator != address(0)) revert AlreadyRegistered();
        if (bytes(category).length == 0) revert EmptyCategory();

        _skills[tokenId] = SkillTypes.Skill({
            creator: msg.sender,
            name: name,
            description: description,
            category: category,
            pricePerUse: pricePerUse,
            qualityScore: 0,
            totalRentals: 0,
            storageURI: storageURI,
            metadataHash: bytes32(0),
            isActive: true,
            createdAt: block.timestamp
        });

        _skillsByCategory[category].push(tokenId);
        _skillsByCreator[msg.sender].push(tokenId);
        _allSkillIds.push(tokenId);

        emit SkillRegistered(tokenId, msg.sender, category, pricePerUse, storageURI);
    }

    /// @inheritdoc ISkillRegistry
    function updateQualityScore(uint256 tokenId, uint256 newScore) external override {
        if (msg.sender != skillEscrow) revert NotEscrow();
        if (newScore > MAX_QUALITY_SCORE) revert InvalidQualityScore();
        if (_skills[tokenId].creator == address(0)) revert SkillNotFound();

        _skills[tokenId].qualityScore = newScore;
        emit QualityScoreUpdated(tokenId, newScore);
    }

    /// @inheritdoc ISkillRegistry
    function incrementRentals(uint256 tokenId) external override {
        if (msg.sender != skillEscrow) revert NotEscrow();
        if (_skills[tokenId].creator == address(0)) revert SkillNotFound();

        unchecked {
            _skills[tokenId].totalRentals += 1;
        }
        emit RentalRecorded(tokenId, _skills[tokenId].totalRentals);
    }

    /// @inheritdoc ISkillRegistry
    function deactivateSkill(uint256 tokenId) external override {
        SkillTypes.Skill storage skill = _skills[tokenId];
        if (skill.creator == address(0)) revert SkillNotFound();
        if (skillINFT.ownerOf(tokenId) != msg.sender) revert NotTokenOwner();

        skill.isActive = false;
        emit SkillDeactivated(tokenId);
    }

    /// @inheritdoc ISkillRegistry
    function getSkillsByCategory(string calldata category) external view override returns (uint256[] memory) {
        return _skillsByCategory[category];
    }

    /// @inheritdoc ISkillRegistry
    function getSkillsByCreator(address creator) external view override returns (uint256[] memory) {
        return _skillsByCreator[creator];
    }

    /// @inheritdoc ISkillRegistry
    /// @dev O(n^2) insertion sort over a working copy. Acceptable on-chain for the
    ///      modest catalog sizes we target in Week 1; Week 3 indexer will take over.
    function getTopSkills(uint256 limit) external view override returns (uint256[] memory) {
        uint256 total = _allSkillIds.length;
        uint256 resultSize = limit < total ? limit : total;
        uint256[] memory result = new uint256[](resultSize);
        if (resultSize == 0) return result;

        uint256[] memory active = new uint256[](total);
        uint256 activeCount = 0;
        for (uint256 i = 0; i < total; ++i) {
            uint256 id = _allSkillIds[i];
            if (_skills[id].isActive) {
                active[activeCount] = id;
                ++activeCount;
            }
        }

        uint256 k = activeCount < resultSize ? activeCount : resultSize;
        for (uint256 slot = 0; slot < k; ++slot) {
            uint256 bestIndex = slot;
            uint256 bestScore = _skills[active[slot]].qualityScore;
            for (uint256 j = slot + 1; j < activeCount; ++j) {
                uint256 score = _skills[active[j]].qualityScore;
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = j;
                }
            }
            if (bestIndex != slot) {
                (active[slot], active[bestIndex]) = (active[bestIndex], active[slot]);
            }
            result[slot] = active[slot];
        }

        // If there are fewer active skills than `limit`, trailing slots stay zero.
        return result;
    }

    /// @inheritdoc ISkillRegistry
    function getSkill(uint256 tokenId) external view override returns (SkillTypes.Skill memory) {
        if (_skills[tokenId].creator == address(0)) revert SkillNotFound();
        return _skills[tokenId];
    }

    /// @notice Convenience: total number of skills ever registered.
    function totalSkills() external view returns (uint256) {
        return _allSkillIds.length;
    }
}
