// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";

import { SkillINFT } from "../src/SkillINFT.sol";
import { SkillRegistry } from "../src/SkillRegistry.sol";
import { SkillEscrow } from "../src/SkillEscrow.sol";

/// @title Deploy
/// @notice Wires SkillINFT, SkillRegistry, and SkillEscrow on 0G Chain (Galileo).
/// @dev Reads `PRIVATE_KEY` and `PROTOCOL_TREASURY` from the environment. If
///      `PROTOCOL_TREASURY` is unset, the treasury defaults to the deployer.
///      On successful broadcast, writes deployment addresses to
///      `deployments/galileo.json`.
contract Deploy is Script {
    struct Deployment {
        address skillINFT;
        address skillRegistry;
        address skillEscrow;
        address deployer;
        address treasury;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = deployerKey == 0 ? msg.sender : vm.addr(deployerKey);
        address treasury = vm.envOr("PROTOCOL_TREASURY", deployer);

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        SkillINFT inft = new SkillINFT(deployer);
        SkillRegistry registry = new SkillRegistry(deployer, address(inft));
        SkillEscrow escrow = new SkillEscrow(deployer, address(registry), address(inft), treasury);

        registry.setSkillEscrow(address(escrow));

        vm.stopBroadcast();

        deployment = Deployment({
            skillINFT: address(inft),
            skillRegistry: address(registry),
            skillEscrow: address(escrow),
            deployer: deployer,
            treasury: treasury
        });

        _logDeployment(deployment);
        _writeDeploymentArtifact(deployment);
    }

    function _logDeployment(Deployment memory d) internal pure {
        console2.log("=== SkillForge deployment ===");
        console2.log("SkillINFT:     ", d.skillINFT);
        console2.log("SkillRegistry: ", d.skillRegistry);
        console2.log("SkillEscrow:   ", d.skillEscrow);
        console2.log("Deployer:      ", d.deployer);
        console2.log("Treasury:      ", d.treasury);
    }

    function _writeDeploymentArtifact(Deployment memory d) internal {
        string memory json = string.concat(
            "{\n",
            '  "chain": "galileo",\n',
            '  "skillINFT": "',
            vm.toString(d.skillINFT),
            '",\n',
            '  "skillRegistry": "',
            vm.toString(d.skillRegistry),
            '",\n',
            '  "skillEscrow": "',
            vm.toString(d.skillEscrow),
            '",\n',
            '  "deployer": "',
            vm.toString(d.deployer),
            '",\n',
            '  "treasury": "',
            vm.toString(d.treasury),
            '"\n}\n'
        );

        vm.writeFile("deployments/galileo.json", json);
    }
}
