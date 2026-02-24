import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Market Matching Engine (CPMM) Regression Tests", function () {
    let testToken: any;
    let market: any;
    let owner: SignerWithAddress;
    let factoryAuth: SignerWithAddress; // Mock factory
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;

    const INITIAL_LIQUIDITY = ethers.parseUnits("1000", 6); // $1000 liquidity
    const TRADING_FEE = 200; // 2% fee

    beforeEach(async function () {
        [owner, factoryAuth, alice, bob] = await ethers.getSigners();

        // Deploy TestToken
        const TestToken = await ethers.getContractFactory("TestToken");
        testToken = await TestToken.deploy();
        await testToken.waitForDeployment();

        // Deploy Market contract (Factory is traditionally the deployer, so factoryAuth will deploy it)
        const resolutionDate = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days from now

        const Market = await ethers.getContractFactory("Market", factoryAuth);
        market = await Market.deploy(
            "Will Ethereum hit 10k?",
            "Description",
            "crypto",
            resolutionDate,
            await testToken.getAddress(),
            owner.address,
            TRADING_FEE
        );
        await market.waitForDeployment();

        // Mint tokens to factoryAuth, Alice, and Bob
        await testToken.connect(factoryAuth).mint(INITIAL_LIQUIDITY);
        await testToken.connect(alice).mint(ethers.parseUnits("1000", 6));
        await testToken.connect(bob).mint(ethers.parseUnits("1000", 6));

        // Approve tokens
        await testToken.connect(factoryAuth).approve(await market.getAddress(), INITIAL_LIQUIDITY);
        await testToken.connect(alice).approve(await market.getAddress(), ethers.MaxUint256);
        await testToken.connect(bob).approve(await market.getAddress(), ethers.MaxUint256);

        // Initialize Pool via factoryAuth
        await testToken.connect(factoryAuth).transfer(await market.getAddress(), INITIAL_LIQUIDITY);
        await market.connect(factoryAuth).initializePool(INITIAL_LIQUIDITY);
    });

    describe("Initialization", function () {
        it("should initialize pools with 50/50 liquidity", async function () {
            expect(await market.yesPool()).to.equal(INITIAL_LIQUIDITY / 2n);
            expect(await market.noPool()).to.equal(INITIAL_LIQUIDITY / 2n);
        });

        it("should set initial prices to 50c", async function () {
            expect(await market.getYesPrice()).to.equal(500000n); // 50c
            expect(await market.getNoPrice()).to.equal(500000n);  // 50c
        });
    });

    describe("Order Execution (Buying)", function () {
        it("should allow Alice to buy YES shares and update AMM state correctly", async function () {
            const amount = ethers.parseUnits("100", 6);

            // Expected math:
            // Fee = 100 * 2% = 2
            // Net Amount = 98
            // Original Pool: Y=500, N=500, K=250000
            // New Y = 500 + 98 = 598
            // New N = 250000 / 598 = 418.0602...
            // Shares given = 500 - 418.06... = 81.939...

            await market.connect(alice).buyYes(amount);

            const yesPool = await market.yesPool();
            const noPool = await market.noPool();

            expect(yesPool).to.equal(ethers.parseUnits("598", 6));
            expect(await market.feePool()).to.equal(ethers.parseUnits("2", 6));

            const aliceShares = await market.yesShares(alice.address);
            expect(aliceShares).to.be.gt(0);

            // Yes price should increase, No price should decrease
            expect(await market.getYesPrice()).to.be.gt(500000n);
            expect(await market.getNoPrice()).to.be.lt(500000n);
        });

        it("should allow Bob to buy NO shares and update AMM state correctly", async function () {
            const amount = ethers.parseUnits("50", 6);
            await market.connect(bob).buyNo(amount);

            const bobShares = await market.noShares(bob.address);
            expect(bobShares).to.be.gt(0);

            // No price should increase, Yes price should decrease
            expect(await market.getNoPrice()).to.be.gt(500000n);
            expect(await market.getYesPrice()).to.be.lt(500000n);
        });
    });

    describe("Order Execution (Selling)", function () {
        it("should allow Alice to sell YES shares back to the pool", async function () {
            const amount = ethers.parseUnits("100", 6);
            await market.connect(alice).buyYes(amount);

            const aliceSharesPre = await market.yesShares(alice.address);
            const tokenBalPre = await testToken.balanceOf(alice.address);

            // Sell all shares
            await market.connect(alice).sellYes(aliceSharesPre);

            const aliceSharesPost = await market.yesShares(alice.address);
            const tokenBalPost = await testToken.balanceOf(alice.address);

            expect(aliceSharesPost).to.equal(0n);
            expect(tokenBalPost).to.be.gt(tokenBalPre); // Alice got tUSDC back

            // Prices should revert slightly towards 50c (minus fees impact)
            const yesPrice = await market.getYesPrice();
            expect(yesPrice).to.be.closeTo(500000n, 10000); // within 1c
        });

        it("should allow Bob to sell NO shares back to the pool", async function () {
            const amount = ethers.parseUnits("100", 6);
            await market.connect(bob).buyNo(amount);

            const bobSharesPre = await market.noShares(bob.address);
            await market.connect(bob).sellNo(bobSharesPre);

            expect(await market.noShares(bob.address)).to.equal(0n);
        });
    });

    describe("AMM Constraints & Regression Vectors", function () {
        it("should revert if trade would drain the pool (MIN_POOL_SIZE violation)", async function () {
            // Give Alice 1B tokens to try and drain the pool below 0.001 tUSDC
            const hugeAmount = ethers.parseUnits("1000000000", 6);
            await testToken.connect(alice).mint(hugeAmount);
            await testToken.connect(alice).approve(await market.getAddress(), hugeAmount);

            // Attempting to buy enough YES to drain the NO pool below MIN_POOL_SIZE
            await expect(
                market.connect(alice).buyYes(hugeAmount)
            ).to.be.revertedWith("Trade too large: pool drain");
        });

        it("should maintain constant product invariant K (excluding fees)", async function () {
            const kStart = (await market.yesPool()) * (await market.noPool());

            await market.connect(alice).buyYes(ethers.parseUnits("100", 6));

            const kEnd = (await market.yesPool()) * (await market.noPool());

            // K decreases very slightly due to integer division truncation in solidity: newNoPool = k / newYesPool
            // But it stays fundamentally stable
            expect(kStart - kEnd).to.be.lt(1000000000n); // Small diff
        });

        it("should update totalOutstandingShares correctly on buy/sell", async function () {
            expect(await market.totalSharesIssued()).to.equal(0n);

            await market.connect(alice).buyYes(ethers.parseUnits("50", 6));
            const shares1 = await market.yesShares(alice.address);
            expect(await market.totalSharesIssued()).to.equal(shares1);

            await market.connect(bob).buyNo(ethers.parseUnits("50", 6));
            const shares2 = await market.noShares(bob.address);
            expect(await market.totalSharesIssued()).to.equal(shares1 + shares2);

            await market.connect(alice).sellYes(shares1);
            expect(await market.totalSharesIssued()).to.equal(shares2);
        });
    });
});
