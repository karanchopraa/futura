// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Market.sol";

/**
 * @title MarketFactory
 * @dev Factory contract that deploys individual prediction Market contracts.
 */
contract MarketFactory {
    address public owner;
    address public tokenAddress;
    
    address[] public markets;
    mapping(address => bool) public isMarket;

    event MarketCreated(
        address indexed marketAddress,
        uint256 indexed marketId,
        string question,
        address creator,
        uint256 tradingFee
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _tokenAddress) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
    }

    /**
     * @dev Creates a new prediction market
     * @param question The market question
     * @param description Detailed description / resolution criteria
     * @param category Market category (crypto, politics, tech, sports, pop)
     * @param resolutionDate Unix timestamp for resolution deadline
     * @param initialLiquidity Initial tUSDC liquidity for the CPMM pool
     * @param tradingFee Fee in basis points (100 = 1%)
     */
    function createMarket(
        string calldata question,
        string calldata description,
        string calldata category,
        uint256 resolutionDate,
        uint256 initialLiquidity,
        uint256 tradingFee
    ) external returns (address) {
        require(resolutionDate > block.timestamp, "Resolution must be in future");
        require(initialLiquidity >= 10 * 10 ** 6, "Min 10 tUSDC liquidity"); // lowered to 10 for testing
        require(tradingFee <= 1000, "Fee cannot exceed 10%");

        Market market = new Market(
            question,
            description,
            category,
            resolutionDate,
            tokenAddress,
            msg.sender,
            tradingFee
        );

        // Transfer initial liquidity from creator to market
        IERC20(tokenAddress).transferFrom(
            msg.sender,
            address(market),
            initialLiquidity
        );

        // Initialize the CPMM pool
        market.initializePool(initialLiquidity);

        address marketAddr = address(market);
        uint256 marketId = markets.length;
        markets.push(marketAddr);
        isMarket[marketAddr] = true;

        emit MarketCreated(marketAddr, marketId, question, msg.sender, tradingFee);
        return marketAddr;
    }

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }
}
