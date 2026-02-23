"use client";

import { ExternalLink } from "lucide-react";
import type { Trade } from "@/lib/api";

interface TransactionHistoryProps {
    trades: Trade[];
    loading: boolean;
}

export default function TransactionHistory({ trades, loading }: TransactionHistoryProps) {
    if (loading) {
        return (
            <div className="portfolio-card glass-panel">
                <h2 className="portfolio-card-title">Transaction History</h2>
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    Loading transactions...
                </div>
            </div>
        );
    }

    const getActionLabel = (action: string) => {
        const map: Record<string, string> = {
            BUY_YES: "Buy Yes",
            BUY_NO: "Buy No",
            SELL_YES: "Sell Yes",
            SELL_NO: "Sell No",
            CLAIM: "Claim",
            DEPOSIT: "Deposit",
        };
        return map[action] || action;
    };

    const getActionClass = (action: string) => {
        if (action.startsWith("BUY")) return "tx-buy";
        if (action.startsWith("SELL")) return "tx-sell";
        if (action === "DEPOSIT") return "tx-deposit";
        return "tx-buy";
    };

    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return `Today, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const shortenHash = (hash: string) => `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;

    const explorerBaseUrl = "https://explorer-testnet.qubetics.work/tx/";

    return (
        <div className="portfolio-card glass-panel">
            <h2 className="portfolio-card-title">Transaction History</h2>

            {trades.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    No transactions yet.
                </div>
            ) : (
                <table className="tx-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Market / Asset</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Txn Hash</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map((tx) => (
                            <tr key={tx.id}>
                                <td>
                                    <span className={`tx-type ${getActionClass(tx.action)}`}>
                                        {getActionLabel(tx.action)}
                                    </span>
                                </td>
                                <td>{tx.market?.question || "USDC"}</td>
                                <td>{formatDate(tx.timestamp)}</td>
                                <td style={{ color: tx.action.startsWith("SELL") || tx.action === "DEPOSIT" ? "var(--accent-yes)" : "var(--text-primary)" }}>
                                    {tx.action.startsWith("SELL") || tx.action === "DEPOSIT" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                                </td>
                                <td>
                                    <a
                                        href={`${explorerBaseUrl}${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="tx-hash"
                                    >
                                        {shortenHash(tx.txHash)} <ExternalLink size={12} />
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
