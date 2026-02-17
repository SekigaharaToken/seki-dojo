// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { ISchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { EAS } from "@ethereum-attestation-service/eas-contracts/contracts/EAS.sol";
import { SchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";
import { AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DojoResolver } from "../src/DojoResolver.sol";
import { DailyBonus } from "../src/DailyBonus.sol";
import { DemoToken } from "../src/DemoToken.sol";

contract DailyBonusTest is Test {
    EAS public eas;
    SchemaRegistry public registry;
    DojoResolver public resolver;
    DailyBonus public bonus;
    DemoToken public token;
    bytes32 public schemaUID;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public operator = makeAddr("operator");

    uint256 constant INITIAL_SUPPLY = 1_000_000 ether;
    uint256 constant TREASURY_FUND = 100_000 ether;
    uint256 constant ALICE_BALANCE = 10_000 ether;
    uint256 constant BOB_BALANCE = 5_000 ether;

    function setUp() public {
        // Warp to a realistic timestamp (Foundry default is 1, which causes day=0 collisions)
        vm.warp(1_700_000_000); // ~Nov 2023

        // Deploy mock DOJO token
        vm.prank(operator);
        token = new DemoToken("DOJO", "DOJO", INITIAL_SUPPLY);

        // Deploy EAS infrastructure
        registry = new SchemaRegistry();
        eas = new EAS(ISchemaRegistry(address(registry)));
        resolver = new DojoResolver(IEAS(address(eas)), IERC20(address(token)));
        schemaUID = registry.register("string app, uint32 day", resolver, false);

        // Deploy DailyBonus
        bonus = new DailyBonus(address(token), address(resolver));

        // Fund the DailyBonus contract (operator sends treasury)
        vm.prank(operator);
        token.transfer(address(bonus), TREASURY_FUND);

        // Give Alice and Bob some DOJO
        vm.prank(operator);
        token.transfer(alice, ALICE_BALANCE);
        vm.prank(operator);
        token.transfer(bob, BOB_BALANCE);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    function _checkIn(address user) internal returns (bytes32) {
        uint32 day = uint32(block.timestamp / 86400);
        bytes memory data = abi.encode("dojo", day);
        vm.prank(user);
        return eas.attest(
            AttestationRequest({
                schema: schemaUID,
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

    // =========================================================================
    // getBonusRate
    // =========================================================================

    function test_getBonusRate_returnsBaseAtStreak0() public view {
        assertEq(bonus.getBonusRate(0), 10);
    }

    function test_getBonusRate_returnsMidpointAtStreak15() public view {
        assertEq(bonus.getBonusRate(15), 15);
    }

    function test_getBonusRate_returnsMaxAtStreak30() public view {
        assertEq(bonus.getBonusRate(30), 20);
    }

    function test_getBonusRate_returnsMaxAbove30() public view {
        assertEq(bonus.getBonusRate(60), 20);
        assertEq(bonus.getBonusRate(999), 20);
    }

    function test_getBonusRate_linearInterpolation() public view {
        // streak 10: 10 + (10 * 10) / 30 = 10 + 3 = 13
        assertEq(bonus.getBonusRate(10), 13);
        // streak 20: 10 + (10 * 20) / 30 = 10 + 6 = 16
        assertEq(bonus.getBonusRate(20), 16);
    }

    // =========================================================================
    // calculateBonus
    // =========================================================================

    function test_calculateBonus_correctForStreak1() public {
        _checkIn(alice); // streak = 1
        // rate = 10 + (10 * 1) / 30 = 10 (integer division)
        // bonus = 10_000e18 * 10 / 10_000 = 10e18
        assertEq(bonus.calculateBonus(alice), 10 ether);
    }

    function test_calculateBonus_correctForStreak15() public {
        // Build streak of 15
        _checkIn(alice);
        for (uint256 i = 1; i < 15; i++) {
            vm.warp(block.timestamp + 1 days);
            _checkIn(alice);
        }
        assertEq(resolver.currentStreak(alice), 15);
        // rate = 15, bonus = 10_000e18 * 15 / 10_000 = 15e18
        assertEq(bonus.calculateBonus(alice), 15 ether);
    }

    function test_calculateBonus_zeroForZeroHoldings() public {
        address charlie = makeAddr("charlie");
        _checkIn(charlie); // streak = 1, 0 holdings
        assertEq(bonus.calculateBonus(charlie), 0);
    }

    // =========================================================================
    // canClaimToday
    // =========================================================================

    function test_canClaimToday_falseBeforeCheckIn() public view {
        assertFalse(bonus.canClaimToday(alice));
    }

    function test_canClaimToday_trueAfterCheckIn() public {
        _checkIn(alice);
        assertTrue(bonus.canClaimToday(alice));
    }

    function test_canClaimToday_falseAfterClaim() public {
        _checkIn(alice);
        vm.prank(alice);
        bonus.claimDailyBonus();
        assertFalse(bonus.canClaimToday(alice));
    }

    // =========================================================================
    // claimDailyBonus — success
    // =========================================================================

    function test_claimDailyBonus_transfersCorrectAmount() public {
        _checkIn(alice);
        uint256 expected = bonus.calculateBonus(alice);
        uint256 balanceBefore = token.balanceOf(alice);

        vm.prank(alice);
        uint256 claimed = bonus.claimDailyBonus();

        assertEq(claimed, expected);
        assertEq(token.balanceOf(alice), balanceBefore + expected);
    }

    function test_claimDailyBonus_emitsEvent() public {
        _checkIn(alice);
        uint256 expected = bonus.calculateBonus(alice);
        uint256 rate = bonus.getBonusRate(resolver.currentStreak(alice));
        uint256 streak = resolver.currentStreak(alice);

        vm.expectEmit(true, false, false, true);
        emit DailyBonus.BonusClaimed(alice, expected, rate, streak);

        vm.prank(alice);
        bonus.claimDailyBonus();
    }

    // =========================================================================
    // claimDailyBonus — reverts
    // =========================================================================

    function test_claimDailyBonus_revertsIfNotCheckedIn() public {
        vm.prank(alice);
        vm.expectRevert("Check in first");
        bonus.claimDailyBonus();
    }

    function test_claimDailyBonus_revertsIfAlreadyClaimed() public {
        _checkIn(alice);
        vm.prank(alice);
        bonus.claimDailyBonus();

        vm.prank(alice);
        vm.expectRevert("Already claimed today");
        bonus.claimDailyBonus();
    }

    function test_claimDailyBonus_revertsIfInsufficientFunds() public {
        // Deploy a new DailyBonus with no funds
        DailyBonus unfunded = new DailyBonus(address(token), address(resolver));

        _checkIn(alice);
        vm.prank(alice);
        vm.expectRevert("Insufficient contract funds");
        unfunded.claimDailyBonus();
    }

    function test_claimDailyBonus_revertsIfZeroBonus() public {
        address charlie = makeAddr("charlie");
        _checkIn(charlie); // 0 DOJO holdings

        vm.prank(charlie);
        vm.expectRevert("No bonus available");
        bonus.claimDailyBonus();
    }

    // =========================================================================
    // Multi-user independence
    // =========================================================================

    function test_multiUser_independentClaims() public {
        _checkIn(alice);
        _checkIn(bob);

        uint256 aliceExpected = bonus.calculateBonus(alice);
        uint256 bobExpected = bonus.calculateBonus(bob);

        vm.prank(alice);
        bonus.claimDailyBonus();
        vm.prank(bob);
        bonus.claimDailyBonus();

        assertEq(token.balanceOf(alice), ALICE_BALANCE + aliceExpected);
        assertEq(token.balanceOf(bob), BOB_BALANCE + bobExpected);
    }

    // =========================================================================
    // Consecutive days
    // =========================================================================

    function test_claimDailyBonus_worksOnConsecutiveDays() public {
        // Day 1
        _checkIn(alice);
        vm.prank(alice);
        uint256 day1Bonus = bonus.claimDailyBonus();
        assertTrue(day1Bonus > 0);

        // Day 2 — streak increases, rate might change
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertTrue(bonus.canClaimToday(alice));

        vm.prank(alice);
        uint256 day2Bonus = bonus.claimDailyBonus();
        assertTrue(day2Bonus > 0);
    }

    // =========================================================================
    // Yesterday's check-in doesn't allow today's claim
    // =========================================================================

    function test_canClaimToday_falseForYesterdayCheckIn() public {
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        // Alice checked in yesterday but not today
        assertFalse(bonus.canClaimToday(alice));
    }
}
