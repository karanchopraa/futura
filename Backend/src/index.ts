import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import marketsRouter from "./routes/markets";
import portfolioRouter from "./routes/portfolio";
import tradesRouter from "./routes/trades";
import { startIndexer } from "./services/indexer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security and Performance Middleware
app.use(helmet());
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 200, // Limit each IP to 200 requests per 5 minutes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});
app.use("/api/", limiter);

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
