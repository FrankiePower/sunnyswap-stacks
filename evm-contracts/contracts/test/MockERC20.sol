// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Simple ERC20 token for testing purposes
 * @dev This contract is used as the ACCESS_TOKEN in the STXEscrowFactory
 */
contract MockERC20 is ERC20 {
    /**
     * @notice Creates a new MockERC20 token
     * @param name Token name
     * @param symbol Token symbol
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // Mint 1 million tokens to deployer for testing
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    /**
     * @notice Mints new tokens to a specified address
     * @param to Address to receive tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
