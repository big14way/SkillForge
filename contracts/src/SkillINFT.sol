// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

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

    uint256 private _nextTokenId;

    /// @notice Address whose signature is accepted as a re-encryption oracle proof.
    address public oracleAddress;

    mapping(uint256 => bytes32) private _dataHash;
    mapping(uint256 => string) private _storageURI;

    /// @dev tokenId => user => usage authorization expiry (unix seconds).
    mapping(uint256 => mapping(address => uint256)) private _usageExpiry;

    error NotOwner();
    error InvalidProof();
    error Unauthorized();
    error AlreadyExists();
    error ExpiredAuthorization();
    error OracleUnset();

    event OracleUpdated(address indexed newOracle);
    event KeyResealed(uint256 indexed tokenId, address indexed from, address indexed to, bytes32 sealedKeyHash);

    constructor(address initialOwner, address initialOracle)
        ERC721("SkillForge Skill INFT", "SKILL")
        Ownable(initialOwner)
    {
        _setDefaultRoyalty(initialOwner, _CREATOR_ROYALTY_BPS);
        if (initialOracle != address(0)) {
            oracleAddress = initialOracle;
            emit OracleUpdated(initialOracle);
        }
    }

    /// @notice Rotate the re-encryption oracle address. Owner-only.
    function setOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert Unauthorized();
        oracleAddress = newOracle;
        emit OracleUpdated(newOracle);
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
    /// @dev v2: the oracle signs keccak256(abi.encodePacked(tokenId, from, to, keccak256(sealedKey))).
    ///      The on-chain verifier recovers the signer and matches it against `oracleAddress`.
    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof)
        external
        override
    {
        _requireOwned(tokenId);
        if (ownerOf(tokenId) != from) revert NotOwner();
        if (msg.sender != from && !isApprovedForAll(from, msg.sender) && getApproved(tokenId) != msg.sender) {
            revert Unauthorized();
        }
        bytes32 sealedKeyHash = _verifyOracleProof(tokenId, from, to, sealedKey, proof);

        _safeTransfer(from, to, tokenId, "");
        emit KeyResealed(tokenId, from, to, sealedKeyHash);
    }

    /// @inheritdoc IERC7857
    /// @dev v2: same oracle proof check as `transfer`, but the current owner
    ///      stays the owner of `tokenId` and a fresh token is minted for `to`.
    function clone(uint256 tokenId, address to, bytes calldata sealedKey, bytes calldata proof)
        external
        override
        returns (uint256 newTokenId)
    {
        _requireOwned(tokenId);
        if (ownerOf(tokenId) != msg.sender) revert NotOwner();
        if (to == address(0)) revert Unauthorized();
        bytes32 sealedKeyHash = _verifyOracleProof(tokenId, msg.sender, to, sealedKey, proof);

        unchecked {
            newTokenId = ++_nextTokenId;
        }

        _safeMint(to, newTokenId);
        _dataHash[newTokenId] = _dataHash[tokenId];
        _storageURI[newTokenId] = _storageURI[tokenId];
        _setTokenRoyalty(newTokenId, msg.sender, _CREATOR_ROYALTY_BPS);

        emit SkillMinted(newTokenId, to, _dataHash[tokenId], _storageURI[tokenId]);
        emit KeyResealed(newTokenId, msg.sender, to, sealedKeyHash);
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

    /// @dev Recovers the signer from `proof` and checks it equals `oracleAddress`.
    ///      Returns keccak256(sealedKey) so callers can emit it in an event.
    function _verifyOracleProof(
        uint256 tokenId,
        address from,
        address to,
        bytes calldata sealedKey,
        bytes calldata proof
    ) internal view returns (bytes32 sealedKeyHash) {
        if (oracleAddress == address(0)) revert OracleUnset();
        if (sealedKey.length == 0) revert InvalidProof();
        sealedKeyHash = keccak256(sealedKey);
        bytes32 digest = keccak256(abi.encodePacked(tokenId, from, to, sealedKeyHash));
        address recovered = ECDSA.recover(digest, proof);
        if (recovered != oracleAddress) revert InvalidProof();
    }
}
