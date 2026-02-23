"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectWallet, getAddress, isWalletAvailable, onAccountsChanged, onChainChanged } from "@/lib/wallet";
import { createMarket } from "@/lib/contracts";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase() || "";

export default function AdminPage() {
    const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
    const [isCheckingWallet, setIsCheckingWallet] = useState(true);

    // Form State
    const [question, setQuestion] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("crypto");
    const [resolutionDate, setResolutionDate] = useState("");
    const [liquidity, setLiquidity] = useState("10"); // Min 10 tUSDC
    const [feePct, setFeePct] = useState("2.0");      // 2.0%

    // Check wallet on mount and listen for changes
    useEffect(() => {
        let isMounted = true;
        setIsCheckingWallet(false);

        onAccountsChanged((accounts) => {
            if (isMounted) {
                setConnectedWallet(accounts[0] ? accounts[0].toLowerCase() : null);
            }
        });

        onChainChanged(() => {
            if (isMounted) window.location.reload();
        });

        return () => { isMounted = false; };
    }, []);

    const handleConnectWallet = async () => {
        try {
            const addr = await connectWallet();
            setConnectedWallet(addr.toLowerCase());
        } catch (error) {
            console.error("Failed to connect wallet", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        if (!question || !description || !resolutionDate || !liquidity || !feePct) {
            setErrorMsg("Please fill in all required fields.");
            return;
        }

        const dateTimestamp = Math.floor(new Date(resolutionDate).getTime() / 1000);
        if (dateTimestamp <= Math.floor(Date.now() / 1000)) {
            setErrorMsg("Resolution date must be in the future.");
            return;
        }

        const feeBps = Math.floor(parseFloat(feePct) * 100);
        if (feeBps < 0 || feeBps > 1000) {
            setErrorMsg("Trading fee must be between 0% and 10%.");
            return;
        }

        let address = await getAddress();
        if (!address) {
            try {
                address = await connectWallet();
            } catch (err) {
                setErrorMsg("Wallet connection failed.");
                return;
            }
        }

        setStatus("pending");
        try {
            const marketAddrOrHash = await createMarket(
                question,
                description,
                category,
                dateTimestamp,
                parseFloat(liquidity),
                feeBps
            );

            // `createMarket` returns the address if parsed successfully, or txHash if not.
            // Let's assume it returned the hash or address
            setTxHash(marketAddrOrHash);
            setStatus("success");

            // Reset form
            setQuestion("");
            setDescription("");
            setCategory("crypto");
            setResolutionDate("");
        } catch (error: any) {
            console.error("Market creation failed:", error);
            setErrorMsg(error?.reason || error?.message || "Transaction failed");
            setStatus("error");
        }
    };

    if (isCheckingWallet) {
        return (
            <div className="app-layout" style={{ display: 'block' }}>
                <Navbar onDepositClick={() => { }} />
                <main className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner"></div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!connectedWallet) {
        return (
            <div className="app-layout" style={{ display: 'block' }}>
                <Navbar onDepositClick={() => { }} />
                <main className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px' }}>
                        <h2 className="admin-title" style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Admin Access</h2>
                        <p className="admin-subtitle" style={{ marginBottom: '2rem' }}>Please connect your wallet to access the Futura deployment portal.</p>
                        <button onClick={handleConnectWallet} className="admin-submit-btn" style={{ width: '100%' }}>
                            Connect Wallet
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (ADMIN_WALLET && connectedWallet !== ADMIN_WALLET) {
        return (
            <div className="app-layout" style={{ display: 'block' }}>
                <Navbar onDepositClick={() => { }} />
                <main className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '480px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ color: '#ef4444', fontSize: '3rem', marginBottom: '1rem' }}>⛔</div>
                        <h2 className="admin-title" style={{ marginBottom: '1rem', fontSize: '1.5rem', color: '#fca5a5' }}>Unauthorized Access</h2>
                        <p className="admin-subtitle" style={{ marginBottom: '1.5rem' }}>
                            The connected wallet <br />
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {connectedWallet}
                            </span><br />
                            is not authorized to deploy markets.
                        </p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="app-layout" style={{ display: 'block' }}>
            <Navbar onDepositClick={() => { }} />
            <main className="admin-layout">
                <div className="admin-header">
                    <h1 className="admin-title">Admin Portal</h1>
                    <p className="admin-subtitle">Deploy and configure new prediction markets</p>
                </div>

                <div className="admin-grid">
                    {/* Left Sidebar Menu */}
                    <div className="glass-panel" style={{ padding: '1rem', height: 'fit-content' }}>
                        <nav className="admin-nav">
                            <button className="admin-nav-button active">
                                Create Market
                            </button>
                            <button className="admin-nav-button">
                                Dashboard (Coming Soon)
                            </button>
                            <button className="admin-nav-button">
                                Manage Markets (Coming Soon)
                            </button>
                        </nav>
                    </div>

                    {/* Main Form Area */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h2 className="admin-panel-title">
                            Deploy New Market
                        </h2>

                        <form onSubmit={handleSubmit} className="admin-form">
                            <div className="form-group">
                                <label className="form-label">
                                    Market Question
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Will ETH reach $4000 by End of Feb?"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Description & Rules
                                </label>
                                <textarea
                                    placeholder="Explain the specific resolution criteria..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="form-textarea"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Category
                                    </label>
                                    <div className="input-wrapper">
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="crypto">Crypto</option>
                                            <option value="politics">Politics</option>
                                            <option value="sports">Sports</option>
                                            <option value="tech">Tech & Science</option>
                                            <option value="pop">Pop Culture</option>
                                        </select>
                                        <div className="select-icon">▼</div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Resolution Deadline
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={resolutionDate}
                                        onChange={(e) => setResolutionDate(e.target.value)}
                                        className="form-input"
                                        style={{ colorScheme: 'dark' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row highlight-box">
                                <div className="form-group">
                                    <label className="form-label mono">
                                        Trading Fee (%)
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.1"
                                            value={feePct}
                                            onChange={(e) => setFeePct(e.target.value)}
                                            className="form-input mono pct-input"
                                            required
                                        />
                                        <span className="input-suffix">%</span>
                                    </div>
                                    <p className="form-help">Max 10%. Drives protocol revenue.</p>
                                </div>

                                <div className="form-group">
                                    <label className="form-label mono">
                                        Initial Liquidity
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            type="number"
                                            min="10"
                                            value={liquidity}
                                            onChange={(e) => setLiquidity(e.target.value)}
                                            className="form-input mono tusdc-input"
                                            required
                                        />
                                        <span className="input-suffix">tUSDC</span>
                                    </div>
                                    <p className="form-help">Min 10 tUSDC to seed CPMM.</p>
                                </div>
                            </div>

                            {/* Status Alerts */}
                            {errorMsg && (
                                <div className="admin-alert error">
                                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Deployment Error:</strong>
                                    {errorMsg}
                                </div>
                            )}

                            {status === "success" && (
                                <div className="admin-alert success">
                                    <strong>✓ Market Deployed Successfully</strong>
                                    <p style={{ marginTop: '0.25rem', opacity: 0.8, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Ref: {txHash}
                                    </p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === "pending"}
                                className="admin-submit-btn"
                            >
                                {status === "pending" ? (
                                    <>
                                        <span className="spinner"></span>
                                        Deploying Contract...
                                    </>
                                ) : (
                                    "Deploy Market"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
