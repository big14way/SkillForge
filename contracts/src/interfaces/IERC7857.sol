// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IERC7857
/// @notice Minimal interface for the ERC-7857 Intelligent NFT (INFT) standard.
/// @dev ERC-7857 extends ERC-721 with verifiable, encrypted off-chain payloads and
///      a TEE-oracle-mediated re-encryption hand-off on transfer and clone. This
///      interface covers only the Week 1 subset; additional hooks
///      (signed-delegation, expiry callbacks) will land in Week 2.
interface IERC7857 {
    /// @notice Emitted when a new skill INFT is minted.
    /// @param tokenId The token id assigned to the new INFT.
    /// @param creator The minter and initial owner.
    /// @param dataHash Keccak256 of the encrypted off-chain metadata payload.
    /// @param storageURI Location of the encrypted payload (expected: 0G Storage).
    event SkillMinted(uint256 indexed tokenId, address indexed creator, bytes32 dataHash, string storageURI);

    /// @notice Emitted when an owner grants temporary usage rights to another account.
    event UsageAuthorized(uint256 indexed tokenId, address indexed user, uint256 expiresAt);

    /// @notice Emitted when the encrypted payload of a token is rotated.
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newDataHash, string newStorageURI);

    /// @notice Mint a new skill INFT.
    /// @param to Recipient and creator of the skill.
    /// @param dataHash keccak256 of the encrypted payload.
    /// @param storageURI Pointer to the encrypted payload (0G Storage URI).
    /// @return tokenId The id of the freshly minted INFT.
    function mint(address to, bytes32 dataHash, string calldata storageURI) external returns (uint256 tokenId);

    /// @notice Transfer an INFT with TEE-oracle re-encryption metadata.
    /// @dev In Week 1 the `proof` argument is validated for non-emptiness only;
    ///      full attestation verification lands when the 0G Compute oracle is wired up.
    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof)
        external;

    /// @notice Clone an INFT (creates a new token with the same underlying payload).
    /// @dev Week 1 stub: the caller must be the owner of `tokenId`. Real semantics
    ///      require the TEE oracle to re-seal the payload for `to`.
    function clone(uint256 tokenId, address to, bytes calldata sealedKey, bytes calldata proof)
        external
        returns (uint256 newTokenId);

    /// @notice Grant `user` temporary usage rights on `tokenId` until `expiresAt`.
    /// @dev Must only be callable by the current owner of the token.
    function authorizeUsage(uint256 tokenId, address user, uint256 expiresAt) external;

    /// @notice Return true iff `user` currently holds a non-expired usage authorization on `tokenId`.
    function isAuthorized(uint256 tokenId, address user) external view returns (bool);

    /// @notice Return the keccak256 of the encrypted payload currently bound to `tokenId`.
    function dataHashOf(uint256 tokenId) external view returns (bytes32);

    /// @notice Return the off-chain storage URI currently bound to `tokenId`.
    function storageURIOf(uint256 tokenId) external view returns (string memory);
}
