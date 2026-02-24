import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/portfolio/:address — wallet's active positions + total value
router.get("/:address", async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        const positions = await prisma.position.findMany({
            where: { userAddress: String(address).toLowerCase() },
            include: {
                market: {
                    select: {
                        id: true,
                        address: true,
                        question: true,
                        yesPrice: true,
                        noPrice: true,
                        resolved: true,
                        outcome: true,
                    },
                },
            },
        });

        // Calculate total value and PnL for each position
        const enrichedPositions = positions.map((pos) => {
            const currentPrice =
                pos.outcome === "YES" ? pos.market.yesPrice : pos.market.noPrice;
            const currentValue = pos.shares * (currentPrice / 100);
            const costBasis = pos.shares * (pos.avgPrice / 100);
            const pnl = currentValue - costBasis;
            const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

            return {
                ...pos,
                currentPrice,
                currentValue: Math.round(currentValue * 100) / 100,
                costBasis: Math.round(costBasis * 100) / 100,
                pnl: Math.round(pnl * 100) / 100,
                pnlPct: Math.round(pnlPct * 100) / 100,
            };
        });

        const totalValue = enrichedPositions.reduce(
            (sum, p) => sum + p.currentValue,
            0
        );

        res.json({
            address,
            totalValue: Math.round(totalValue * 100) / 100,
            positions: enrichedPositions,
        });
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        res.status(500).json({ error: "Failed to fetch portfolio" });
    }
});

// GET /api/portfolio/:address/history — transaction history
router.get("/:address/history", async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        const trades = await prisma.trade.findMany({
            where: { userAddress: String(address).toLowerCase() },
            include: {
                market: {
                    select: { question: true, address: true },
                },
            },
            orderBy: { timestamp: "desc" },
            take: 50,
        });

        res.json(trades);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// GET /api/portfolio/:address/claimable — resolved markets with claimable winnings
router.get("/:address/claimable", async (req: Request, res: Response) => {
    try {
        const { address } = req.params;

        const positions = await prisma.position.findMany({
            where: { userAddress: String(address).toLowerCase() },
            include: {
                market: true,
            },
        });

        const claimable = positions
            .filter((pos) => {
                if (!pos.market.resolved) return false;
                const isWinner =
                    (pos.market.outcome === true && pos.outcome === "YES") ||
                    (pos.market.outcome === false && pos.outcome === "NO");
                return isWinner && pos.shares > 0;
            })
            .map((pos) => ({
                marketId: pos.market.id,
                marketAddress: pos.market.address,
                question: pos.market.question,
                shares: pos.shares,
                payout: pos.shares, // 1 share = $1
            }));

        const totalClaimable = claimable.reduce((sum, c) => sum + c.payout, 0);

        res.json({ claimable, totalClaimable });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch claimable" });
    }
});

export default router;
