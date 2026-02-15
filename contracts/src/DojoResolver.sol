// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";

/// @title DojoResolver
/// @notice EAS resolver for daily check-in streak tracking.
///         Enforces one attestation per UTC day per wallet.
///         Tracks current streak, longest streak, and last check-in.
contract DojoResolver is SchemaResolver {

    mapping(address => uint256) public lastCheckIn;    // Unix timestamp
    mapping(address => uint256) public currentStreak;  // Consecutive days
    mapping(address => uint256) public longestStreak;  // All-time best

    constructor(IEAS eas) SchemaResolver(eas) {}

    function onAttest(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal override returns (bool) {
        address user = attestation.attester;
        uint256 today = block.timestamp / 86400;
        uint256 lastDay = lastCheckIn[user] / 86400;

        // Reject duplicate same-day check-in
        if (today == lastDay && lastCheckIn[user] != 0) return false;

        // Streak logic: consecutive day increments, gap resets to 1
        if (today == lastDay + 1) {
            currentStreak[user]++;
        } else {
            currentStreak[user] = 1;
        }

        // Update personal best
        if (currentStreak[user] > longestStreak[user]) {
            longestStreak[user] = currentStreak[user];
        }

        lastCheckIn[user] = block.timestamp;
        return true;
    }

    function onRevoke(
        Attestation calldata, /* attestation */
        uint256 /* value */
    ) internal pure override returns (bool) {
        return false; // Revocations not permitted
    }
}
