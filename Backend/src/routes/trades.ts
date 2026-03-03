import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// POST /api/trades — record a trade (called by indexer or after on-chain tx)
router.post("/", async (req: Request, res: Response) => {
    try {
        const {
            marketAddress,
            userAddress,
            action,
            shares,
            price,
            amount,
            txHash,
        } = req.body;

        // Find the market
        const market = await prisma.market.findUnique({
            where: { address: marketAddress },
        });

        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }

        // Create the trade
        const trade = await prisma.trade.create({
            data: {
                marketId: market.id,
                userAddress: userAddress.toLowerCase(),
                action,
                shares,
                price,
                amount,
                txHash,
            },
        });

        // Update or create position
        const outcome = action.includes("YES") ? "YES" : "NO";
        const isBuy = action.startsWith("BUY");

        if (isBuy) {
            // For BUY trades, update position eagerly for faster UX.
            // The indexer will skip due to duplicate txHash (P2002).
            const existingPosition = await prisma.position.findUnique({
                where: {
                    marketId_userAddress_outcome: {
                        marketId: market.id,
                        userAddress: userAddress.toLowerCase(),
                        outcome,
                    },
                },
            });

            if (existingPosition) {
                // Weighted average price
                const totalShares = existingPosition.shares + shares;
                const totalCost =
                    existingPosition.shares * existingPosition.avgPrice + shares * price;
                const newAvgPrice = totalCost / totalShares;

                await prisma.position.update({
                    where: { id: existingPosition.id },
                    data: {
                        shares: totalShares,
                        avgPrice: newAvgPrice,
                    },
                });
            } else {
                await prisma.position.create({
                    data: {
                        marketId: market.id,
                        userAddress: userAddress.toLowerCase(),
                        outcome,
                        shares,
                        avgPrice: price,
                    },
                });
            }
        }
        // For SELL trades, do NOT mutate positions here.
        // The backend indexer's SharesSold event listener handles position
        // deduction with accurate on-chain data, preventing double-deduction
        // and ensuring the correct payout values are used.

        // Update market volume
        await prisma.market.update({
            where: { id: market.id },
            data: {
                volume: { increment: amount },
            },
        });

        res.status(201).json(trade);
    } catch (error: any) {
        // Handle duplicate txHash gracefully
        if (error.code === "P2002") {
            return res.status(409).json({ error: "Trade already recorded" });
        }
        console.error("Error recording trade:", error);
        res.status(500).json({ error: "Failed to record trade" });
    }
});

export default router;
