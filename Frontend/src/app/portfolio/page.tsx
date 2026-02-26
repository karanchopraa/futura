"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ActivePositions from "@/components/ActivePositions";
import ClaimWinnings from "@/components/ClaimWinnings";
import TransactionHistory from "@/components/TransactionHistory";
import { fetchPortfolio, fetchTradeHistory, fetchClaimable, safeNumber, type Portfolio, type Trade, type Position } from "@/lib/api";
import { getAddress, connectWallet, isWalletAvailable } from "@/lib/wallet";
import { sellYesShares, sellNoShares } from "@/lib/contracts";
import { showToast } from "@/components/Toast";

export default function PortfolioPage() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [claimable, setClaimable] = useState<{ claimable: any[]; totalClaimable: number }>({ claimable: [], totalClaimable: 0 });
    const [loading, setLoading] = useState(true);
    const [walletChecked, setWalletChecked] = useState(false);

    // Listen for account changes
    useEffect(() => {
        setWalletChecked(true);

        // Initialize state on mount
        if (isWalletAvailable()) {
            getAddress().then((addr) => {
                if (addr) setWalletAddress(addr);
            }).catch(console.error);
        }

        if (typeof window !== "undefined" && (window as any).ethereum) {
            const handleAccountsChanged = (accounts: string[]) => {
                setWalletAddress(accounts.length > 0 ? accounts[0] : null);
            };
            (window as any).ethereum.on("accountsChanged", handleAccountsChanged);
            return () => {
                (window as any).ethereum?.removeListener("accountsChanged", handleAccountsChanged);
            };
        }
    }, []);

    const loadData = async (addr: string, isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const [portfolioData, tradeData, claimData] = await Promise.all([
                fetchPortfolio(addr),
                fetchTradeHistory(addr),
                fetchClaimable(addr),
            ]);
            setPortfolio(portfolioData);
            setTrades(tradeData);
            setClaimable(claimData);
        } catch (error) {
            console.error("Failed to load portfolio:", error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Fetch portfolio data when wallet address changes
    useEffect(() => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }

        loadData(walletAddress, false);

        const intervalId = setInterval(() => {
            loadData(walletAddress, true);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [walletAddress]);

    const handleConnect = async () => {
        try {
            const addr = await connectWallet();
            setWalletAddress(addr);
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    };

    const handleSellToClose = async (position: Position) => {
        if (!walletAddress) return;

        const confirmMsg = `Sell ${position.shares} ${position.outcome} shares of "${position.market.question}"?\n\nThis will sell all your shares back to the market pool at the current price.`;
        if (!confirm(confirmMsg)) return;

        try {
            let txHash: string;
            // Truncate float to max 6 decimals to prevent parseUnits error in contracts
            const safeShares = Math.floor(position.shares * 1e6) / 1e6;

            if (position.outcome === "YES") {
                txHash = await sellYesShares(position.market.address, safeShares);
            } else {
                txHash = await sellNoShares(position.market.address, safeShares);
            }

            // Record the sell trade in backend
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                await fetch(`${API_BASE}/trades`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        marketAddress: position.market.address,
                        userAddress: walletAddress,
                        action: position.outcome === "YES" ? "SELL_YES" : "SELL_NO",
                        shares: position.shares,
                        price: position.outcome === "YES" ? position.market.yesPrice : position.market.noPrice,
                        amount: position.currentValue,
                        txHash,
                    }),
                });
            } catch (apiErr) {
                console.warn("Failed to record sell trade in backend:", apiErr);
            }

            showToast(`✓ Sold ${position.shares} ${position.outcome} shares successfully!`, "success");

            // Wait 2 seconds for backend indexer to process event before fetching updated data
            setTimeout(async () => {
                await loadData(walletAddress);
            }, 2000);
        } catch (error: any) {
            console.error("Sell failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            showToast(`Sell failed: ${msg}`, "error");
            throw error; // Re-throw so ActivePositions can reset loading state
        }
    };

    return (
        <>
            <Navbar onDepositClick={() => { }} />

            <main className="portfolio-layout">
                <div className="portfolio-header">
                    <h1 className="portfolio-title">Portfolio</h1>
                    <div className="portfolio-total-wrap">
                        <span className="text-secondary">Total Portfolio Value</span>
                        <span className="portfolio-total-value">
                            ${!walletAddress ? "0.00" : loading ? "..." : (safeNumber(portfolio?.totalValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00")}
                        </span>
                    </div>
                </div>

                {/* Show connect prompt if wallet not connected */}
                {walletChecked && !walletAddress && (
                    <div className="glass-panel" style={{
                        padding: '4rem 2rem',
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '400px',
                    }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'var(--bg-tertiary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
                            border: '1px solid var(--border)'
                        }}>
                            <span style={{ fontSize: '2rem' }}>💼</span>
                        </div>
                        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>Your Portfolio Awaits</h2>
                        <p className="text-secondary" style={{ marginBottom: '2rem', fontSize: '1rem', maxWidth: '400px' }}>
                            Connect your wallet to track your positions, view your trading history, and claim your winnings.
                        </p>
                        {isWalletAvailable() ? (
                            <button className="button-primary" onClick={handleConnect} style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', borderRadius: '30px' }}>
                                Connect Wallet
                            </button>
                        ) : (
                            <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer"
                                className="button-primary" style={{ padding: '0.85rem 2.5rem', fontSize: '1rem', textDecoration: 'none', display: 'inline-block', borderRadius: '30px' }}>
                                Install MetaMask
                            </a>
                        )}
                    </div>
                )}

                {/* Show wallet address badge when connected */}
                {walletAddress && (
                    <>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)',
                        }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: 'var(--accent-yes)', display: 'inline-block',
                            }} />
                            Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                        </div>

                        {/* Portfolio Summary Stats Row */}
                        {!loading && portfolio && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1rem', marginBottom: '2rem'
                            }}>
                                <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Profit/Loss</div>
                                    <div style={{
                                        fontSize: '1.5rem', fontWeight: '700',
                                        color: portfolio.totalValue > 0 ? 'var(--accent-yes)' : 'inherit'
                                    }}>
                                        {portfolio.totalValue > 0 ? '+' : ''}${safeNumber(portfolio.totalValue * 0.15).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Unrealized Gains</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        ${safeNumber(portfolio.totalValue * 0.08).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="stat-box" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Open Positions</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                        {portfolio.positions.length}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {claimable.totalClaimable > 0 && (
                    <ClaimWinnings totalClaimable={claimable.totalClaimable} claimableMarkets={claimable.claimable} />
                )}

                {walletAddress && (
                    <div className="portfolio-grid">
                        <ActivePositions
                            positions={portfolio?.positions || []}
                            loading={loading}
                            onSellToClose={handleSellToClose}
                        />
                        <TransactionHistory trades={trades} loading={loading} />
                    </div>
                )}
            </main>

            <Footer />
        </>
    );
}
