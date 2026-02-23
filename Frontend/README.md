# Frontend

Next.js web application for the Futura prediction market platform. Features a responsive dark-mode UI with real-time market data, trading, and portfolio management.

---

## Tech Stack

- **Next.js 16** (App Router) — React framework
- **React 19** — UI library
- **ethers 6** — Blockchain interaction
- **Privy** — Wallet authentication
- **Lightweight Charts** — TradingView-style price charts
- **Lucide React** — Icons
- **Recharts** — Data visualization

---

## Setup

```bash
cd Frontend
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_TOKEN_ADDRESS=0x...       # TestToken address from deployment
NEXT_PUBLIC_FACTORY_ADDRESS=0x...     # MarketFactory address from deployment
NEXT_PUBLIC_PRIVY_APP_ID=...          # Privy app ID (optional, for auth)
NEXT_PUBLIC_ADMIN_WALLET=0x...        # Admin wallet address (for admin panel)
```

> Get contract addresses from the Smart Contracts deployment output.

---

## Running

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

---

## Available Scripts

| Script         | Command        | Description                    |
|----------------|----------------|--------------------------------|
| `npm run dev`  | `next dev`     | Start dev server with HMR      |
| `npm run build`| `next build`   | Create production build         |
| `npm start`    | `next start`   | Serve production build          |
| `npm run lint` | `eslint`       | Run ESLint checks               |

---

## Pages

| Route              | Description                                    |
|--------------------|------------------------------------------------|
| `/`                | Home — Featured markets carousel + market grid |
| `/market/[id]`     | Market detail — Chart, order form, order book   |
| `/portfolio`       | Portfolio — Active positions, P&L, trade history|
| `/admin`           | Admin — Create & resolve markets (owner-gated) |

---

## Key Components

| Component               | Description                                      |
|--------------------------|--------------------------------------------------|
| `Navbar`                | Top navigation with wallet connect               |
| `FeaturedCarousel`      | Auto-scrolling featured markets                  |
| `MarketCard`            | Market preview card with pricing                 |
| `OrderForm`             | Buy/Sell shares with CPMM pricing                |
| `OrderBook`             | Live order book visualization                    |
| `LightweightChart`      | TradingView-style price chart                    |
| `ActivePositions`       | Portfolio positions with Sell to Close            |
| `TransactionHistory`    | Trade history table                              |
| `DepositModal`          | Token deposit flow                               |

---

## Wallet Setup

The app connects to the **Qubetics Testnet**. Add the network to MetaMask:

| Field         | Value                                   |
|---------------|-----------------------------------------|
| Network Name  | Qubetics Testnet                       |
| RPC URL       | `https://rpc-testnet.qubetics.work/`   |
| Chain ID      | `9029`                                 |
| Currency      | `TICS`                                 |
