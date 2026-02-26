"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { safeNumber, type Position } from "@/lib/api";

interface ActivePositionsProps {
    positions: Position[];
    loading: boolean;
    onSellToClose?: (position: Position) => Promise<void>;
}

export default function ActivePositions({ positions, loading, onSellToClose }: ActivePositionsProps) {
    const [sellingId, setSellingId] = useState<number | null>(null);

    const handleSell = async (pos: Position) => {
        if (!onSellToClose || sellingId !== null) return;
        setSellingId(pos.id);
        try {
            await onSellToClose(pos);
        } finally {
            setSellingId(null);
        }
    };

    if (loading) {
        return (
            <div className="portfolio-card glass-panel">
                <h2 className="portfolio-card-title">Active Positions</h2>
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    Loading positions...
                </div>
            </div>
        );
    }

    return (
        <div className="portfolio-card glass-panel">
            <h2 className="portfolio-card-title">Active Positions</h2>

            <div className="position-list">
                {positions.filter(p => safeNumber(p.shares) > 0).length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                        No active positions. Start trading to see your positions here.
                    </div>
                ) : (
                    positions.filter(p => safeNumber(p.shares) > 0).map((pos) => {
                        const isSelling = sellingId === pos.id;
                        return (
                            <div className="position-item" key={pos.id}>
                                <div className="position-main">
                                    <h4>{pos.market.question}</h4>
                                    <div className="position-outcome">
                                        <span className={`outcome-badge ${pos.outcome === 'YES' ? 'badge-yes' : 'badge-no'}`}>
                                            {pos.outcome}
                                        </span>
                                        <span className="text-secondary">{pos.shares} Shares @ {pos.avgPrice}¢</span>
                                    </div>
                                </div>

                                <div className="position-stats">
                                    <div className="stat-col">
                                        <span className="text-secondary">Value</span>
                                        <span className="font-semibold">${safeNumber(pos.currentValue).toFixed(2)}</span>
                                    </div>
                                    <div className="stat-col align-right">
                                        <span className="text-secondary">Total Return</span>
                                        <span className={`pnl-value ${safeNumber(pos.pnl) >= 0 ? 'text-success' : 'text-danger'} flex-center gap-1`}>
                                            {safeNumber(pos.pnl) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            {safeNumber(pos.pnl) >= 0 ? '+' : ''}${safeNumber(pos.pnl).toFixed(2)} ({safeNumber(pos.pnl) >= 0 ? '+' : ''}{safeNumber(pos.pnlPct).toFixed(2)}%)
                                        </span>
                                    </div>
                                </div>

                                <div className="position-actions">
                                    <Link href={`/market/${pos.market.id}`}>
                                        <button className="button-secondary btn-sm">Trade</button>
                                    </Link>
                                    <button
                                        className="button-primary btn-sm btn-sell"
                                        onClick={() => handleSell(pos)}
                                        disabled={isSelling || sellingId !== null}
                                        style={{ opacity: isSelling ? 0.7 : 1, minWidth: '110px' }}
                                    >
                                        {isSelling ? (
                                            <span className="flex-center gap-1">
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                Selling...
                                            </span>
                                        ) : (
                                            "Sell to Close"
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
