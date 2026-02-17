// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DojoFaucet
/// @notice One-time welcome bonus for new users. Claim requires a per-user proof
///         derived from a shared secret + msg.sender.
contract DojoFaucet {
    IERC20 public immutable token;
    address public owner;
    bytes32 private secret;
    uint256 public claimAmount;

    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed user, uint256 amount);
    event SecretRotated();
    event ClaimAmountUpdated(uint256 newAmount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(IERC20 _token, uint256 _claimAmount, bytes32 _secret) {
        token = _token;
        claimAmount = _claimAmount;
        secret = _secret;
        owner = msg.sender;
    }

    function claim(bytes32 proof) external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(
            keccak256(abi.encodePacked(secret, msg.sender)) == proof,
            "Invalid proof"
        );

        hasClaimed[msg.sender] = true;
        token.transfer(msg.sender, claimAmount);
        emit Claimed(msg.sender, claimAmount);
    }

    function setSecret(bytes32 _secret) external onlyOwner {
        secret = _secret;
        emit SecretRotated();
    }

    function setClaimAmount(uint256 _claimAmount) external onlyOwner {
        claimAmount = _claimAmount;
        emit ClaimAmountUpdated(_claimAmount);
    }

    function withdraw() external onlyOwner {
        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "Nothing to withdraw");
        token.transfer(owner, bal);
    }
}
