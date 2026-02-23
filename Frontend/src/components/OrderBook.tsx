"use client";

import { useState, useEffect } from "react";

interface Trade {
    id: number;
    userAddress: string;
    action: string;
    shares: number;
    price: number;
    amount: number;
    timestamp: string;
}

interface OrderBookProps {
    yesPrice?: number;
    noPrice?: number;
    marketId?: number;
}

export default function OrderBook({ yesPrice = 50, noPrice = 50, marketId }: OrderBookProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const mid = yesPrice;

    // Fetch real trades for this market
    useEffect(() => {
        if (!marketId) return;

        const loadTrades = async () => {
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                const res = await fetch(`${API_BASE}/markets/${marketId}/trades`);
                if (res.ok) {
                    const data = await res.json();
                    setTrades(data);
                }
            } catch (err) {
                console.warn("Failed to load trades:", err);
            }
        };

        loadTrades();
        const interval = setInterval(loadTrades, 10_000); // Refresh every 10s
        return () => clearInterval(interval);
    }, [marketId]);

    // Generate simulated depth levels around current price
    const generateAsks = () => {
        const asks = [];
        for (let i = 1; i <= 5; i++) {
            const price = Math.min(99, mid + i * 2);
            const size = Math.floor(500 + (5 - i) * 2000);
            asks.push({ price: price.toFixed(1), size: size.toLocaleString(), total: `$${((price / 100) * size).toFixed(2)}`, rawSize: size });
        }
        return asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    };

    const generateBids = () => {
        const bids = [];
        for (let i = 1; i <= 5; i++) {
            const price = Math.max(1, mid - i * 2);
            const size = Math.floor(500 + (5 - i) * 2000);
            bids.push({ price: price.toFixed(1), size: size.toLocaleString(), total: `$${((price / 100) * size).toFixed(2)}`, rawSize: size });
        }
        return bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    };

    const asks = generateAsks();
    const bids = generateBids();
    const spread = asks.length > 0 && bids.length > 0
        ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(1)
        : "0.0";
    const maxSize = Math.max(...asks.map(a => a.rawSize), ...bids.map(b => b.rawSize));

    return (
        <div className="orderbook-container glass-panel mt-4">
            <div className="orderbook-header">
                <h3>Order Book</h3>
                <span className="text-secondary">Spread: {spread}¢</span>
            </div>

            <div className="orderbook-table">
                <div className="orderbook-row header-row">
                    <span>Price (¢)</span>
                    <span>Size</span>
                    <span style={{ textAlign: 'right' }}>Total ($)</span>
                </div>

                {/* Asks (Sell side) */}
                <div className="orderbook-asks">
                    {asks.slice().reverse().map((ask, i) => (
                        <div className="orderbook-row ask-row" key={`ask-${i}`}>
                            <div className="depth-bar ask-depth" style={{ width: `${(ask.rawSize / maxSize) * 100}%` }} />
                            <span className="price-ask">{ask.price}</span>
                            <span>{ask.size}</span>
                            <span style={{ textAlign: 'right' }}>{ask.total}</span>
                        </div>
                    ))}
                </div>

                <div className="orderbook-spread">
                    <span className="current-price">{mid.toFixed(1)}¢</span>
                    <span className="text-secondary">Mark Price</span>
                </div>

                {/* Bids (Buy side) */}
                <div className="orderbook-bids">
                    {bids.map((bid, i) => (
                        <div className="orderbook-row bid-row" key={`bid-${i}`}>
                            <div className="depth-bar bid-depth" style={{ width: `${(bid.rawSize / maxSize) * 100}%` }} />
                            <span className="price-bid">{bid.price}</span>
                            <span>{bid.size}</span>
                            <span style={{ textAlign: 'right' }}>{bid.total}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Trades Section */}
            <div className="orderbook-trades" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Recent Trades</h4>
                    {trades.length > 0 && (
                        <span className="text-secondary" style={{ fontSize: '0.7rem' }}>
                            Live
                            <span style={{
                                display: 'inline-block', width: '6px', height: '6px',
                                borderRadius: '50%', background: '#00c853', marginLeft: '4px',
                                verticalAlign: 'middle', animation: 'pulse 2s infinite'
                            }} />
                        </span>
                    )}
                </div>

                {trades.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        No trades yet — be the first!
                    </div>
                ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <div className="orderbook-row header-row" style={{ fontSize: '0.7rem' }}>
                            <span>Side</span>
                            <span>Amount</span>
                            <span style={{ textAlign: 'right' }}>Trader</span>
                        </div>
                        {trades.map((trade) => (
                            <div
                                className="orderbook-row"
                                key={trade.id}
                                style={{
                                    fontSize: '0.8rem',
                                    padding: '0.35rem 0.5rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                }}
                            >
                                <span style={{
                                    color: trade.action.includes("YES") ? 'var(--accent-yes)' : 'var(--accent-no)',
                                    fontWeight: 600,
                                }}>
                                    {trade.action.includes("YES") ? "YES" : "NO"}
                                </span>
                                <span style={{ color: 'var(--text-primary)' }}>
                                    ${trade.amount.toFixed(2)}
                                </span>
                                <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                    {trade.userAddress.substring(0, 6)}...{trade.userAddress.substring(trade.userAddress.length - 4)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
