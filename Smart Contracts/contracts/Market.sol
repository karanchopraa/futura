// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Market
 * @dev Individual prediction market using Constant Product Market Maker (CPMM).
 *
 * Pricing: yesPrice = yesPool / (yesPool + noPool)
 * Each share pays $1 on resolution if the chosen outcome wins.
 */
contract Market {
    using SafeERC20 for IERC20;

    // --- State ---
    string public question;
    string public description;
    string public category;
    uint256 public resolutionDate;
    address public oracle;        // Creator acts as oracle
    address public factory;
    IERC20 public token;

    bool public resolved;
    bool public outcome;          // true = Yes wins, false = No wins

    uint256 public yesPool;       // CPMM pool for Yes
    uint256 public noPool;        // CPMM pool for No
    uint256 public totalVolume;
    uint256 public tradingFee;    // Fee in basis points (1 = 0.01%, 100 = 1%)
    uint256 public feePool;       // Accumulated fees in tUSDC

    // Minimum pool size to prevent drain attacks (0.001 tUSDC)
    uint256 public constant MIN_POOL_SIZE = 1000;

    // Grace period before emergency withdrawal is allowed (7 days after resolutionDate)
    uint256 public constant GRACE_PERIOD = 7 days;

    // Total outstanding shares across all users (for emergency pro-rata refunds)
    uint256 public totalSharesIssued;

    bool public poolInitialized;

    // User balances: address => shares
    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;
    mapping(address => bool) public hasClaimed;

    // --- Events ---
    event SharesPurchased(
        address indexed buyer,
        bool isYes,
        uint256 amount,
        uint256 shares,
        uint256 newYesPrice,
        uint256 newNoPrice
    );

    event SharesSold(
        address indexed seller,
        bool isYes,
        uint256 shares,
        uint256 payout,
        uint256 newYesPrice,
        uint256 newNoPrice
    );

    event MarketResolved(bool outcome, uint256 timestamp);

    event WinningsClaimed(
        address indexed user,
        uint256 shares,
        uint256 payout
    );

    event EmergencyWithdrawal(
        address indexed user,
        uint256 payout
    );

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can resolve");
        _;
    }

    modifier notResolved() {
        require(!resolved, "Market already resolved");
        _;
    }

    modifier isResolved() {
        require(resolved, "Market not resolved yet");
        _;
    }

    modifier tradingOpen() {
        require(block.timestamp < resolutionDate, "Trading closed: past resolution date");
        _;
    }

    constructor(
        string memory _question,
        string memory _description,
        string memory _category,
        uint256 _resolutionDate,
        address _token,
        address _oracle,
        uint256 _tradingFee
    ) {
        question = _question;
        description = _description;
        category = _category;
        resolutionDate = _resolutionDate;
        token = IERC20(_token);
        oracle = _oracle;
        tradingFee = _tradingFee;
        factory = msg.sender;
    }

    /**
     * @dev Called by factory after transferring liquidity. Splits 50/50 into pools.
     */
    function initializePool(uint256 liquidity) external {
        require(msg.sender == factory, "Only factory");
        require(!poolInitialized, "Already initialized");
        
        uint256 half = liquidity / 2;
        yesPool = half;
        noPool = half;
        poolInitialized = true;
    }

    // --- Price Getters (6-decimal precision, matching tUSDC) ---

    /// @notice Returns Yes price in cents (0-100), scaled to 1e6
    function getYesPrice() public view returns (uint256) {
        if (yesPool + noPool == 0) return 500000; // 50¢
        return (yesPool * 1e6) / (yesPool + noPool);
    }

    /// @notice Returns No price in cents (0-100), scaled to 1e6
    function getNoPrice() public view returns (uint256) {
        if (yesPool + noPool == 0) return 500000; // 50¢
        return (noPool * 1e6) / (yesPool + noPool);
    }

    // --- Trading ---

    /**
     * @dev Buy Yes shares. Amount is in tUSDC (6 decimals).
     * Uses CPMM: shares = noPool - (k / (yesPool + amount))
     */
    function buyYes(uint256 amount) external notResolved tradingOpen returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Deduct fee
        uint256 fee = (amount * tradingFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        feePool += fee;

        uint256 k = yesPool * noPool;
        uint256 newYesPool = yesPool + amountAfterFee;
        uint256 newNoPool = k / newYesPool;
        uint256 shares = noPool - newNoPool;

        require(shares > 0, "Insufficient output");
        require(newNoPool >= MIN_POOL_SIZE, "Trade too large: pool drain");

        yesPool = newYesPool;
        noPool = newNoPool;
        yesShares[msg.sender] += shares;
        totalSharesIssued += shares;
        totalVolume += amount;

        emit SharesPurchased(
            msg.sender, true, amount, shares,
            getYesPrice(), getNoPrice()
        );

        return shares;
    }

    /**
     * @dev Buy No shares.
     */
    function buyNo(uint256 amount) external notResolved tradingOpen returns (uint256) {
        require(amount > 0, "Amount must be > 0");
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Deduct fee
        uint256 fee = (amount * tradingFee) / 10000;
        uint256 amountAfterFee = amount - fee;
        feePool += fee;

        uint256 k = yesPool * noPool;
        uint256 newNoPool = noPool + amountAfterFee;
        uint256 newYesPool = k / newNoPool;
        uint256 shares = yesPool - newYesPool;

        require(shares > 0, "Insufficient output");
        require(newYesPool >= MIN_POOL_SIZE, "Trade too large: pool drain");

        yesPool = newYesPool;
        noPool = newNoPool;
        noShares[msg.sender] += shares;
        totalSharesIssued += shares;
        totalVolume += amount;

        emit SharesPurchased(
            msg.sender, false, amount, shares,
            getYesPrice(), getNoPrice()
        );

        return shares;
    }

    /**
     * @dev Sell Yes shares back to the pool.
     */
    function sellYes(uint256 shares) external notResolved tradingOpen returns (uint256) {
        require(shares > 0 && yesShares[msg.sender] >= shares, "Insufficient shares");

        uint256 k = yesPool * noPool;
        uint256 newNoPool = noPool + shares;
        uint256 newYesPool = k / newNoPool;
        
        // Payout is the amount of tUSDC removed from the Yes pool
        uint256 payout = yesPool - newYesPool;

        // Apply trading fee to the payout
        uint256 fee = (payout * tradingFee) / 10000;
        uint256 payoutAfterFee = payout - fee;
        feePool += fee;

        require(newYesPool >= MIN_POOL_SIZE, "Sell too large: pool drain");

        yesPool = newYesPool;
        noPool = newNoPool;
        yesShares[msg.sender] -= shares;
        totalSharesIssued -= shares;

        token.safeTransfer(msg.sender, payoutAfterFee);

        emit SharesSold(
            msg.sender, true, shares, payoutAfterFee,
            getYesPrice(), getNoPrice()
        );

        return payoutAfterFee;
    }

    /**
     * @dev Sell No shares back to the pool.
     */
    function sellNo(uint256 shares) external notResolved tradingOpen returns (uint256) {
        require(shares > 0 && noShares[msg.sender] >= shares, "Insufficient shares");

        uint256 k = yesPool * noPool;
        uint256 newYesPool = yesPool + shares;
        uint256 newNoPool = k / newYesPool;
        
        uint256 payout = noPool - newNoPool;

        // Apply trading fee to the payout
        uint256 fee = (payout * tradingFee) / 10000;
        uint256 payoutAfterFee = payout - fee;
        feePool += fee;

        require(newNoPool >= MIN_POOL_SIZE, "Sell too large: pool drain");

        yesPool = newYesPool;
        noPool = newNoPool;
        noShares[msg.sender] -= shares;
        totalSharesIssued -= shares;

        token.safeTransfer(msg.sender, payoutAfterFee);

        emit SharesSold(
            msg.sender, false, shares, payoutAfterFee,
            getYesPrice(), getNoPrice()
        );

        return payoutAfterFee;
    }

    // --- Resolution ---

    /**
     * @dev Resolve the market. Only oracle can call.
     * @param _outcome true = Yes wins, false = No wins
     */
    function resolve(bool _outcome) external onlyOracle notResolved {
        resolved = true;
        outcome = _outcome;
        emit MarketResolved(_outcome, block.timestamp);
    }

    /**
     * @dev Claim winnings after market resolution.
     * Winning shares pay 1:1 in tUSDC (1 share = 1e6 tUSDC = $1).
     */
    function claimWinnings() external isResolved {
        require(!hasClaimed[msg.sender], "Already claimed");

        uint256 winningShares = outcome ? yesShares[msg.sender] : noShares[msg.sender];
        require(winningShares > 0, "No winning shares");

        hasClaimed[msg.sender] = true;

        // Each winning share pays $1 (1e6 in 6-decimal token)
        uint256 payout = winningShares;
        token.safeTransfer(msg.sender, payout);

        emit WinningsClaimed(msg.sender, winningShares, payout);
    }

    /**
     * @dev Emergency withdrawal when oracle abandons the market.
     * Available only after resolutionDate + GRACE_PERIOD if market is still unresolved.
     * Users receive a pro-rata share of the contract's remaining balance.
     */
    function emergencyWithdraw() external notResolved {
        require(
            block.timestamp > resolutionDate + GRACE_PERIOD,
            "Grace period not elapsed"
        );

        uint256 userShares = yesShares[msg.sender] + noShares[msg.sender];
        require(userShares > 0, "No shares to withdraw");

        uint256 contractBalance = token.balanceOf(address(this));
        uint256 payout = (contractBalance * userShares) / totalSharesIssued;

        // Zero out user shares
        totalSharesIssued -= userShares;
        yesShares[msg.sender] = 0;
        noShares[msg.sender] = 0;
        hasClaimed[msg.sender] = true;

        token.safeTransfer(msg.sender, payout);

        emit EmergencyWithdrawal(msg.sender, payout);
    }

    /**
     * @dev Claim accumulated trading fees. Only oracle can call.
     */
    function claimFees() external onlyOracle {
        uint256 amount = feePool;
        require(amount > 0, "No fees to claim");
        feePool = 0;
        token.safeTransfer(msg.sender, amount);
    }

    // --- View Helpers ---

    function getMarketInfo()
        external
        view
        returns (
            string memory _question,
            string memory _description,
            string memory _category,
            uint256 _resolutionDate,
            address _oracle,
            bool _resolved,
            bool _outcome,
            uint256 _yesPrice,
            uint256 _noPrice,
            uint256 _totalVolume,
            uint256 _tradingFee
        )
    {
        return (
            question,
            description,
            category,
            resolutionDate,
            oracle,
            resolved,
            outcome,
            getYesPrice(),
            getNoPrice(),
            totalVolume,
            tradingFee
        );
    }
}
