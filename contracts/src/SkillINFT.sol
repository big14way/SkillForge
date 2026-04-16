// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IERC7857 } from "./interfaces/IERC7857.sol";

/// @title SkillINFT
/// @notice ERC-7857 "Intelligent NFT" implementation for SkillForge skills.
/// @dev Each token represents the on-chain ownership claim to an encrypted
///      off-chain skill payload (stored on 0G Storage). The TEE re-encryption
///      oracle is stubbed for Week 1: `transfer` and `clone` validate the shape
///      of the sealedKey/proof blobs only. Week 2 swaps in a real 0G Compute
///      TeeML attestation verifier.
contract SkillINFT is ERC721, ERC2981, Ownable, IERC7857 {
    /// @dev Creator royalty on secondary sales, in basis points (5%).
    uint96 private constant _CREATOR_ROYALTY_BPS = 500;

    /// @dev Minimum sealedKey / proof length accepted by the Week 1 stub.
    uint256 private constant _MIN_STUB_PROOF_LENGTH = 1;

    uint256 private _nextTokenId;

    mapping(uint256 => bytes32) private _dataHash;
    mapping(uint256 => string) private _storageURI;

    /// @dev tokenId => user => usage authorization expiry (unix seconds).
    mapping(uint256 => mapping(address => uint256)) private _usageExpiry;

    error NotOwner();
    error InvalidProof();
    error Unauthorized();
    error AlreadyExists();
    error ExpiredAuthorization();

    constructor(address initialOwner) ERC721("SkillForge Skill INFT", "SKILL") Ownable(initialOwner) {
        _setDefaultRoyalty(initialOwner, _CREATOR_ROYALTY_BPS);
    }

    /// @inheritdoc IERC7857
    function mint(address to, bytes32 dataHash, string calldata storageURI)
        external
        override
        returns (uint256 tokenId)
    {
        if (to == address(0)) revert Unauthorized();
        if (dataHash == bytes32(0)) revert InvalidProof();

        unchecked {
            tokenId = ++_nextTokenId;
        }

        _safeMint(to, tokenId);
        _dataHash[tokenId] = dataHash;
        _storageURI[tokenId] = storageURI;

        // Creator collects the default 5% secondary royalty per-token.
        _setTokenRoyalty(tokenId, to, _CREATOR_ROYALTY_BPS);

        emit SkillMinted(tokenId, to, dataHash, storageURI);
    }

    /// @inheritdoc IERC7857
    /// @dev Week 1 stub: enforces owner semantics and non-empty re-encryption blobs.
    ///      The real implementation will call the 0G Compute TEE oracle to verify
    ///      that `proof` attests to a correct re-encryption of the payload under
    ///      `to`'s public key.
    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof)
        external
        override
    {
        _requireOwned(tokenId);
        if (ownerOf(tokenId) != from) revert NotOwner();
        if (msg.sender != from && !isApprovedForAll(from, msg.sender) && getApproved(tokenId) != msg.sender) {
            revert Unauthorized();
        }
        _validateStubProof(sealedKey, proof);

        _safeTransfer(from, to, tokenId, "");
    }

    /// @inheritdoc IERC7857
    /// @dev Week 1 stub: only the token owner may clone. Real semantics require
    ///      TEE re-sealing of the payload for the clone recipient.
    function clone(uint256 tokenId, address to, bytes calldata sealedKey, bytes calldata proof)
        external
        override
        returns (uint256 newTokenId)
    {
        _requireOwned(tokenId);
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (to == address(0)) revert Unauthorized();
        _validateStubProof(sealedKey, proof);

        unchecked {
            newTokenId = ++_nextTokenId;
        }

        _safeMint(to, newTokenId);
        _dataHash[newTokenId] = _dataHash[tokenId];
        _storageURI[newTokenId] = _storageURI[tokenId];
        _setTokenRoyalty(newTokenId, msg.sender, _CREATOR_ROYALTY_BPS);

        emit SkillMinted(newTokenId, to, _dataHash[tokenId], _storageURI[tokenId]);
    }

    /// @inheritdoc IERC7857
    /// @dev Callable by the token owner or any approved operator (typically the
    ///      SkillEscrow contract after a renter funds a rental).
    function authorizeUsage(uint256 tokenId, address user, uint256 expiresAt) external override {
        address owner = _requireOwned(tokenId);
        if (owner != msg.sender && !isApprovedForAll(owner, msg.sender) && getApproved(tokenId) != msg.sender) {
            revert NotOwner();
        }
        if (user == address(0)) revert Unauthorized();
        if (expiresAt <= block.timestamp) revert ExpiredAuthorization();

        _usageExpiry[tokenId][user] = expiresAt;
        emit UsageAuthorized(tokenId, user, expiresAt);
    }

    /// @inheritdoc IERC7857
    function isAuthorized(uint256 tokenId, address user) external view override returns (bool) {
        return _usageExpiry[tokenId][user] > block.timestamp;
    }

    /// @inheritdoc IERC7857
    function dataHashOf(uint256 tokenId) external view override returns (bytes32) {
        _requireOwned(tokenId);
        return _dataHash[tokenId];
    }

    /// @inheritdoc IERC7857
    function storageURIOf(uint256 tokenId) external view override returns (string memory) {
        _requireOwned(tokenId);
        return _storageURI[tokenId];
    }

    /// @notice Rotate the encrypted payload pointer for an existing token.
    /// @dev Only the token owner may call. Used when the creator pushes an
    ///      updated skill implementation to 0G Storage.
    function updateMetadata(uint256 tokenId, bytes32 newDataHash, string calldata newStorageURI) external {
        _requireOwned(tokenId);
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (newDataHash == bytes32(0)) revert InvalidProof();

        _dataHash[tokenId] = newDataHash;
        _storageURI[tokenId] = newStorageURI;

        emit MetadataUpdated(tokenId, newDataHash, newStorageURI);
    }

    /// @notice Total number of tokens minted so far (including any burned).
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice ERC-165 interface detection for ERC-721, ERC-2981, and ERC-7857.
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, ERC2981) returns (bool) {
        return interfaceId == type(IERC7857).interfaceId || super.supportsInterface(interfaceId);
    }

    function _validateStubProof(bytes calldata sealedKey, bytes calldata proof) internal pure {
        if (sealedKey.length < _MIN_STUB_PROOF_LENGTH || proof.length < _MIN_STUB_PROOF_LENGTH) {
            revert InvalidProof();
        }
    }
}
