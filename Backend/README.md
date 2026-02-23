# Backend

Express.js REST API for the Futura prediction market platform. Provides market data, portfolio tracking, trade recording, and on-chain event indexing.

---

## Tech Stack

- **Express 5** — HTTP server
- **Prisma ORM** — Database access (SQLite)
- **ethers 6** — Blockchain interaction
- **tsx** — TypeScript execution (dev mode)

---

## Setup

```bash
cd Backend
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
RPC_URL=https://rpc-testnet.qubetics.work/
FACTORY_ADDRESS=0x...    # MarketFactory address from deployment
TOKEN_ADDRESS=0x...      # TestToken address from deployment
PORT=4000
```

> Get `FACTORY_ADDRESS` and `TOKEN_ADDRESS` from the Smart Contracts deployment output.

### Initialize the Database

```bash
npx prisma db push
```

### Seed Markets from On-Chain Data

```bash
npm run seed
```

This reads all markets from the `MarketFactory` contract and inserts them into the database.

---

## Running

### Development (with hot reload)

```bash
npm run dev
```

Server starts on `http://localhost:4000`.

### Production

```bash
npm run build
npm start
```

---

## Available Scripts

| Script          | Command               | Description                          |
|-----------------|-----------------------|--------------------------------------|
| `npm run dev`   | `tsx watch src/index.ts` | Start dev server with hot reload  |
| `npm run seed`  | `tsx src/seed.ts`     | Seed database from blockchain        |
| `npm run build` | `tsc`                 | Compile TypeScript                   |
| `npm start`     | `node dist/index.js`  | Run compiled production build        |
| `npm run db:push` | `prisma db push`   | Push schema changes to database      |
| `npm run db:studio` | `prisma studio`  | Open Prisma Studio GUI (port 5555)   |

---

## API Endpoints

### Markets

| Method | Endpoint             | Description                  |
|--------|----------------------|------------------------------|
| GET    | `/api/markets`       | List all markets             |
| GET    | `/api/markets/:id`   | Get market by ID             |

### Portfolio

| Method | Endpoint                  | Description                         |
|--------|---------------------------|-------------------------------------|
| GET    | `/api/portfolio/:address` | Get user positions + portfolio stats|

### Trades

| Method | Endpoint       | Description                      |
|--------|----------------|----------------------------------|
| GET    | `/api/trades`  | Get trade history (query by user)|
| POST   | `/api/trades`  | Record a new buy/sell trade      |

#### POST `/api/trades` Body

```json
{
  "marketId": 1,
  "walletAddress": "0x...",
  "outcome": "YES",
  "action": "BUY",
  "shares": 10.5,
  "price": 0.65,
  "txHash": "0x..."
}
```

---

## Event Indexer

The backend includes an on-chain event indexer (`src/services/indexer.ts`) that listens for smart contract events and syncs market state automatically.

---

## Database

Uses **SQLite** via Prisma. The database file is stored at `prisma/dev.db`.

To inspect the database:

```bash
npx prisma studio
```

Opens a web GUI at `http://localhost:5555`.
