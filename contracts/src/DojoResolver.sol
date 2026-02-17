// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { SchemaResolver } from "@ethereum-attestation-service/eas-contracts/contracts/resolver/SchemaResolver.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { Attestation } from "@ethereum-attestation-service/eas-contracts/contracts/Common.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DojoResolver v2
/// @notice EAS resolver: daily check-in streak tracking + auto $DOJO bonus.
///         Enforces one attestation per UTC day. Pays holdings-based bonus
///         (0.1%–0.2%) on successful check-in. Skips payout if underfunded.
contract DojoResolver is SchemaResolver {

    IERC20 public immutable dojoToken;

    mapping(address => uint256) public lastCheckIn;
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public longestStreak;

    uint256 public constant BASE_RATE = 10;       // 0.1% = 10 bps
    uint256 public constant MAX_RATE  = 20;        // 0.2% = 20 bps
    uint256 public constant RAMP_DAYS = 30;
    uint256 public constant BPS       = 10_000;

    event BonusPaid(address indexed user, uint256 amount, uint256 rate, uint256 streak);

    constructor(IEAS eas, IERC20 _dojoToken) SchemaResolver(eas) {
        dojoToken = _dojoToken;
    }

    function getBonusRate(uint256 streak) public pure returns (uint256) {
        if (streak >= RAMP_DAYS) return MAX_RATE;
        return BASE_RATE + ((MAX_RATE - BASE_RATE) * streak) / RAMP_DAYS;
    }

    function onAttest(
        Attestation calldata attestation,
        uint256 /* value */
    ) internal override returns (bool) {
        address user = attestation.attester;
        uint256 today = block.timestamp / 86400;
        uint256 lastDay = lastCheckIn[user] / 86400;

        // Reject duplicate same-day check-in
        if (today == lastDay && lastCheckIn[user] != 0) return false;

        // Streak logic
        if (today == lastDay + 1) {
            currentStreak[user]++;
        } else {
            currentStreak[user] = 1;
        }

        if (currentStreak[user] > longestStreak[user]) {
            longestStreak[user] = currentStreak[user];
        }

        lastCheckIn[user] = block.timestamp;

        // Auto-pay bonus (skip silently if underfunded or zero balance)
        uint256 holdings = dojoToken.balanceOf(user);
        if (holdings > 0) {
            uint256 rate = getBonusRate(currentStreak[user]);
            uint256 bonus = (holdings * rate) / BPS;
            if (bonus > 0 && dojoToken.balanceOf(address(this)) >= bonus) {
                dojoToken.transfer(user, bonus);
                emit BonusPaid(user, bonus, rate, currentStreak[user]);
            }
        }

        return true;
    }

    function onRevoke(
        Attestation calldata, /* attestation */
        uint256 /* value */
    ) internal pure override returns (bool) {
        return false;
    }
}
