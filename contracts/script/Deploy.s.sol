// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";

import { SkillINFT } from "../src/SkillINFT.sol";
import { SkillRegistry } from "../src/SkillRegistry.sol";
import { SkillEscrow } from "../src/SkillEscrow.sol";

/// @title Deploy
/// @notice Wires the v2 SkillINFT, SkillRegistry, and SkillEscrow on 0G Chain (Galileo).
/// @dev Required env:
///        PRIVATE_KEY           — deployer EOA key
///        PROTOCOL_TREASURY     — 5% fee recipient (defaults to deployer)
///        ORACLE_ADDRESS        — ERC-7857 re-encryption oracle (defaults to deployer)
///        SCORER_ADDRESS        — whitelisted quality scorer (defaults to deployer)
///      On successful broadcast, writes addresses to deployments/galileo.json.
contract Deploy is Script {
    struct Deployment {
        address skillINFT;
        address skillRegistry;
        address skillEscrow;
        address deployer;
        address treasury;
        address oracle;
        address scorer;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = deployerKey == 0 ? msg.sender : vm.addr(deployerKey);
        address treasury = vm.envOr("PROTOCOL_TREASURY", deployer);
        address oracle = vm.envOr("ORACLE_ADDRESS", deployer);
        address scorer = vm.envOr("SCORER_ADDRESS", deployer);

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        SkillINFT inft = new SkillINFT(deployer, oracle);
        SkillRegistry registry = new SkillRegistry(deployer, address(inft));
        SkillEscrow escrow = new SkillEscrow(deployer, address(registry), address(inft), treasury, scorer);

        registry.setSkillEscrow(address(escrow));

        vm.stopBroadcast();

        deployment = Deployment({
            skillINFT: address(inft),
            skillRegistry: address(registry),
            skillEscrow: address(escrow),
            deployer: deployer,
            treasury: treasury,
            oracle: oracle,
            scorer: scorer
        });

        _logDeployment(deployment);
        _writeDeploymentArtifact(deployment);
    }

    function _logDeployment(Deployment memory d) internal pure {
        console2.log("=== SkillForge v2 deployment ===");
        console2.log("SkillINFT:     ", d.skillINFT);
        console2.log("SkillRegistry: ", d.skillRegistry);
        console2.log("SkillEscrow:   ", d.skillEscrow);
        console2.log("Deployer:      ", d.deployer);
        console2.log("Treasury:      ", d.treasury);
        console2.log("Oracle:        ", d.oracle);
        console2.log("Scorer:        ", d.scorer);
    }

    function _writeDeploymentArtifact(Deployment memory d) internal {
        string memory json = string.concat(
            "{\n",
            '  "chain": "galileo",\n',
            '  "version": "v2",\n',
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
            '",\n',
            '  "oracle": "',
            vm.toString(d.oracle),
            '",\n',
            '  "scorer": "',
            vm.toString(d.scorer),
            '"\n}\n'
        );

        vm.writeFile("deployments/galileo.json", json);
    }
}
