// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test, Vm } from "forge-std/Test.sol";

/// @title BaseTest
/// @notice Shared fixtures for SkillForge test contracts.
abstract contract BaseTest is Test {
    struct Wallet {
        address addr;
        uint256 key;
    }

    address internal deployer = makeAddr("deployer");
    address internal treasury = makeAddr("treasury");
    address internal creator = makeAddr("creator");
    address internal renter = makeAddr("renter");
    address internal stranger = makeAddr("stranger");
    address internal arbitrator = makeAddr("arbitrator");

    bytes internal constant STUB_SEALED_KEY = hex"aa";
    bytes internal constant STUB_PROOF = hex"bb";

    /// @dev Produce a deterministic address + private key pair usable with vm.sign.
    function _wallet(string memory label) internal pure returns (Wallet memory w) {
        w.key = uint256(keccak256(bytes(label)));
        w.addr = vm.addr(w.key);
    }

    function _defaultDataHash() internal pure returns (bytes32) {
        return keccak256("skillforge.default.payload");
    }

    function _defaultStorageURI() internal pure returns (string memory) {
        return "og://skills/default";
    }
}
