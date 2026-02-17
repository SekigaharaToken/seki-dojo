// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { ISchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { EAS } from "@ethereum-attestation-service/eas-contracts/contracts/EAS.sol";
import { SchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DojoResolver } from "../src/DojoResolver.sol";

/// @notice Deploys full EAS stack + DojoResolver for local testing (Anvil).
contract DeployLocal is Script {
    function run() external {
        address dojoToken = vm.envAddress("DOJO_TOKEN_ADDRESS");
        vm.startBroadcast();

        // Deploy EAS infrastructure
        SchemaRegistry registry = new SchemaRegistry();
        EAS eas = new EAS(ISchemaRegistry(address(registry)));

        // Deploy DojoResolver
        DojoResolver resolver = new DojoResolver(IEAS(address(eas)), IERC20(dojoToken));

        // Register DOJO schema
        bytes32 schemaUID = registry.register(
            "string app, uint32 day",
            resolver,
            false
        );

        vm.stopBroadcast();

        console.log("SchemaRegistry:", address(registry));
        console.log("EAS:", address(eas));
        console.log("DojoResolver:", address(resolver));
        console.log("SchemaUID:");
        console.logBytes32(schemaUID);
    }
}
