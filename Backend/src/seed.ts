import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
    console.log("🌱 Seeding database...");

    // Safety check: if there are already real on-chain markets indexed, skip seeding
    // to avoid wiping blockchain-indexed data with fake placeholder markets.
    const existingCount = await prisma.market.count();
    if (existingCount > 0) {
        console.log(`⚠️  Database already has ${existingCount} markets (likely indexed from blockchain).`);
        console.log("   Skipping seed to avoid overwriting real data.");
        console.log("   To force re-seed, manually run: npx prisma db push --force-reset");
        return;
    }

    // Clear existing data
    await prisma.priceHistory.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.position.deleteMany();
    await prisma.market.deleteMany();

    const markets = [
        {
            address: "0x77580D6a447351ffcC892fA08570d840305EE90C",
            question: "Will Bitcoin hit $100k in 2026?",
            description: "This market resolves to 'Yes' if the price of Bitcoin (BTC/USD) reaches or exceeds $100,000 on any major exchange before Dec 31, 2026.",
            category: "crypto",
            volume: 42500000,
            yesPrice: 78,
            noPrice: 22,
            resolutionDate: new Date("2026-12-31"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
        {
            address: "0x09F769D4Ec3D0CEC09EcD40967eace2559adf872",
            question: "Who will win the 2028 US Presidential Election?",
            description: "This market resolves to 'Yes' if the Democratic Party candidate wins the 2028 US Presidential Election.",
            category: "politics",
            volume: 105000000,
            yesPrice: 51,
            noPrice: 49,
            resolutionDate: new Date("2028-11-10"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
        {
            address: "0x5D419D4766b92ae9FEd05dC918f2Ce3Bc277a4A3",
            question: "Will SpaceX land humans on Mars by 2030?",
            description: "Resolves to 'Yes' if humans successfully touch down on the Martian surface as part of a SpaceX mission before Dec 31, 2030.",
            category: "tech",
            volume: 18200000,
            yesPrice: 42,
            noPrice: 58,
            resolutionDate: new Date("2030-12-31"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
        {
            address: "0x29c02588b3F01430c5Db0e905318b7bDFE73526e",
            question: "Will GTA VI win Game of the Year?",
            description: "Resolves to 'Yes' if Grand Theft Auto VI wins 'Game of the Year' at The Game Awards in its release year.",
            category: "pop",
            volume: 5100000,
            yesPrice: 89,
            noPrice: 11,
            resolutionDate: new Date("2026-12-15"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
        {
            address: "0x46ed0d17604DB3d527D2276DD18DD7623D5080e7",
            question: "Will Ethereum flip Bitcoin in Market Cap?",
            description: "Resolves to 'Yes' if Ethereum's total market capitalization exceeds Bitcoin's on CoinGecko for at least 24 consecutive hours before Dec 31, 2027.",
            category: "crypto",
            volume: 31900000,
            yesPrice: 15,
            noPrice: 85,
            resolutionDate: new Date("2027-12-31"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
        {
            address: "0x0De15Fe48fD1F7c3d5DB5112C001f4D90f933987",
            question: "Will Artificial General Intelligence (AGI) be achieved by 2027?",
            description: "This market resolves to 'Yes' if OpenAI, Google, or Anthropic publicly announce the successful creation of an AGI system before Jan 1, 2028.",
            category: "tech",
            volume: 14200000,
            yesPrice: 34,
            noPrice: 66,
            resolutionDate: new Date("2028-01-01"),
            oracle: "0x0000000000000000000000000000000000000000",
        },
    ];

    for (const m of markets) {
        const market = await prisma.market.create({ data: m });

        // Generate mock price history (30 data points over 30 days)
        const now = Date.now();
        let yesPrice = m.yesPrice;
        for (let i = 29; i >= 0; i--) {
            const drift = (Math.random() - 0.5) * 4;
            yesPrice = Math.max(5, Math.min(95, yesPrice + drift));
            await prisma.priceHistory.create({
                data: {
                    marketId: market.id,
                    yesPrice: Math.round(yesPrice * 100) / 100,
                    noPrice: Math.round((100 - yesPrice) * 100) / 100,
                    timestamp: new Date(now - i * 24 * 60 * 60 * 1000),
                },
            });
        }
        console.log(`  ✓ ${market.question.substring(0, 50)}...`);
    }

    // Add mock positions for a demo wallet
    const demoWallet = "0xdemo000000000000000000000000000000000001";
    const market1 = await prisma.market.findFirst({ where: { category: "tech", question: { contains: "AGI" } } });
    const market3 = await prisma.market.findFirst({ where: { question: { contains: "SpaceX" } } });

    if (market1) {
        await prisma.position.create({
            data: {
                marketId: market1.id,
                userAddress: demoWallet,
                outcome: "YES",
                shares: 250,
                avgPrice: 32,
            },
        });
    }

    if (market3) {
        await prisma.position.create({
            data: {
                marketId: market3.id,
                userAddress: demoWallet,
                outcome: "NO",
                shares: 1000,
                avgPrice: 60,
            },
        });
    }

    // Add mock trade history
    if (market1) {
        await prisma.trade.create({
            data: {
                marketId: market1.id,
                userAddress: demoWallet,
                action: "BUY_YES",
                shares: 250,
                price: 32,
                amount: 80,
                txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
            },
        });
    }

    if (market3) {
        await prisma.trade.create({
            data: {
                marketId: market3.id,
                userAddress: demoWallet,
                action: "BUY_NO",
                shares: 1000,
                price: 60,
                amount: 600,
                txHash: "0x5b4a3c2d1e0f9876fedcba0987654321fedcba0987654321fedcba0987654321",
            },
        });
    }

    console.log("\n✅ Seed complete!");
    console.log(`   ${markets.length} markets created`);
    console.log(`   ${30 * markets.length} price history points`);
    console.log(`   Demo wallet: ${demoWallet}`);
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
