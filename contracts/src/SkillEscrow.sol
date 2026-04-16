// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Address } from "@openzeppelin/contracts/utils/Address.sol";

import { ISkillEscrow } from "./interfaces/ISkillEscrow.sol";
import { ISkillRegistry } from "./interfaces/ISkillRegistry.sol";
import { IERC7857 } from "./interfaces/IERC7857.sol";
import { SkillTypes } from "./libraries/SkillTypes.sol";
import { AttestationVerifier } from "./libraries/AttestationVerifier.sol";

/// @title SkillEscrow
/// @notice 8-state rental lifecycle with escrowed payment, TeeML quality scoring
///         hook, and owner-arbitrated dispute path.
/// @dev Payment flow on completion: 95% to skill creator, 5% to protocol treasury
///      (configurable by owner, capped at 10%). The TeeML attestation is
///      validated for format only in Week 1; Week 2 swaps in a real verifier.
contract SkillEscrow is ISkillEscrow, Ownable, Pausable, ReentrancyGuard {
    using Address for address payable;

    /// @notice Default skill usage window granted on Funded → Active.
    uint256 public constant DEFAULT_USAGE_DURATION = 7 days;

    /// @notice Protocol fee is capped at 10% (1000 bps).
    uint256 public constant MAX_PROTOCOL_FEE_BPS = 1_000;

    /// @notice Basis points denominator.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    ISkillRegistry public immutable skillRegistry;
    IERC7857 public immutable skillINFT;

    uint256 public protocolFeeBps = 500;
    address public protocolTreasury;
    uint256 public nextRentalId;

    mapping(uint256 => SkillTypes.Rental) private _rentals;

    /// @notice Set of scorer oracle addresses authorized to sign quality attestations.
    mapping(address => bool) public whitelistedScorers;

    event ProtocolFeeUpdated(uint256 newBps);
    event ProtocolTreasuryUpdated(address indexed newTreasury);
    event ScorerWhitelistUpdated(address indexed scorer, bool allowed);

    error InvalidState();
    error NotRenter();
    error NotCreator();
    error NotParty();
    error InsufficientPayment();
    error RentalNotFound();
    error SkillInactive();
    error InvalidAttestation();
    error InvalidScore();
    error FeeTooHigh();
    error ZeroAddress();

    constructor(address initialOwner, address registry_, address skillINFT_, address treasury_, address initialScorer)
        Ownable(initialOwner)
    {
        if (registry_ == address(0) || skillINFT_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        skillRegistry = ISkillRegistry(registry_);
        skillINFT = IERC7857(skillINFT_);
        protocolTreasury = treasury_;
        if (initialScorer != address(0)) {
            whitelistedScorers[initialScorer] = true;
            emit ScorerWhitelistUpdated(initialScorer, true);
        }
    }

    /// @notice Add or revoke a scorer oracle allowed to sign attestations.
    function setScorerWhitelisted(address scorer, bool allowed) external onlyOwner {
        if (scorer == address(0)) revert ZeroAddress();
        whitelistedScorers[scorer] = allowed;
        emit ScorerWhitelistUpdated(scorer, allowed);
    }

    // ---------------------------------------------------------------------
    //  Admin
    // ---------------------------------------------------------------------

    function setProtocolFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_PROTOCOL_FEE_BPS) revert FeeTooHigh();
        protocolFeeBps = newBps;
        emit ProtocolFeeUpdated(newBps);
    }

    function setProtocolTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        protocolTreasury = newTreasury;
        emit ProtocolTreasuryUpdated(newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    //  Rental lifecycle
    // ---------------------------------------------------------------------

    /// @inheritdoc ISkillEscrow
    function requestRental(uint256 skillTokenId) external whenNotPaused returns (uint256 rentalId) {
        SkillTypes.Skill memory skill = skillRegistry.getSkill(skillTokenId);
        if (!skill.isActive) revert SkillInactive();

        unchecked {
            rentalId = ++nextRentalId;
        }

        _rentals[rentalId] = SkillTypes.Rental({
            rentalId: rentalId,
            skillTokenId: skillTokenId,
            renter: msg.sender,
            creator: skill.creator,
            amount: skill.pricePerUse,
            state: SkillTypes.RentalState.Requested,
            workProofHash: bytes32(0),
            qualityScore: 0,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit RentalRequested(rentalId, skillTokenId, msg.sender);
    }

    /// @inheritdoc ISkillEscrow
    function fundRental(uint256 rentalId) external payable whenNotPaused nonReentrant {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Requested) revert InvalidState();
        if (msg.sender != rental.renter) revert NotRenter();
        if (msg.value != rental.amount) revert InsufficientPayment();

        rental.state = SkillTypes.RentalState.Funded;
        emit RentalFunded(rentalId, msg.value);
    }

    /// @inheritdoc ISkillEscrow
    function authorizeAccess(uint256 rentalId) external whenNotPaused {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Funded) revert InvalidState();
        if (msg.sender != rental.creator) revert NotCreator();

        rental.state = SkillTypes.RentalState.Active;
        uint256 expiresAt = block.timestamp + DEFAULT_USAGE_DURATION;
        skillINFT.authorizeUsage(rental.skillTokenId, rental.renter, expiresAt);

        emit AccessAuthorized(rentalId, rental.renter, expiresAt);
    }

    /// @inheritdoc ISkillEscrow
    function submitWork(uint256 rentalId, bytes32 workProofHash) external whenNotPaused {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Active) revert InvalidState();
        if (msg.sender != rental.renter) revert NotRenter();
        if (workProofHash == bytes32(0)) revert InvalidAttestation();

        rental.workProofHash = workProofHash;
        rental.state = SkillTypes.RentalState.Submitted;
        emit WorkSubmitted(rentalId, workProofHash);
    }

    /// @inheritdoc ISkillEscrow
    /// @dev v2: full attestation verification. The attestation must be signed by
    ///      a whitelisted scorer oracle and must bind to `qualityScore` — we use
    ///      the score in the signed digest so a replay with a different score
    ///      is rejected.
    function verifyWork(uint256 rentalId, uint256 qualityScore, bytes calldata teemlAttestation)
        external
        whenNotPaused
    {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Submitted) revert InvalidState();
        if (qualityScore > BPS_DENOMINATOR) revert InvalidScore();

        AttestationVerifier.verify(teemlAttestation, whitelistedScorers, qualityScore);

        rental.qualityScore = qualityScore;
        rental.state = SkillTypes.RentalState.Verified;
        emit WorkVerified(rentalId, qualityScore);
    }

    /// @inheritdoc ISkillEscrow
    function completeRental(uint256 rentalId) external whenNotPaused nonReentrant {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Verified) revert InvalidState();

        rental.state = SkillTypes.RentalState.Completed;
        rental.completedAt = block.timestamp;

        uint256 protocolCut = (rental.amount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 creatorCut = rental.amount - protocolCut;

        skillRegistry.updateQualityScore(rental.skillTokenId, rental.qualityScore);
        skillRegistry.incrementRentals(rental.skillTokenId);

        if (protocolCut > 0) {
            payable(protocolTreasury).sendValue(protocolCut);
        }
        if (creatorCut > 0) {
            payable(rental.creator).sendValue(creatorCut);
        }

        emit RentalCompleted(rentalId, creatorCut, protocolCut);
    }

    /// @inheritdoc ISkillEscrow
    function dispute(uint256 rentalId) external whenNotPaused {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Submitted) revert InvalidState();
        if (msg.sender != rental.renter && msg.sender != rental.creator) revert NotParty();

        rental.state = SkillTypes.RentalState.Disputed;
        emit RentalDisputed(rentalId, msg.sender);
    }

    /// @inheritdoc ISkillEscrow
    function resolveDispute(uint256 rentalId, bool refundRenter) external onlyOwner nonReentrant {
        SkillTypes.Rental storage rental = _rentals[rentalId];
        _requireRentalExists(rental);
        if (rental.state != SkillTypes.RentalState.Disputed) revert InvalidState();

        rental.state = SkillTypes.RentalState.Completed;
        rental.completedAt = block.timestamp;

        if (refundRenter) {
            payable(rental.renter).sendValue(rental.amount);
        } else {
            uint256 protocolCut = (rental.amount * protocolFeeBps) / BPS_DENOMINATOR;
            uint256 creatorCut = rental.amount - protocolCut;
            if (protocolCut > 0) {
                payable(protocolTreasury).sendValue(protocolCut);
            }
            if (creatorCut > 0) {
                payable(rental.creator).sendValue(creatorCut);
            }
        }

        emit DisputeResolved(rentalId, refundRenter);
    }

    /// @inheritdoc ISkillEscrow
    function getRental(uint256 rentalId) external view override returns (SkillTypes.Rental memory) {
        SkillTypes.Rental memory rental = _rentals[rentalId];
        if (rental.state == SkillTypes.RentalState.None) revert RentalNotFound();
        return rental;
    }

    function _requireRentalExists(SkillTypes.Rental storage rental) internal view {
        if (rental.state == SkillTypes.RentalState.None) revert RentalNotFound();
    }
}
