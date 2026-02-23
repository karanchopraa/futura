import { Contract, parseUnits, formatUnits } from "ethers";
import { getSigner, getProvider } from "./wallet";

// Contract addresses — will be replaced with real addresses after deployment
const CONTRACTS = {
    testToken: process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "",
    marketFactory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
};

// ABIs (human-readable format for ethers.js)
const TOKEN_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function mint(uint256 amount)",
    "function decimals() view returns (uint8)",
];

const MARKET_FACTORY_ABI = [
    "event MarketCreated(address indexed marketAddress, uint256 indexed marketId, string question, address creator, uint256 tradingFee)",
    "function createMarket(string question, string description, string category, uint256 resolutionDate, uint256 initialLiquidity, uint256 tradingFee) returns (address)",
];

const MARKET_ABI = [
    "function question() view returns (string)",
    "function getYesPrice() view returns (uint256)",
    "function getNoPrice() view returns (uint256)",
    "function totalVolume() view returns (uint256)",
    "function yesShares(address) view returns (uint256)",
    "function noShares(address) view returns (uint256)",
    "function resolved() view returns (bool)",
    "function outcome() view returns (bool)",
    "function buyYes(uint256 amount) returns (uint256)",
    "function buyNo(uint256 amount) returns (uint256)",
    "function sellYes(uint256 shares) returns (uint256)",
    "function sellNo(uint256 shares) returns (uint256)",
    "function claimWinnings()",
    "function getMarketInfo() view returns (string, string, string, uint256, address, bool, bool, uint256, uint256, uint256, uint256)",
    "function tradingFee() view returns (uint256)",
];

// --- Token functions ---

export async function getTokenBalance(address: string): Promise<string> {
    const provider = await getProvider();
    const token = new Contract(CONTRACTS.testToken, TOKEN_ABI, provider);
    const balance = await token.balanceOf(address);
    return formatUnits(balance, 6);
}

export async function mintTestTokens(amount: number): Promise<string> {
    const signer = await getSigner();
    const token = new Contract(CONTRACTS.testToken, TOKEN_ABI, signer);
    const tx = await token.mint(parseUnits(amount.toString(), 6));
    await tx.wait();
    return tx.hash;
}

export async function approveToken(marketAddress: string, amount: number): Promise<string> {
    const signer = await getSigner();
    const token = new Contract(CONTRACTS.testToken, TOKEN_ABI, signer);
    const tx = await token.approve(marketAddress, parseUnits(amount.toString(), 6));
    await tx.wait();
    return tx.hash;
}

// --- Market trading functions ---

export async function buyYesShares(marketAddress: string, amount: number): Promise<{ hash: string; shares: string }> {
    // First approve the market to spend tokens
    await approveToken(marketAddress, amount);

    const signer = await getSigner();
    const market = new Contract(marketAddress, MARKET_ABI, signer);
    const tx = await market.buyYes(parseUnits(amount.toString(), 6));
    const receipt = await tx.wait();

    // Extract shares from event
    const event = receipt?.logs?.[receipt.logs.length - 1];

    return { hash: tx.hash, shares: "0" };
}

export async function buyNoShares(marketAddress: string, amount: number): Promise<{ hash: string; shares: string }> {
    await approveToken(marketAddress, amount);

    const signer = await getSigner();
    const market = new Contract(marketAddress, MARKET_ABI, signer);
    const tx = await market.buyNo(parseUnits(amount.toString(), 6));
    await tx.wait();

    return { hash: tx.hash, shares: "0" };
}

export async function sellYesShares(marketAddress: string, shares: number): Promise<string> {
    const signer = await getSigner();
    const provider = signer.provider;
    if (provider) {
        const code = await provider.getCode(marketAddress);
        if (code === "0x") throw new Error("This market has no on-chain contract. It may be from seed/demo data and cannot be traded.");
    }
    const market = new Contract(marketAddress, MARKET_ABI, signer);
    const tx = await market.sellYes(parseUnits(shares.toString(), 6));
    await tx.wait();
    return tx.hash;
}

export async function sellNoShares(marketAddress: string, shares: number): Promise<string> {
    const signer = await getSigner();
    const provider = signer.provider;
    if (provider) {
        const code = await provider.getCode(marketAddress);
        if (code === "0x") throw new Error("This market has no on-chain contract. It may be from seed/demo data and cannot be traded.");
    }
    const market = new Contract(marketAddress, MARKET_ABI, signer);
    const tx = await market.sellNo(parseUnits(shares.toString(), 6));
    await tx.wait();
    return tx.hash;
}

export async function claimWinnings(marketAddress: string): Promise<string> {
    const signer = await getSigner();
    const market = new Contract(marketAddress, MARKET_ABI, signer);
    const tx = await market.claimWinnings();
    await tx.wait();
    return tx.hash;
}

// --- Admin functions ---

export async function createMarket(
    question: string,
    description: string,
    category: string,
    resolutionDateTimestamp: number,
    initialLiquidity: number,
    tradingFeeBps: number
): Promise<string> {
    // 1. Approve factory to spend initial liquidity
    await approveToken(CONTRACTS.marketFactory, initialLiquidity);

    // 2. Call factory to create market
    const signer = await getSigner();
    const factory = new Contract(CONTRACTS.marketFactory, MARKET_FACTORY_ABI, signer);

    const tx = await factory.createMarket(
        question,
        description,
        category,
        resolutionDateTimestamp,
        parseUnits(initialLiquidity.toString(), 6),
        tradingFeeBps
    );

    // 3. Wait for tx and extract new market address
    const receipt = await tx.wait();
    const event = receipt?.logs?.find((log: any) => {
        try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === "MarketCreated";
        } catch { return false; }
    });

    if (event) {
        const parsed = factory.interface.parseLog(event);
        return parsed?.args[0]; // Returns the new market address
    }

    return tx.hash;
}

// --- Read functions ---

export async function getMarketPrices(marketAddress: string): Promise<{ yesPrice: number; noPrice: number }> {
    const provider = await getProvider();
    const market = new Contract(marketAddress, MARKET_ABI, provider);
    const [yesPrice, noPrice] = await Promise.all([
        market.getYesPrice(),
        market.getNoPrice(),
    ]);
    return {
        yesPrice: Number(yesPrice) / 10000,
        noPrice: Number(noPrice) / 10000,
    };
}

export async function getUserShares(
    marketAddress: string,
    userAddress: string
): Promise<{ yesShares: string; noShares: string }> {
    const provider = await getProvider();
    const market = new Contract(marketAddress, MARKET_ABI, provider);
    const [yes, no] = await Promise.all([
        market.yesShares(userAddress),
        market.noShares(userAddress),
    ]);
    return {
        yesShares: formatUnits(yes, 6),
        noShares: formatUnits(no, 6),
    };
}
