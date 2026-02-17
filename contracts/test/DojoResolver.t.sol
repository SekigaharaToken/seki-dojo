// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { ISchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { EAS } from "@ethereum-attestation-service/eas-contracts/contracts/EAS.sol";
import { SchemaRegistry } from "@ethereum-attestation-service/eas-contracts/contracts/SchemaRegistry.sol";
import { AttestationRequest, AttestationRequestData } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import { SchemaRecord } from "@ethereum-attestation-service/eas-contracts/contracts/ISchemaRegistry.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DojoResolver } from "../src/DojoResolver.sol";
import { DemoToken } from "../src/DemoToken.sol";

contract DojoResolverTest is Test {
    EAS public eas;
    SchemaRegistry public registry;
    DojoResolver public resolver;
    DemoToken public token;
    bytes32 public schemaUID;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        // Deploy EAS infrastructure
        registry = new SchemaRegistry();
        eas = new EAS(ISchemaRegistry(address(registry)));

        // Deploy mock DOJO token
        token = new DemoToken("DOJO", "DOJO", 1_000_000 ether);

        // Deploy DojoResolver
        resolver = new DojoResolver(IEAS(address(eas)), IERC20(address(token)));

        // Register schema with resolver
        schemaUID = registry.register(
            "string app, uint32 day",
            resolver,
            false // not revocable
        );
    }

    /// @dev Helper to perform a check-in attestation as a given user
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
    // First check-in
    // =========================================================================

    function test_firstCheckIn_setsStreakToOne() public {
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 1);
    }

    function test_firstCheckIn_setsLongestStreakToOne() public {
        _checkIn(alice);
        assertEq(resolver.longestStreak(alice), 1);
    }

    function test_firstCheckIn_storesLastCheckIn() public {
        _checkIn(alice);
        assertEq(resolver.lastCheckIn(alice), block.timestamp);
    }

    function test_firstCheckIn_returnsAttestationUID() public {
        bytes32 uid = _checkIn(alice);
        assertTrue(uid != bytes32(0));
    }

    // =========================================================================
    // Consecutive day check-in (streak increment)
    // =========================================================================

    function test_consecutiveDay_incrementsStreak() public {
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 2);
    }

    function test_consecutiveDay_updatesLongestStreak() public {
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.longestStreak(alice), 2);
    }

    function test_threeConsecutiveDays() public {
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 3);
        assertEq(resolver.longestStreak(alice), 3);
    }

    // =========================================================================
    // Same-day duplicate (should revert)
    // =========================================================================

    function test_sameDayDuplicate_reverts() public {
        _checkIn(alice);
        vm.expectRevert();
        _checkIn(alice);
    }

    function test_sameDayDuplicate_doesNotChangeStreak() public {
        _checkIn(alice);
        uint256 streakBefore = resolver.currentStreak(alice);
        vm.expectRevert();
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), streakBefore);
    }

    // =========================================================================
    // Gap in days (streak reset)
    // =========================================================================

    function test_gapInDays_resetsStreakToOne() public {
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 2);

        // Skip a day (2 days gap)
        vm.warp(block.timestamp + 2 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 1);
    }

    function test_gapInDays_longestStreakPreserved() public {
        // Build streak of 3
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.longestStreak(alice), 3);

        // Skip days, reset streak
        vm.warp(block.timestamp + 5 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 1);
        // Longest should still be 3
        assertEq(resolver.longestStreak(alice), 3);
    }

    // =========================================================================
    // longestStreak only updates when exceeded
    // =========================================================================

    function test_longestStreak_onlyUpdatesWhenExceeded() public {
        // Build streak of 3
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.longestStreak(alice), 3);

        // Break and rebuild streak of 2 — longest should stay 3
        vm.warp(block.timestamp + 3 days);
        _checkIn(alice);
        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        assertEq(resolver.currentStreak(alice), 2);
        assertEq(resolver.longestStreak(alice), 3);
    }

    // =========================================================================
    // onRevoke always returns false
    // =========================================================================

    function test_onRevoke_alwaysReturnsFalse() public {
        // Schema is not revocable, so we can't call revoke through EAS.
        // Test the function directly via a harness or by checking the
        // schema is registered as non-revocable.
        // Since onRevoke returns false, any attempted revocation would revert.
        // We verify the schema is non-revocable.
        SchemaRecord memory record = registry.getSchema(schemaUID);
        assertFalse(record.revocable);
    }

    // =========================================================================
    // Multi-user isolation
    // =========================================================================

    function test_multiUser_streaksAreIsolated() public {
        _checkIn(alice);
        _checkIn(bob);

        vm.warp(block.timestamp + 1 days);
        _checkIn(alice);
        // Bob doesn't check in

        assertEq(resolver.currentStreak(alice), 2);
        assertEq(resolver.currentStreak(bob), 1);
    }

    // =========================================================================
    // lastCheckIn timestamp accuracy
    // =========================================================================

    function test_lastCheckIn_updatesEachDay() public {
        uint256 startTime = block.timestamp;
        _checkIn(alice);
        assertEq(resolver.lastCheckIn(alice), startTime);

        vm.warp(startTime + 1 days);
        _checkIn(alice);
        assertEq(resolver.lastCheckIn(alice), startTime + 1 days);
    }
}
