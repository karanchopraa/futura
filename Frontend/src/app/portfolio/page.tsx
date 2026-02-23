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

    const loadData = async (addr: string) => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    // Fetch portfolio data when wallet address changes
    useEffect(() => {
        if (!walletAddress) {
            setLoading(false);
            return;
        }
        loadData(walletAddress);
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
            if (position.outcome === "YES") {
                txHash = await sellYesShares(position.market.address, position.shares);
            } else {
                txHash = await sellNoShares(position.market.address, position.shares);
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

            alert(`✓ Sold ${position.shares} ${position.outcome} shares successfully!`);

            // Refresh portfolio data
            await loadData(walletAddress);
        } catch (error: any) {
            console.error("Sell failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            alert(`Sell failed: ${msg}`);
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
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        marginBottom: '1.5rem',
                    }}>
                        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>Connect Your Wallet</h2>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            Connect your MetaMask wallet to view your positions and trade history.
                        </p>
                        {isWalletAvailable() ? (
                            <button className="button-primary" onClick={handleConnect} style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                                Connect MetaMask
                            </button>
                        ) : (
                            <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer"
                                className="button-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}>
                                Install MetaMask
                            </a>
                        )}
                    </div>
                )}

                {/* Show wallet address badge when connected */}
                {walletAddress && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)',
                    }}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--accent-yes)', display: 'inline-block',
                        }} />
                        Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                    </div>
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
