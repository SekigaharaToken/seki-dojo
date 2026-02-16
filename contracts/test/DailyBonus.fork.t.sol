// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DailyBonus } from "../src/DailyBonus.sol";

/// @title DailyBonus E2E Fork Test
/// @notice Forks Base Sepolia to test DailyBonus against live DojoResolver,
///         DOJO token (Mint Club V2), and EAS predeploy.
///         Simulates multi-day check-in + bonus claim flows.
contract DailyBonusForkTest is Test {
    // ── Live Sepolia addresses ──────────────────────────────────────────
    address constant EAS_ADDRESS = 0x4200000000000000000000000000000000000021;
    address constant DOJO_RESOLVER = 0xA046B36f99a434CE30b14BB783310aF16D00009d;
    bytes32 constant SCHEMA_UID = 0xc3d5fa683150402070fa90f53e23d4921826640823deed57d32cd53db62c6c0e;
    address constant DOJO_TOKEN = 0x7c448c765165f0Ae2dae8A5E585a39e6fB02Ca99;
    address constant OPERATOR = 0x1eD4aC856D7a072C3a336C0971a47dB86A808Ff4;

    // Mint Club V2 contracts on Base Sepolia
    address constant MINT_CLUB_BOND = 0x5dfA75b0185efBaEF286E80B847ce84ff8a62C2d;
    address constant MINT_CLUB_ZAP = 0x40c7DC399e01029a51cAb316f8Bca7D20DE31bad;

    DailyBonus public bonus;
    IERC20 public dojo;
    IEAS public eas;

    address public alice;
    uint256 public aliceKey;
    address public bob;
    uint256 public bobKey;

    uint256 constant TREASURY_FUND = 50_000 ether;
    uint256 constant USER_DOJO = 10_000 ether;

    function setUp() public {
        // Fork Base Sepolia
        vm.createSelectFork("base_sepolia");

        // Warp to a fresh UTC day boundary to avoid collisions with real attestations
        uint256 freshDay = (block.timestamp / 86400 + 1) * 86400;
        vm.warp(freshDay);

        dojo = IERC20(DOJO_TOKEN);
        eas = IEAS(EAS_ADDRESS);

        // Create test wallets
        (alice, aliceKey) = makeAddrAndKey("alice_e2e");
        (bob, bobKey) = makeAddrAndKey("bob_e2e");

        // Deploy DailyBonus
        bonus = new DailyBonus(DOJO_TOKEN, DOJO_RESOLVER);

        // Fund from operator (impersonate)
        vm.startPrank(OPERATOR);
        dojo.transfer(address(bonus), TREASURY_FUND);
        dojo.transfer(alice, USER_DOJO);
        dojo.transfer(bob, USER_DOJO / 2); // Bob has 5000 DOJO
        vm.stopPrank();

        // Give test wallets ETH for gas
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    function _checkIn(address user) internal {
        uint32 day = uint32(block.timestamp / 86400);
        bytes memory data = abi.encode("dojo", day);

        vm.prank(user);
        eas.attest(
            AttestationRequest({
                schema: SCHEMA_UID,
                data: AttestationRequestData({
                    recipient: user,
                    expirationTime: 0,
                    revocable: false,
                    refUID: bytes32(0),
                    data: data,
                    value: 0
                })
            })
        );
    }

    function _claimBonus(address user) internal returns (uint256) {
        vm.prank(user);
        return bonus.claimDailyBonus();
    }

    function _readStreak(address user) internal view returns (uint256) {
        (bool ok, bytes memory ret) = DOJO_RESOLVER.staticcall(
            abi.encodeWithSignature("currentStreak(address)", user)
        );
        require(ok, "readStreak failed");
        return abi.decode(ret, (uint256));
    }

    function _readLastCheckIn(address user) internal view returns (uint256) {
        (bool ok, bytes memory ret) = DOJO_RESOLVER.staticcall(
            abi.encodeWithSignature("lastCheckIn(address)", user)
        );
        require(ok, "readLastCheckIn failed");
        return abi.decode(ret, (uint256));
    }

    // =====================================================================
    // E2E: Day 1 — first check-in + bonus claim
    // =====================================================================

    function test_e2e_day1_checkInAndClaimBonus() public {
        assertEq(dojo.balanceOf(alice), USER_DOJO, "Alice should start with 10k DOJO");

        // Check in
        _checkIn(alice);
        assertEq(_readStreak(alice), 1, "Streak should be 1 after first check-in");

        // Verify can claim
        assertTrue(bonus.canClaimToday(alice), "Should be able to claim after check-in");

        // Claim bonus
        uint256 balBefore = dojo.balanceOf(alice);
        uint256 claimed = _claimBonus(alice);

        // streak=1, rate=10+(10*1)/30=10, bonus=10000e18*10/10000=10e18
        assertEq(bonus.getBonusRate(1), 10, "Rate at streak 1 should be 10 bps");
        assertEq(claimed, 10 ether, "Bonus for 10k DOJO at 0.1% should be 10 DOJO");
        assertEq(dojo.balanceOf(alice), balBefore + claimed, "Balance should increase by bonus");

        // Can't claim again
        assertFalse(bonus.canClaimToday(alice), "Should not be able to claim twice");
    }

    // =====================================================================
    // E2E: Multi-day streak building (7 consecutive days)
    // =====================================================================

    function test_e2e_7dayStreak_bonusRateIncreases() public {
        uint256[] memory dailyBonuses = new uint256[](7);

        for (uint256 i = 0; i < 7; i++) {
            _checkIn(alice);
            dailyBonuses[i] = _claimBonus(alice);

            if (i < 6) {
                vm.warp(block.timestamp + 1 days);
            }
        }

        // After 7 days: streak=7, rate=10+(10*7)/30=12
        assertEq(_readStreak(alice), 7, "Streak should be 7");
        assertEq(bonus.getBonusRate(7), 12, "Rate at streak 7 should be 12 bps");

        // Day 1 bonus (streak=1, rate=10): 10k * 10/10000 = 10 DOJO
        assertEq(dailyBonuses[0], 10 ether, "Day 1 bonus");

        // Day 7 bonus (streak=7, rate=12): (10k + accumulated) * 12/10000
        // Each day balance grows, so day 7 bonus > day 1 bonus
        assertTrue(dailyBonuses[6] > dailyBonuses[0], "Day 7 bonus should exceed day 1");
    }

    // =====================================================================
    // E2E: 30-day ramp to max rate
    // =====================================================================

    function test_e2e_30dayStreak_hitsMaxRate() public {
        for (uint256 i = 0; i < 30; i++) {
            _checkIn(alice);
            _claimBonus(alice);
            if (i < 29) vm.warp(block.timestamp + 1 days);
        }

        assertEq(_readStreak(alice), 30, "Streak should be 30");
        assertEq(bonus.getBonusRate(30), 20, "Rate at streak 30 should be max (20 bps)");

        // One more day at max rate
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);

        uint256 balBefore = dojo.balanceOf(alice);
        uint256 claimed = _claimBonus(alice);

        // Rate is 20 bps = 0.2%, bonus = balance * 20 / 10000
        uint256 expected = (balBefore * 20) / 10_000;
        assertEq(claimed, expected, "Day 31 bonus should use max rate");
    }

    // =====================================================================
    // E2E: Multi-user independence
    // =====================================================================

    function test_e2e_multiUser_independentStreaksAndBonuses() public {
        // Day 1: both check in
        _checkIn(alice);
        _checkIn(bob);
        uint256 aliceBonus1 = _claimBonus(alice);
        uint256 bobBonus1 = _claimBonus(bob);

        // Alice has 10k DOJO, Bob has 5k — same rate but different amounts
        assertEq(aliceBonus1, 2 * bobBonus1, "Alice bonus should be 2x Bob (2x holdings)");

        // Day 2: only Alice checks in
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        _claimBonus(alice);

        assertEq(_readStreak(alice), 2, "Alice streak should be 2");
        assertEq(_readStreak(bob), 1, "Bob streak should still be 1 (no check-in)");

        // Day 3: both check in — Bob's streak resets
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        _checkIn(bob);

        assertEq(_readStreak(alice), 3, "Alice streak should be 3");
        assertEq(_readStreak(bob), 1, "Bob streak should reset to 1 (gap)");
    }

    // =====================================================================
    // E2E: Bonus requires same-day check-in
    // =====================================================================

    function test_e2e_bonusRequiresCheckIn() public {
        // Try to claim without checking in
        assertFalse(bonus.canClaimToday(alice), "Cannot claim without check-in");

        vm.prank(alice);
        vm.expectRevert("Check in first");
        bonus.claimDailyBonus();
    }

    // =====================================================================
    // E2E: Yesterday's check-in doesn't allow today's bonus
    // =====================================================================

    function test_e2e_yesterdayCheckInNoBonus() public {
        _checkIn(alice);
        _claimBonus(alice);

        // Next day — Alice didn't check in today
        vm.warp(block.timestamp + 1 days);
        assertFalse(bonus.canClaimToday(alice), "Yesterday check-in should not allow today's claim");
    }

    // =====================================================================
    // E2E: Streak gap resets but allows new bonus
    // =====================================================================

    function test_e2e_streakGap_resetsButAllowsBonus() public {
        // Build 3-day streak
        _checkIn(alice);
        _claimBonus(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        _claimBonus(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        _claimBonus(alice);
        assertEq(_readStreak(alice), 3);

        // Skip 2 days (streak gap)
        vm.warp(block.timestamp + 3 days);

        // Check in again — streak resets to 1
        _checkIn(alice);
        assertEq(_readStreak(alice), 1, "Streak should reset after gap");

        // But bonus still works (at base rate)
        uint256 claimed = _claimBonus(alice);
        assertTrue(claimed > 0, "Should still earn bonus after streak reset");
    }

    // =====================================================================
    // E2E: Zero DOJO balance = no bonus
    // =====================================================================

    function test_e2e_zeroBalance_noBonusClaim() public {
        address charlie = makeAddr("charlie_e2e");
        vm.deal(charlie, 1 ether);

        // Charlie has 0 DOJO — check in succeeds
        _checkIn(charlie);
        assertEq(_readStreak(charlie), 1, "Check-in should work with 0 DOJO");

        // But bonus claim reverts
        vm.prank(charlie);
        vm.expectRevert("No bonus available");
        bonus.claimDailyBonus();
    }

    // =====================================================================
    // E2E: Treasury depletion — contract runs out of funds
    // =====================================================================

    function test_e2e_insufficientFunds_reverts() public {
        // Deploy an unfunded DailyBonus
        DailyBonus unfunded = new DailyBonus(DOJO_TOKEN, DOJO_RESOLVER);

        _checkIn(alice);

        vm.prank(alice);
        vm.expectRevert("Insufficient contract funds");
        unfunded.claimDailyBonus();
    }

    // =====================================================================
    // E2E: Verify Mint Club DOJO token is real ERC20
    // =====================================================================

    function test_e2e_dojoToken_isRealERC20() public view {
        // Verify the token has expected properties on the fork
        assertTrue(dojo.totalSupply() > 0, "DOJO should have non-zero supply");
        assertTrue(dojo.balanceOf(OPERATOR) > 0, "Operator should have DOJO");
        assertEq(dojo.balanceOf(alice), USER_DOJO, "Alice funded correctly");
    }
}
