import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import marketsRouter from "./routes/markets";
import portfolioRouter from "./routes/portfolio";
import tradesRouter from "./routes/trades";
import { startIndexer } from "./services/indexer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/markets", marketsRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/trades", tradesRouter);

// Health check
app.get("/api/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Futura Backend running on http://localhost:${PORT}`);

    // Start the blockchain event indexer
    if (process.env.FACTORY_ADDRESS) {
        startIndexer().catch(console.error);
    } else {
        console.log("⚠️  No FACTORY_ADDRESS set — indexer skipped. Seed data available.");
    }
});

export default app;
