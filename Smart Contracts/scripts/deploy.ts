import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "TICS");

    // 1. Deploy TestToken (mock USDC)
    console.log("\n--- Deploying TestToken ---");
    const TestToken = await ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy();
    await testToken.waitForDeployment();
    const tokenAddress = await testToken.getAddress();
    console.log("TestToken deployed to:", tokenAddress);

    // 2. Deploy MarketFactory
    console.log("\n--- Deploying MarketFactory ---");
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const factory = await MarketFactory.deploy(tokenAddress);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("MarketFactory deployed to:", factoryAddress);

    // 3. Approve factory to spend deployer's tUSDC for market creation
    const SEED_LIQUIDITY = 10_000n * 10n ** 6n; // 10,000 tUSDC per market
    const TOTAL_APPROVAL = SEED_LIQUIDITY * 6n;  // For 6 markets
    console.log("\n--- Approving tUSDC for factory ---");
    const approveTx = await testToken.approve(factoryAddress, TOTAL_APPROVAL);
    await approveTx.wait();
    console.log("Approved", ethers.formatUnits(TOTAL_APPROVAL, 6), "tUSDC");

    // 4. Seed initial markets matching the frontend mock data
    const markets = [
        {
            question: "Will Bitcoin hit $100k in 2026?",
            description: "This market resolves to 'Yes' if the price of Bitcoin (BTC/USD) reaches or exceeds $100,000 on any major exchange before Dec 31, 2026.",
            category: "crypto",
            resolutionDate: Math.floor(new Date("2026-12-31").getTime() / 1000),
        },
        {
            question: "Who will win the 2028 US Presidential Election?",
            description: "This market resolves to 'Yes' if the Democratic Party candidate wins the 2028 US Presidential Election.",
            category: "politics",
            resolutionDate: Math.floor(new Date("2028-11-10").getTime() / 1000),
        },
        {
            question: "Will SpaceX land humans on Mars by 2030?",
            description: "Resolves to 'Yes' if humans successfully touch down on the Martian surface as part of a SpaceX mission before Dec 31, 2030.",
            category: "tech",
            resolutionDate: Math.floor(new Date("2030-12-31").getTime() / 1000),
        },
        {
            question: "Will GTA VI win Game of the Year?",
            description: "Resolves to 'Yes' if Grand Theft Auto VI wins 'Game of the Year' at The Game Awards in its release year.",
            category: "pop",
            resolutionDate: Math.floor(new Date("2026-12-15").getTime() / 1000),
        },
        {
            question: "Will Ethereum flip Bitcoin in Market Cap?",
            description: "Resolves to 'Yes' if Ethereum's total market capitalization exceeds Bitcoin's on CoinGecko for at least 24 consecutive hours before Dec 31, 2027.",
            category: "crypto",
            resolutionDate: Math.floor(new Date("2027-12-31").getTime() / 1000),
        },
        {
            question: "Will Artificial General Intelligence (AGI) be achieved by 2027?",
            description: "This market resolves to 'Yes' if OpenAI, Google, or Anthropic publicly announce the successful creation of an AGI system before Jan 1, 2028.",
            category: "tech",
            resolutionDate: Math.floor(new Date("2028-01-01").getTime() / 1000),
        },
    ];

    console.log("\n--- Creating seed markets ---");
    const deployedMarkets: string[] = [];

    for (let i = 0; i < markets.length; i++) {
        const m = markets[i];
        console.log(`  Creating market ${i + 1}: "${m.question.substring(0, 50)}..."`);

        const tx = await factory.createMarket(
            m.question,
            m.description,
            m.category,
            m.resolutionDate,
            SEED_LIQUIDITY,
            200 // 2% default fee
        );
        const receipt = await tx.wait();

        // Extract market address from event
        const event = receipt?.logs.find((log: any) => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed?.name === "MarketCreated";
            } catch { return false; }
        });

        if (event) {
            const parsed = factory.interface.parseLog(event);
            const marketAddr = parsed?.args[0];
            deployedMarkets.push(marketAddr);
            console.log(`  ✓ Market deployed at: ${marketAddr}`);
        }
    }

    // 5. Summary
    console.log("\n========================================");
    console.log("DEPLOYMENT COMPLETE");
    console.log("========================================");
    console.log("TestToken:", tokenAddress);
    console.log("MarketFactory:", factoryAddress);
    console.log("Markets deployed:", deployedMarkets.length);
    deployedMarkets.forEach((addr, i) => {
        console.log(`  Market ${i}: ${addr}`);
    });
    console.log("========================================");

    // Write deployment info to a JSON file for backend consumption
    const fs = require("fs");
    const deploymentInfo = {
        network: "qubetics-testnet",
        chainId: 9029,
        rpc: "https://rpc-testnet.qubetics.work/",
        contracts: {
            testToken: tokenAddress,
            marketFactory: factoryAddress,
        },
        markets: deployedMarkets.map((addr, i) => ({
            address: addr,
            question: markets[i].question,
            category: markets[i].category,
        })),
        deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
        "deployment.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("\nDeployment info written to deployment.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
