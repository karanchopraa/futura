# Smart Contracts

Solidity smart contracts for the Futura prediction market platform, deployed to the **Qubetics Testnet** using Hardhat.

---

## Contracts

| Contract           | Description                                                    |
|--------------------|----------------------------------------------------------------|
| `TestToken.sol`    | ERC-20 mock USDC (tUSDC) with 6 decimals. Free minting for testnet |
| `MarketFactory.sol`| Factory that deploys individual `Market` contracts             |
| `Market.sol`       | Individual prediction market with CPMM pricing, buy/sell, and resolution |

### Market.sol Features
- **CPMM (Constant Product Market Maker)** for automated price discovery
- **Buy & Sell** Yes/No outcome shares
- **Trading Fee** configurable per market (basis points)
- **Resolution** by market creator (resolves to Yes or No)
- **Claim Winnings** after resolution
- **Safeguards** — prevents selling more shares than owned

---

## Setup

```bash
cd "Smart Contracts"
npm install
```

## Environment Variables

Create a `.env` file:

```env
DEPLOYER_PRIVATE_KEY=<your_private_key>
RPC_URL=https://rpc-testnet.qubetics.work/
```

> ⚠️ Never commit your private key. The `.env` file is gitignored.

---

## Commands

### Compile Contracts

```bash
npx hardhat compile
```

### Deploy to Qubetics Testnet

```bash
npx hardhat run scripts/deploy.ts --network qubetics
```

The deploy script will:
1. Deploy `TestToken` (mock tUSDC)
2. Deploy `MarketFactory`
3. Approve tUSDC spending for seed liquidity
4. Create 6 seed prediction markets
5. Write all addresses to `deployment.json`

**Save the addresses** from the output — you'll need them for the Backend and Frontend `.env` files.

### Run Local Hardhat Node

```bash
npx hardhat node
```

### Deploy Locally

```bash
npx hardhat run scripts/deploy.ts --network hardhat
```

### Open Hardhat Console

```bash
npx hardhat console --network qubetics
```

---

## Deployment Output

After running the deploy script, a `deployment.json` file is created with:

```json
{
  "network": "qubetics-testnet",
  "chainId": 9029,
  "contracts": {
    "testToken": "0x...",
    "marketFactory": "0x..."
  },
  "markets": [
    { "address": "0x...", "question": "...", "category": "..." }
  ]
}
```

---

## Network Configuration

| Field         | Value                                   |
|---------------|-----------------------------------------|
| Network Name  | Qubetics Testnet                       |
| RPC URL       | `https://rpc-testnet.qubetics.work/`   |
| Chain ID      | `9029`                                 |
| Currency      | `TICS`                                 |
