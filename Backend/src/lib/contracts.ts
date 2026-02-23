// Contract ABIs — minimal interfaces needed for the backend indexer & frontend
// Full ABIs are in Smart Contracts/artifacts/, these are trimmed for efficiency

export const MARKET_FACTORY_ABI = [
    "event MarketCreated(address indexed marketAddress, uint256 indexed marketId, string question, address creator, uint256 tradingFee)",
    "function getMarkets() view returns (address[])",
    "function getMarketCount() view returns (uint256)",
    "function createMarket(string question, string description, string category, uint256 resolutionDate, uint256 initialLiquidity) returns (address)",
] as const;

export const MARKET_ABI = [
    "event SharesPurchased(address indexed buyer, bool isYes, uint256 amount, uint256 shares, uint256 newYesPrice, uint256 newNoPrice)",
    "event SharesSold(address indexed seller, bool isYes, uint256 shares, uint256 payout, uint256 newYesPrice, uint256 newNoPrice)",
    "event MarketResolved(bool outcome, uint256 timestamp)",
    "event WinningsClaimed(address indexed user, uint256 shares, uint256 payout)",
    "function question() view returns (string)",
    "function description() view returns (string)",
    "function category() view returns (string)",
    "function resolutionDate() view returns (uint256)",
    "function oracle() view returns (address)",
    "function resolved() view returns (bool)",
    "function outcome() view returns (bool)",
    "function yesPool() view returns (uint256)",
    "function noPool() view returns (uint256)",
    "function totalVolume() view returns (uint256)",
    "function getYesPrice() view returns (uint256)",
    "function getNoPrice() view returns (uint256)",
    "function yesShares(address) view returns (uint256)",
    "function noShares(address) view returns (uint256)",
    "function hasClaimed(address) view returns (bool)",
    "function buyYes(uint256 amount) returns (uint256)",
    "function buyNo(uint256 amount) returns (uint256)",
    "function sellYes(uint256 shares) returns (uint256)",
    "function sellNo(uint256 shares) returns (uint256)",
    "function resolve(bool _outcome)",
    "function claimWinnings()",
    "function getMarketInfo() view returns (string, string, string, uint256, address, bool, bool, uint256, uint256, uint256, uint256)",
] as const;

export const TEST_TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function mint(uint256 amount)",
    "function mintTo(address to, uint256 amount)",
    "function decimals() view returns (uint8)",
] as const;

// Network config
export const QUBETICS_CONFIG = {
    chainId: 9029,
    rpc: "https://rpc-testnet.qubetics.work/",
    name: "Qubetics Testnet",
    currency: "TICS",
    explorer: "https://explorer-testnet.qubetics.work",
};
