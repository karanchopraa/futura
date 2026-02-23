import { ethers } from "ethers";
import { PrismaClient } from "@prisma/client";
import { MARKET_FACTORY_ABI, MARKET_ABI, QUBETICS_CONFIG } from "../lib/contracts";

const prisma = new PrismaClient();

let isRunning = false;

export async function startIndexer() {
    if (isRunning) return;
    isRunning = true;

    const rpcUrl = process.env.RPC_URL || QUBETICS_CONFIG.rpc;
    const factoryAddress = process.env.FACTORY_ADDRESS;

    if (!factoryAddress) {
        console.log("⚠️  FACTORY_ADDRESS not set, skipping indexer");
        return;
    }

    console.log("🔍 Starting blockchain event indexer...");
    console.log(`   RPC: ${rpcUrl}`);
    console.log(`   Factory: ${factoryAddress}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const factory = new ethers.Contract(factoryAddress, MARKET_FACTORY_ABI, provider);

    // 1. Sync existing markets from chain
    await syncExistingMarkets(factory, provider);

    // 2. Poll for new MarketCreated events every 15 seconds
    //    (factory.on() doesn't work reliably — the Qubetics RPC drops event filters)
    let lastScannedBlock = await provider.getBlockNumber();
    console.log(`   Starting event poll from block ${lastScannedBlock}`);

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            if (currentBlock <= lastScannedBlock) return;

            const events = await factory.queryFilter(
                factory.filters.MarketCreated(),
                lastScannedBlock + 1,
                currentBlock
            );

            for (const event of events) {
                const parsed = event as ethers.EventLog;
                if (parsed.args) {
                    const [marketAddress, , question, , tradingFee] = parsed.args;
                    console.log(`📢 New market detected: ${question} (Fee: ${tradingFee} bps)`);
                    await indexMarket(marketAddress, provider);
                }
            }

            lastScannedBlock = currentBlock;
        } catch (err) {
            // Silently ignore RPC hiccups; will retry next interval
        }
    }, 15_000);

    // 3. Poll for price updates every 30 seconds
    setInterval(async () => {
        await updateAllPrices(provider);
    }, 30_000);

    console.log("✅ Indexer started — listening for events");
}

async function syncExistingMarkets(
    factory: ethers.Contract,
    provider: ethers.JsonRpcProvider
) {
    try {
        const marketAddresses: string[] = await factory.getMarkets();
        console.log(`📥 Found ${marketAddresses.length} existing markets on-chain`);

        for (const addr of marketAddresses) {
            await indexMarket(addr, provider);
        }
    } catch (error) {
        console.error("Error syncing existing markets:", error);
    }
}

async function indexMarket(address: string, provider: ethers.JsonRpcProvider) {
    try {
        const contract = new ethers.Contract(address, MARKET_ABI, provider);

        const [question, description, category, resolutionDate, oracle, resolved, outcome, yesPrice, noPrice, totalVolume, tradingFee] =
            await contract.getMarketInfo();

        const yesPriceNum = Number(yesPrice) / 10000; // Convert 1e6 to percentage
        const noPriceNum = Number(noPrice) / 10000;
        const volumeNum = Number(totalVolume) / 1e6; // Convert from 6 decimals
        const feeNum = Number(tradingFee);

        await prisma.market.upsert({
            where: { address },
            create: {
                address,
                question,
                description,
                category,
                resolutionDate: new Date(Number(resolutionDate) * 1000),
                oracle,
                resolved,
                outcome: resolved ? outcome : null,
                yesPrice: yesPriceNum,
                noPrice: noPriceNum,
                volume: volumeNum,
                tradingFee: feeNum,
            },
            update: {
                yesPrice: yesPriceNum,
                noPrice: noPriceNum,
                volume: volumeNum,
                tradingFee: feeNum,
                resolved,
                outcome: resolved ? outcome : null,
            },
        });

        // Record initial price point
        const market = await prisma.market.findUnique({ where: { address } });
        if (market) {
            await prisma.priceHistory.create({
                data: {
                    marketId: market.id,
                    yesPrice: yesPriceNum,
                    noPrice: noPriceNum,
                },
            });
        }

        // Set up event listeners for this market
        listenToMarketEvents(contract, address);

        console.log(`  ✓ Indexed: "${question.substring(0, 50)}..." (Yes: ${yesPriceNum}%, No: ${noPriceNum}%)`);
    } catch (error) {
        console.error(`Error indexing market ${address}:`, error);
    }
}

function listenToMarketEvents(contract: ethers.Contract, marketAddress: string) {
    contract.on("SharesPurchased", async (buyer: string, isYes: boolean, amount: bigint, shares: bigint, newYesPrice: bigint, newNoPrice: bigint) => {
        const yesPriceNum = Number(newYesPrice) / 10000;
        const noPriceNum = Number(newNoPrice) / 10000;
        const amountNum = Number(amount) / 1e6;
        const sharesNum = Number(shares) / 1e6;
        const pricePerShare = sharesNum > 0 ? (amountNum / sharesNum) * 100 : 50;

        console.log(`  💰 ${isYes ? "YES" : "NO"} purchased on ${marketAddress.substring(0, 10)}... — $${amountNum} by ${buyer.substring(0, 10)}`);

        // Update market prices
        const market = await prisma.market.update({
            where: { address: marketAddress },
            data: {
                yesPrice: yesPriceNum,
                noPrice: noPriceNum,
                volume: { increment: amountNum },
            },
        });

        // Record price history
        await prisma.priceHistory.create({
            data: { marketId: market.id, yesPrice: yesPriceNum, noPrice: noPriceNum },
        });

        // Record the trade
        const txEvent = contract.runner?.provider ? await contract.runner.provider.getBlock("latest") : null;
        await prisma.trade.create({
            data: {
                marketId: market.id,
                userAddress: buyer.toLowerCase(),
                action: isYes ? "BUY_YES" : "BUY_NO",
                shares: sharesNum,
                price: pricePerShare,
                amount: amountNum,
                txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
            },
        });

        // Upsert position
        const outcome = isYes ? "YES" : "NO";
        const existingPosition = await prisma.position.findFirst({
            where: {
                marketId: market.id,
                userAddress: buyer.toLowerCase(),
                outcome,
            },
        });

        if (existingPosition) {
            const newShares = existingPosition.shares + sharesNum;
            const newAvgPrice = ((existingPosition.avgPrice * existingPosition.shares) + (pricePerShare * sharesNum)) / newShares;
            await prisma.position.update({
                where: { id: existingPosition.id },
                data: { shares: newShares, avgPrice: newAvgPrice },
            });
        } else {
            await prisma.position.create({
                data: {
                    marketId: market.id,
                    userAddress: buyer.toLowerCase(),
                    outcome,
                    shares: sharesNum,
                    avgPrice: pricePerShare,
                },
            });
        }

        console.log(`  📝 Recorded trade & position for ${buyer.substring(0, 10)}`);
    });

    contract.on("MarketResolved", async (outcomeResult, timestamp) => {
        console.log(`  ⚖️  Market ${marketAddress.substring(0, 10)}... resolved: ${outcomeResult ? "YES" : "NO"}`);

        await prisma.market.update({
            where: { address: marketAddress },
            data: { resolved: true, outcome: outcomeResult },
        });
    });
}

async function updateAllPrices(provider: ethers.JsonRpcProvider) {
    try {
        const markets = await prisma.market.findMany({ where: { resolved: false } });

        for (const market of markets) {
            try {
                // Skip placeholder/seed addresses — only poll real deployed contracts
                if (market.address.match(/^0x0{10,}/)) continue;

                const contract = new ethers.Contract(market.address, MARKET_ABI, provider);
                const [yesPrice, noPrice, totalVolume] = await Promise.all([
                    contract.getYesPrice(),
                    contract.getNoPrice(),
                    contract.totalVolume(),
                ]);

                const yesPriceNum = Number(yesPrice) / 10000;
                const noPriceNum = Number(noPrice) / 10000;
                const volumeNum = Number(totalVolume) / 1e6;

                await prisma.market.update({
                    where: { id: market.id },
                    data: { yesPrice: yesPriceNum, noPrice: noPriceNum, volume: volumeNum },
                });
            } catch {
                // Skip individual market errors
            }
        }
    } catch (error) {
        console.error("Error updating prices:", error);
    }
}
