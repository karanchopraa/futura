# Futura — Prediction Market Platform

Futura is a decentralized prediction market platform built on the **Qubetics testnet**. Users can trade on real-world event outcomes using a Constant Product Market Maker (CPMM) mechanism, powered by Solidity smart contracts and a modern web frontend.

![License](https://img.shields.io/badge/license-MIT-blue)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)
![Next.js](https://img.shields.io/badge/Next.js-16-000000)
![Express](https://img.shields.io/badge/Express-5-000000)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                 │
│  React 19 · ethers 6 · Privy Auth · Lightweight Charts       │
│  Port 3000                                                   │
└──────────────┬───────────────────────────┬───────────────────┘
               │ REST API                  │ RPC (ethers.js)
               ▼                           ▼
┌──────────────────────────┐   ┌───────────────────────────────┐
│   Backend (Express 5)    │   │  Qubetics Testnet (Chain 9029)│
│  Prisma · SQLite · tsx   │   │  MarketFactory · Market        │
│  Port 4000               │   │  TestToken (tUSDC)             │
└──────────────────────────┘   └───────────────────────────────┘
```

---

## Project Structure

```
Futura/
├── Smart Contracts/     # Solidity contracts + Hardhat tooling
│   ├── contracts/       # Market.sol, MarketFactory.sol, TestToken.sol
│   └── scripts/         # deploy.ts
├── Backend/             # Express REST API + on-chain indexer
│   ├── src/routes/      # markets, portfolio, trades
│   ├── src/services/    # blockchain event indexer
│   └── prisma/          # schema + SQLite database
├── Frontend/            # Next.js web application
│   ├── src/app/         # pages (home, market/[id], portfolio, admin)
│   ├── src/components/  # reusable UI components
│   └── src/lib/         # API client, wallet, contract helpers
└── README.md            # ← you are here
```

---

## Quick Start

### Prerequisites

| Tool       | Version  |
| ---------- | -------- |
| **Node.js** | ≥ 18     |
| **npm**     | ≥ 9      |
| **MetaMask** | Latest  |

### 1. Clone the repository

```bash
git clone https://github.com/karanchopraa/futura.git
cd futura
```

### 2. Deploy Smart Contracts

```bash
cd "Smart Contracts"
npm install
cp .env.example .env          # Add your DEPLOYER_PRIVATE_KEY
npx hardhat compile
npx hardhat run scripts/deploy.ts --network qubetics
```

This outputs a `deployment.json` with all contract addresses. See [Smart Contracts README](./Smart%20Contracts/README.md) for details.

### 3. Start the Backend

```bash
cd Backend
npm install
cp .env.example .env          # Set FACTORY_ADDRESS and TOKEN_ADDRESS from deployment
npx prisma db push
npm run seed                  # Seed markets from on-chain data
npm run dev                   # Starts on http://localhost:4000
```

See [Backend README](./Backend/README.md) for details.

### 4. Start the Frontend

```bash
cd Frontend
npm install
cp .env.example .env.local    # Set contract addresses + API URL
npm run dev                   # Starts on http://localhost:3000
```

See [Frontend README](./Frontend/README.md) for details.

### 5. Configure MetaMask

Add the Qubetics Testnet to MetaMask:

| Field         | Value                                   |
|---------------|-----------------------------------------|
| Network Name  | Qubetics Testnet                       |
| RPC URL       | `https://rpc-testnet.qubetics.work/`   |
| Chain ID      | `9029`                                 |
| Currency      | `TICS`                                 |

---

## Key Features

- **CPMM Trading** — Buy & Sell Yes/No shares with automated pricing
- **Portfolio Dashboard** — Track positions, P&L, and trade history
- **Sell to Close** — Sell shares directly from portfolio or market detail
- **Admin Panel** — Create / resolve markets (owner-gated)
- **On-Chain Indexer** — Backend syncs events from the blockchain in real-time
- **Responsive Design** — Glassmorphic dark UI with micro-animations

---

## Tech Stack

| Layer            | Technology                                          |
|------------------|-----------------------------------------------------|
| Smart Contracts  | Solidity 0.8.24, Hardhat, OpenZeppelin              |
| Backend          | Express 5, Prisma ORM, SQLite, ethers 6             |
| Frontend         | Next.js 16, React 19, ethers 6, Lightweight Charts  |
| Auth             | Privy (wallet connect), MetaMask                    |
| Network          | Qubetics Testnet (Chain ID 9029)                    |

---

## License

MIT
