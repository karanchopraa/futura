import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import NodeCache from "node-cache";

const router = Router();
const prisma = new PrismaClient();
const cache = new NodeCache({ stdTTL: 30 }); // 30 seconds cache

// GET /api/markets — list all markets
router.get("/", async (req: Request, res: Response) => {
    try {
        const { category, sort, limit } = req.query;
        // Generate a cache key based on query params
        const cacheKey = `markets_${category || 'all'}_${sort || 'default'}_${limit || '50'}`;
        const cachedMarkets = cache.get(cacheKey);

        if (cachedMarkets) {
            return res.json(cachedMarkets);
        }

        const where: any = {};
        if (category && category !== "all" && category !== "trending") {
            where.category = category as string;
        }

        let orderBy: any = [{ volume: "desc" }, { createdAt: "desc" }];
        if (sort === "newest") orderBy = { createdAt: "desc" };
        if (sort === "volume") orderBy = [{ volume: "desc" }, { createdAt: "desc" }];

        const markets = await prisma.market.findMany({
            where,
            orderBy,
            take: limit ? parseInt(limit as string) : 50,
        });

        cache.set(cacheKey, markets);
        res.json(markets);
    } catch (error) {
        console.error("Error fetching markets:", error);
        res.status(500).json({ error: "Failed to fetch markets" });
    }
});

// GET /api/markets/featured — top 3 for carousel
router.get("/featured", async (_req: Request, res: Response) => {
    try {
        const cachedFeatured = cache.get("markets_featured");
        if (cachedFeatured) {
            return res.json(cachedFeatured);
        }

        const markets = await prisma.market.findMany({
            orderBy: { volume: "desc" },
            take: 3,
        });

        cache.set("markets_featured", markets);
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch featured markets" });
    }
});

// GET /api/markets/search — search by query
router.get("/search", async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q) return res.json([]);

        const markets = await prisma.market.findMany({
            where: {
                question: { contains: q as string },
            },
            take: 10,
        });
        res.json(markets);
    } catch (error) {
        res.status(500).json({ error: "Failed to search markets" });
    }
});

// GET /api/markets/:id — single market detail
router.get("/:id", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        // Support both numeric ID and contract address
        const numId = parseInt(id);
        if (!id.startsWith("0x") && isNaN(numId)) {
            return res.status(400).json({ error: "Invalid market ID" });
        }
        const where = id.startsWith("0x")
            ? { address: id }
            : { id: numId };

        const market = await prisma.market.findFirst({
            where,
            include: {
                priceHistory: {
                    orderBy: { timestamp: "asc" },
                    take: 200,
                },
            },
        });

        if (!market) {
            return res.status(404).json({ error: "Market not found" });
        }

        // Get unique traders count
        const tradersRaw = await prisma.trade.findMany({
            where: { marketId: market.id },
            select: { userAddress: true },
            distinct: ['userAddress'],
        });
        const tradersCount = tradersRaw.length;

        // Return combined data
        res.json({ ...market, tradersCount });
    } catch (error) {
        console.error("Error fetching market:", error);
        res.status(500).json({ error: "Failed to fetch market" });
    }
});

// GET /api/markets/:id/trades — recent trades for a market
router.get("/:id/trades", async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const numId = parseInt(id);
        if (isNaN(numId)) {
            return res.status(400).json({ error: "Invalid market ID" });
        }

        const trades = await prisma.trade.findMany({
            where: { marketId: numId },
            orderBy: { timestamp: "desc" },
            take: 20,
        });

        res.json(trades);
    } catch (error) {
        console.error("Error fetching market trades:", error);
        res.status(500).json({ error: "Failed to fetch trades" });
    }
});

export default router;
