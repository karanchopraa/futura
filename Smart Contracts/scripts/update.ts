/**
 * update.ts — Redeploy Futura smart contracts and update all env files.
 *
 * Since these contracts are not upgradeable proxies, "updating" means:
 *   1. Compile the latest Solidity code
 *   2. Deploy fresh TestToken, MarketFactory, and seed markets
 *   3. Update Backend/.env and Frontend/.env.local with new addresses
 *   4. Reset and reseed the backend database
 *
 * Usage:
 *   npx hardhat run scripts/update.ts --network qubetics
 *
 * Options (env vars):
 *   SKIP_TOKEN=true    — Reuse existing TestToken (only redeploy Factory + Markets)
 *   SKIP_SEED=true     — Skip creating seed markets
 *   SKIP_DB=true       — Skip database reset and reseed
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ─── Paths ───────────────────────────────────────────────────────────
const ROOT_DIR = path.resolve(__dirname, "../..");
const BACKEND_ENV = path.join(ROOT_DIR, "Backend", ".env");
const FRONTEND_ENV = path.join(ROOT_DIR, "Frontend", ".env.local");
const DEPLOYMENT_JSON = path.join(__dirname, "..", "deployment.json");

// ─── Helpers ─────────────────────────────────────────────────────────

function updateEnvFile(filePath: string, updates: Record<string, string>) {
    if (!fs.existsSync(filePath)) {
        // Create the file with the updates
        const content = Object.entries(updates)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n") + "\n";
        fs.writeFileSync(filePath, content);
        console.log(`  📝 Created ${path.basename(filePath)}`);
        return;
    }

    let content = fs.readFileSync(filePath, "utf-8");

    for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
            content = content.replace(regex, `${key}=${value}`);
        } else {
            content += `${key}=${value}\n`;
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`  📝 Updated ${path.basename(filePath)}`);
}

function banner(msg: string) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${msg}`);
    console.log(`${"═".repeat(60)}`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
    const [deployer] = await ethers.getSigners();
    const skipToken = process.env.SKIP_TOKEN === "true";
    const skipSeed = process.env.SKIP_SEED === "true";
    const skipDb = process.env.SKIP_DB === "true";

    banner("FUTURA — SMART CONTRACT UPDATE");
    console.log(`  Deployer:    ${deployer.address}`);
    console.log(`  Skip Token:  ${skipToken}`);
    console.log(`  Skip Seed:   ${skipSeed}`);
    console.log(`  Skip DB:     ${skipDb}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`  Balance:     ${ethers.formatEther(balance)} TICS`);

    // ── Step 1: Deploy or reuse TestToken ─────────────────────────
    let tokenAddress: string;

    if (skipToken) {
        // Read existing token address from Backend .env
        const envContent = fs.readFileSync(BACKEND_ENV, "utf-8");
        const match = envContent.match(/TOKEN_ADDRESS=(.+)/);
        if (!match) throw new Error("TOKEN_ADDRESS not found in Backend/.env");
        tokenAddress = match[1].trim();
        console.log(`\n⏭️  Reusing existing TestToken: ${tokenAddress}`);
    } else {
        console.log("\n📦 Deploying TestToken...");
        const TestToken = await ethers.getContractFactory("TestToken");
        const testToken = await TestToken.deploy();
        await testToken.waitForDeployment();
        tokenAddress = await testToken.getAddress();
        console.log(`  ✓ TestToken deployed: ${tokenAddress}`);
    }

    // ── Step 2: Deploy MarketFactory ──────────────────────────────
    console.log("\n📦 Deploying MarketFactory...");
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const factory = await MarketFactory.deploy(tokenAddress);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`  ✓ MarketFactory deployed: ${factoryAddress}`);

    // ── Step 3: Seed Markets ──────────────────────────────────────
    const deployedMarkets: Array<{ address: string; question: string; category: string }> = [];

    if (!skipSeed) {
        const SEED_LIQUIDITY = 10_000n * 10n ** 6n; // 10,000 tUSDC per market

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

        // Approve factory to spend deployer's tUSDC
        const TOTAL_APPROVAL = SEED_LIQUIDITY * BigInt(markets.length);
        const TestToken = await ethers.getContractFactory("TestToken");
        const testToken = TestToken.attach(tokenAddress);

        console.log("\n💰 Approving tUSDC for factory...");
        const approveTx = await testToken.approve(factoryAddress, TOTAL_APPROVAL);
        await approveTx.wait();
        console.log(`  ✓ Approved ${ethers.formatUnits(TOTAL_APPROVAL, 6)} tUSDC`);

        console.log("\n🏭 Creating seed markets...");
        for (let i = 0; i < markets.length; i++) {
            const m = markets[i];
            console.log(`  Creating market ${i + 1}/${markets.length}: "${m.question.substring(0, 50)}..."`);

            const tx = await factory.createMarket(
                m.question,
                m.description,
                m.category,
                m.resolutionDate,
                SEED_LIQUIDITY,
                200 // 2% fee
            );
            const receipt = await tx.wait();

            const event = receipt?.logs.find((log: any) => {
                try {
                    const parsed = factory.interface.parseLog(log);
                    return parsed?.name === "MarketCreated";
                } catch {
                    return false;
                }
            });

            if (event) {
                const parsed = factory.interface.parseLog(event);
                const marketAddr = parsed?.args[0];
                deployedMarkets.push({
                    address: marketAddr,
                    question: m.question,
                    category: m.category,
                });
                console.log(`  ✓ Market deployed: ${marketAddr}`);
            }
        }
    }

    // ── Step 4: Update .env files ─────────────────────────────────
    banner("UPDATING ENVIRONMENT FILES");

    // Backend .env
    updateEnvFile(BACKEND_ENV, {
        FACTORY_ADDRESS: `"${factoryAddress}"`,
        TOKEN_ADDRESS: `"${tokenAddress}"`,
    });

    // Frontend .env.local
    updateEnvFile(FRONTEND_ENV, {
        NEXT_PUBLIC_FACTORY_ADDRESS: factoryAddress,
        NEXT_PUBLIC_TOKEN_ADDRESS: tokenAddress,
    });

    // ── Step 5: Write deployment.json ─────────────────────────────
    const deploymentInfo = {
        network: "qubetics-testnet",
        chainId: 9029,
        rpc: "https://rpc-testnet.qubetics.work/",
        contracts: {
            testToken: tokenAddress,
            marketFactory: factoryAddress,
        },
        markets: deployedMarkets,
        deployedAt: new Date().toISOString(),
        previousDeployment: fs.existsSync(DEPLOYMENT_JSON)
            ? JSON.parse(fs.readFileSync(DEPLOYMENT_JSON, "utf-8"))
            : null,
    };

    fs.writeFileSync(DEPLOYMENT_JSON, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n  📝 Updated deployment.json`);

    // ── Step 6: Reset & reseed backend database ───────────────────
    if (!skipDb) {
        banner("RESETTING BACKEND DATABASE");
        const backendDir = path.join(ROOT_DIR, "Backend");

        try {
            console.log("  Resetting database schema...");
            execSync("npx prisma db push --force-reset --accept-data-loss", {
                cwd: backendDir,
                stdio: "inherit",
            });

            console.log("\n  Reseeding from blockchain...");
            execSync("npx tsx src/seed.ts", {
                cwd: backendDir,
                stdio: "inherit",
            });

            console.log("  ✓ Database reset and reseeded");
        } catch (error) {
            console.error("  ⚠️  Database reset failed — run manually:");
            console.error("     cd Backend && npx prisma db push --force-reset && npm run seed");
        }
    }

    // ── Summary ───────────────────────────────────────────────────
    banner("UPDATE COMPLETE");
    console.log(`  TestToken:      ${tokenAddress}`);
    console.log(`  MarketFactory:  ${factoryAddress}`);
    console.log(`  Markets:        ${deployedMarkets.length}`);
    deployedMarkets.forEach((m, i) => {
        console.log(`    ${i}: ${m.address}  "${m.question.substring(0, 40)}..."`);
    });
    console.log(`\n  Backend .env:   ✓ Updated`);
    console.log(`  Frontend .env:  ✓ Updated`);
    console.log(`  Database:       ${skipDb ? "⏭️ Skipped" : "✓ Reset & reseeded"}`);
    console.log(`\n  ⚠️  Restart your Backend and Frontend servers to pick up the new addresses.`);
    console.log(`${"═".repeat(60)}\n`);
}

main().catch((error) => {
    console.error("❌ Update failed:", error);
    process.exitCode = 1;
});
