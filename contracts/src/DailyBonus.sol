// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDojoResolver {
    function lastCheckIn(address) external view returns (uint256);
    function currentStreak(address) external view returns (uint256);
}

/// @title DailyBonus
/// @notice Pays a daily bonus = percentage of user's $DOJO holdings.
///         Rate scales from 0.1% (10 bps) to 0.2% (20 bps) over 30 days of streak.
///         No admin, no owner. Operator keeps it funded via plain ERC-20 transfers.
contract DailyBonus {
    IERC20 public immutable dojoToken;
    IDojoResolver public immutable resolver;

    mapping(address => uint256) public lastBonusClaim; // UTC day number

    uint256 public constant BASE_RATE = 10;       // 0.1% = 10 bps
    uint256 public constant MAX_RATE = 20;        // 0.2% = 20 bps
    uint256 public constant RAMP_DAYS = 30;
    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_DAY = 86400;

    event BonusClaimed(address indexed user, uint256 amount, uint256 rate, uint256 streak);

    constructor(address _token, address _resolver) {
        dojoToken = IERC20(_token);
        resolver = IDojoResolver(_resolver);
    }

    function getBonusRate(uint256 streak) public pure returns (uint256) {
        if (streak >= RAMP_DAYS) return MAX_RATE;
        return BASE_RATE + ((MAX_RATE - BASE_RATE) * streak) / RAMP_DAYS;
    }

    function calculateBonus(address user) public view returns (uint256) {
        uint256 holdings = dojoToken.balanceOf(user);
        uint256 streak = resolver.currentStreak(user);
        uint256 rate = getBonusRate(streak);
        return (holdings * rate) / BPS;
    }

    function canClaimToday(address user) public view returns (bool) {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        uint256 lastCheckInDay = resolver.lastCheckIn(user) / SECONDS_PER_DAY;
        return lastCheckInDay == today && lastBonusClaim[user] != today;
    }

    function claimDailyBonus() external returns (uint256) {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        require(resolver.lastCheckIn(msg.sender) / SECONDS_PER_DAY == today, "Check in first");
        require(lastBonusClaim[msg.sender] != today, "Already claimed today");

        uint256 bonus = calculateBonus(msg.sender);
        require(bonus > 0, "No bonus available");
        require(dojoToken.balanceOf(address(this)) >= bonus, "Insufficient contract funds");

        lastBonusClaim[msg.sender] = today;
        dojoToken.transfer(msg.sender, bonus);

        uint256 streak = resolver.currentStreak(msg.sender);
        emit BonusClaimed(msg.sender, bonus, getBonusRate(streak), streak);
        return bonus;
    }
}
