"use client";

import { useState, useEffect, useCallback, use } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LightweightChart from "@/components/LightweightChart";
import { Link as LinkIcon, Share2 } from "lucide-react";
import OrderForm from "@/components/OrderForm";
import OrderBook from "@/components/OrderBook";
import { fetchMarket, type Market, formatVolume } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { getAddress, connectWallet } from "@/lib/wallet";
import { getUserShares } from "@/lib/contracts";

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [market, setMarket] = useState<Market | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<"1H" | "1D" | "1W" | "1M" | "ALL">("1M");
    const [userPosition, setUserPosition] = useState<{ yes: number, no: number } | null>(null);

    const loadMarket = useCallback(async () => {
        try {
            const data = await fetchMarket(id);
            setMarket(data);

            // Fetch user position if wallet is connected
            const addr = await getAddress();
            if (addr && data) {
                try {
                    const shares = await getUserShares(data.address, addr);
                    const yesShares = Number(shares.yesShares);
                    const noShares = Number(shares.noShares);
                    if (yesShares > 0 || noShares > 0) {
                        setUserPosition({ yes: yesShares, no: noShares });
                    }
                } catch (err) {
                    console.warn("Could not fetch user position:", err);
                }
            }

        } catch (error) {
            console.error("Failed to load market:", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Initial load
    useEffect(() => {
        loadMarket();
    }, [loadMarket]);

    // Auto-refresh every 15 seconds for live chart + price updates
    useEffect(() => {
        const interval = setInterval(loadMarket, 15_000);
        return () => clearInterval(interval);
    }, [loadMarket]);

    if (loading) {
        return (
            <>
                <Navbar onDepositClick={() => { }} />
                <div className="market-layout">
                    <div className="market-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Loading market...</span>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (!market) {
        return (
            <>
                <Navbar onDepositClick={() => { }} />
                <div className="market-layout">
                    <div className="market-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Market not found.</span>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    // Filter price history based on selected time range
    const filterTime = () => {
        const now = Date.now();
        switch (timeRange) {
            case "1H": return now - 60 * 60 * 1000;
            case "1D": return now - 24 * 60 * 60 * 1000;
            case "1W": return now - 7 * 24 * 60 * 60 * 1000;
            case "1M": return now - 30 * 24 * 60 * 60 * 1000;
            default: return 0; // ALL
        }
    };
    const cutoffDate = filterTime();

    // Transform price history for the chart (Unix timestamp in seconds for intra-day support)
    const rawChartData = (market.priceHistory || [])
        .filter((p) => new Date(p.timestamp).getTime() >= cutoffDate)
        .map((p) => ({
            time: Math.floor(new Date(p.timestamp).getTime() / 1000) as any, // Cast to any to satisfy lightweight-charts Time type 
            value: p.yesPrice,
        }));

    // Hack: If there's only 1 data point, duplicate it with a slightly older timestamp to draw a flat line
    const chartData = rawChartData.length === 1
        ? [
            { time: (rawChartData[0].time as number) - 60 as any, value: rawChartData[0].value },
            ...rawChartData
        ]
        : rawChartData;

    const categoryMap: Record<string, string> = {
        crypto: "Crypto",
        politics: "Politics",
        tech: "Technology",
        sports: "Sports",
        pop: "Pop Culture",
    };

    const resolutionDate = new Date(market.resolutionDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <>
            <Navbar onDepositClick={() => { }} />
            <div className="market-layout">

                {/* Left Column: Context & Charts */}
                <div className="market-main">
                    <div className="market-header-section">
                        <div className="market-tags">
                            <span className="market-tag tag-blue cursor-default" style={{ cursor: 'default' }}>Volume: ${formatVolume(market.volume)}</span>
                            {market.tradersCount !== undefined && (
                                <span className="market-tag cursor-default" style={{ border: '1px solid var(--border)', background: 'transparent', cursor: 'default' }}>
                                    {market.tradersCount} Traders
                                </span>
                            )}
                            <button
                                className="market-tag"
                                style={{ background: 'transparent', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    showToast('Link copied to clipboard!', 'success');
                                }}
                            >
                                <Share2 size={12} /> Share
                            </button>
                        </div>
                        <h1 className="market-page-title">{market.question}</h1>

                        <div className="market-stats-row">
                            <div className="stat-box yes-box">
                                <span className="stat-label">Yes</span>
                                <span className="stat-value">{Math.round(market.yesPrice)}¢</span>
                            </div>
                            <div className="stat-box no-box">
                                <span className="stat-label">No</span>
                                <span className="stat-value">{Math.round(market.noPrice)}¢</span>
                            </div>
                        </div>
                    </div>

                    <div className="market-chart-container glass-panel">
                        <div className="chart-header">
                            <h3>Probability Overview</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className="text-secondary" style={{ fontSize: '0.7rem' }}>
                                    Live
                                    <span style={{
                                        display: 'inline-block', width: '6px', height: '6px',
                                        borderRadius: '50%', background: '#00c853', marginLeft: '4px',
                                        verticalAlign: 'middle', animation: 'pulse 2s infinite'
                                    }} />
                                </span>
                                <div className="chart-toggles">
                                    {(["1H", "1D", "1W", "1M", "ALL"] as const).map((r) => (
                                        <button
                                            key={r}
                                            className={`toggle-btn ${timeRange === r ? "active" : ""}`}
                                            onClick={() => setTimeRange(r)}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ height: '350px', width: '100%', padding: '1rem 0' }}>
                            {chartData.length > 0 ? (
                                <LightweightChart data={chartData} color="rgba(41, 98, 255, 1)" />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    No price history available for {timeRange}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="market-rules glass-panel">
                        <h3>Market Rules</h3>
                        <p>{market.description}</p>

                        <div className="rules-grid">
                            <div className="rule-item">
                                <span className="rule-label">Resolution Date</span>
                                <span className="rule-value">{resolutionDate}</span>
                            </div>
                            <div className="rule-item">
                                <span className="rule-label">Oracle</span>
                                <a href={`https://explorer.qubetics.network/token/${market.oracle}`} target="_blank" rel="noopener noreferrer" className="rule-value flex-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                                    {market.oracle.substring(0, 10)}...
                                    <LinkIcon size={14} className="text-secondary" />
                                </a>
                            </div>
                            <div className="rule-item">
                                <span className="rule-label">Contract</span>
                                <a href={`https://explorer.qubetics.network/token/${market.address}`} target="_blank" rel="noopener noreferrer" className="rule-value flex-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                                    {market.address.substring(0, 10)}...
                                    <LinkIcon size={14} className="text-secondary" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Trading Actions */}
                <div className="market-sidebar">

                    {userPosition && (
                        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', borderTop: '3px solid var(--accent-blue)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Your Position
                            </div>
                            {userPosition.yes > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--accent-yes)' }}>YES Shares</span>
                                    <span style={{ fontWeight: 600 }}>{userPosition.yes.toFixed(2)}</span>
                                </div>
                            )}
                            {userPosition.no > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--accent-no)' }}>NO Shares</span>
                                    <span style={{ fontWeight: 600 }}>{userPosition.no.toFixed(2)}</span>
                                </div>
                            )}
                            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Est. Value: ${((userPosition.yes * (market.yesPrice / 100)) + (userPosition.no * (market.noPrice / 100))).toFixed(2)}
                            </div>
                        </div>
                    )}

                    <OrderForm
                        yesProb={Math.round(market.yesPrice)}
                        noProb={Math.round(market.noPrice)}
                        marketAddress={market.address}
                        tradingFee={market.tradingFee}
                    />
                    <OrderBook
                        yesPrice={Math.round(market.yesPrice)}
                        noPrice={Math.round(market.noPrice)}
                        marketId={market.id}
                    />
                </div>
            </div>
            <Footer />
        </>
    );
}
