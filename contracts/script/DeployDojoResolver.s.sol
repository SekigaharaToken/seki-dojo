// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { DojoResolver } from "../src/DojoResolver.sol";

contract DeployDojoResolver is Script {
    // EAS predeploy on Base (OP Stack)
    address constant EAS_ADDRESS = 0x4200000000000000000000000000000000000021;

    function run() external {
        vm.startBroadcast();
        DojoResolver resolver = new DojoResolver(IEAS(EAS_ADDRESS));
        vm.stopBroadcast();

        console.log("DojoResolver deployed at:", address(resolver));
    }
}
