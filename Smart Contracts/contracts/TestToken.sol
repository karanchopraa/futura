// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @dev Mock USDC for Futura testnet. Anyone can mint for testing.
 */
contract TestToken is ERC20 {
    uint8 private _decimals;

    constructor() ERC20("Test USDC", "tUSDC") {
        _decimals = 6;
        // Mint 1M tUSDC to deployer for initial liquidity
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Public mint for testnet — anyone can get tokens.
     * @param amount Amount in smallest unit (6 decimals)
     */
    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    /**
     * @dev Mint to a specific address (useful for faucet)
     */
    function mintTo(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
