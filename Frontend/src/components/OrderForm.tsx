"use client";

import { useState, useEffect } from "react";
import { connectWallet, getAddress, isWalletAvailable } from "@/lib/wallet";
import { buyYesShares, buyNoShares, sellYesShares, sellNoShares, getUserShares } from "@/lib/contracts";

interface OrderFormProps {
    yesProb: number;
    noProb: number;
    marketAddress?: string;
    tradingFee?: number;
}

export default function OrderForm({ yesProb, noProb, marketAddress, tradingFee = 0 }: OrderFormProps) {
    const [mode, setMode] = useState<"buy" | "sell">("buy");
    const [outcome, setOutcome] = useState<"Yes" | "No">("Yes");
    const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
    const [amount, setAmount] = useState<string>("100");
    const [sellShares, setSellShares] = useState<string>("");
    const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string>("");

    // User share balances for sell mode
    const [userYesShares, setUserYesShares] = useState<number>(0);
    const [userNoShares, setUserNoShares] = useState<number>(0);
    const [sharesLoading, setSharesLoading] = useState(false);

    // Fetch user shares when switching to sell mode or when address changes
    useEffect(() => {
        if (mode !== "sell" || !marketAddress) return;

        const fetchShares = async () => {
            const addr = await getAddress();
            if (!addr) return;

            setSharesLoading(true);
            try {
                const shares = await getUserShares(marketAddress, addr);
                setUserYesShares(Number(shares.yesShares));
                setUserNoShares(Number(shares.noShares));
            } catch (err) {
                console.error("Failed to fetch shares:", err);
            } finally {
                setSharesLoading(false);
            }
        };
        fetchShares();
    }, [mode, marketAddress, txStatus]);

    const price = outcome === "Yes" ? yesProb : noProb;

    // --- Buy mode calculations ---
    const feePct = tradingFee / 10000;
    const inputAmount = Number(amount) || 0;
    const feeAmount = inputAmount * feePct;
    const netAmount = inputAmount - feeAmount;
    const buySharesCalc = netAmount ? (netAmount / (price / 100)) : 0;
    const payout = buySharesCalc * 1;
    const returnPct = inputAmount > 0 ? ((payout - inputAmount) / inputAmount) * 100 : 0;

    // --- Sell mode calculations ---
    const availableShares = outcome === "Yes" ? userYesShares : userNoShares;
    const sellSharesNum = Number(sellShares) || 0;
    const estimatedPayout = sellSharesNum * (price / 100);

    const handleBuy = async () => {
        if (!marketAddress || !amount || Number(amount) <= 0) return;

        let address = await getAddress();
        if (!address) {
            try {
                address = await connectWallet();
            } catch (error) {
                alert("Please connect your wallet to trade.");
                return;
            }
        }

        setTxStatus("pending");
        try {
            const result = outcome === "Yes"
                ? await buyYesShares(marketAddress, Number(amount))
                : await buyNoShares(marketAddress, Number(amount));

            setTxHash(result.hash);

            // Record the trade in backend
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                await fetch(`${API_BASE}/trades`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        marketAddress,
                        userAddress: address,
                        action: outcome === "Yes" ? "BUY_YES" : "BUY_NO",
                        shares: buySharesCalc,
                        price,
                        amount: inputAmount,
                        txHash: result.hash,
                    }),
                });
            } catch (apiErr) {
                console.warn("Failed to record trade in backend:", apiErr);
            }

            setTxStatus("success");
            setTimeout(() => setTxStatus("idle"), 5000);
        } catch (error: any) {
            console.error("Trade failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            alert(`Trade failed: ${msg}`);
            setTxStatus("error");
            setTimeout(() => setTxStatus("idle"), 3000);
        }
    };

    const handleSell = async () => {
        if (!marketAddress || sellSharesNum <= 0 || sellSharesNum > availableShares) return;

        let address = await getAddress();
        if (!address) {
            try {
                address = await connectWallet();
            } catch (error) {
                alert("Please connect your wallet to sell.");
                return;
            }
        }

        setTxStatus("pending");
        try {
            const hash = outcome === "Yes"
                ? await sellYesShares(marketAddress, sellSharesNum)
                : await sellNoShares(marketAddress, sellSharesNum);

            setTxHash(hash);

            // Record the sell trade in backend
            try {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                await fetch(`${API_BASE}/trades`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        marketAddress,
                        userAddress: address,
                        action: outcome === "Yes" ? "SELL_YES" : "SELL_NO",
                        shares: sellSharesNum,
                        price,
                        amount: estimatedPayout,
                        txHash: hash,
                    }),
                });
            } catch (apiErr) {
                console.warn("Failed to record sell trade in backend:", apiErr);
            }

            setSellShares("");
            setTxStatus("success");
            setTimeout(() => setTxStatus("idle"), 5000);
        } catch (error: any) {
            console.error("Sell failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            alert(`Sell failed: ${msg}`);
            setTxStatus("error");
            setTimeout(() => setTxStatus("idle"), 3000);
        }
    };

    const getButtonText = () => {
        if (txStatus === "pending") return "Confirming...";
        if (txStatus === "success") return "✓ Transaction Confirmed!";
        if (txStatus === "error") return "Failed – Retry";
        if (!isWalletAvailable()) return "Install MetaMask to Trade";

        if (mode === "sell") {
            return `Sell ${outcome} Shares →`;
        }
        return `Buy ${outcome} →`;
    };

    return (
        <div className="orderform-widget glass-panel">
            {/* Buy / Sell Mode Toggle */}
            <div className="orderform-mode-toggle">
                <button
                    className={`mode-btn ${mode === "buy" ? "active-buy" : ""}`}
                    onClick={() => { setMode("buy"); setTxStatus("idle"); }}
                >
                    Buy
                </button>
                <button
                    className={`mode-btn ${mode === "sell" ? "active-sell" : ""}`}
                    onClick={() => { setMode("sell"); setTxStatus("idle"); }}
                >
                    Sell
                </button>
            </div>

            {/* Yes / No Outcome Tabs */}
            <div className="orderform-tabs">
                <button
                    className={`tab-btn ${outcome === "Yes" ? "active-yes" : ""}`}
                    onClick={() => setOutcome("Yes")}
                >
                    {mode === "buy" ? "Buy" : "Sell"} Yes {yesProb}¢
                </button>
                <button
                    className={`tab-btn ${outcome === "No" ? "active-no" : ""}`}
                    onClick={() => setOutcome("No")}
                >
                    {mode === "buy" ? "Buy" : "Sell"} No {noProb}¢
                </button>
            </div>

            {mode === "buy" && (
                <div className="orderform-type">
                    <button
                        className={`type-btn ${orderType === "Market" ? "active" : ""}`}
                        onClick={() => setOrderType("Market")}
                    >
                        Market
                    </button>
                    <button
                        className={`type-btn ${orderType === "Limit" ? "active" : ""}`}
                        onClick={() => setOrderType("Limit")}
                    >
                        Limit
                    </button>
                </div>
            )}

            {mode === "buy" ? (
                /* --- Buy Mode --- */
                <>
                    <div className="input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label>Amount</label>
                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Max: $5,000</span>
                        </div>
                        <div className="currency-input">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                disabled={txStatus === "pending"}
                            />
                            <span className="currency-type">tUSDC</span>
                        </div>
                    </div>

                    <div className="order-summary">
                        <div className="summary-row">
                            <span className="text-secondary">Avg Price</span>
                            <span>{price}¢</span>
                        </div>
                        <div className="summary-row">
                            <span className="text-secondary">Shares</span>
                            <span>{buySharesCalc.toFixed(2)}</span>
                        </div>
                        <div className="summary-row">
                            <span className="text-secondary">Potential Return</span>
                            <span className="text-success">{returnPct.toFixed(2)}% (${(payout - Number(amount)).toFixed(2)})</span>
                        </div>
                        <div className="summary-row payout-row">
                            <span className="text-secondary">Est. Payout</span>
                            <span className="payout-amount">${payout.toFixed(2)}</span>
                        </div>
                    </div>
                </>
            ) : (
                /* --- Sell Mode --- */
                <>
                    <div className="input-group" style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label>Shares to Sell</label>
                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                                {sharesLoading ? "Loading..." : `Available: ${availableShares.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="currency-input">
                            <input
                                type="number"
                                value={sellShares}
                                onChange={(e) => setSellShares(e.target.value)}
                                placeholder="0"
                                max={availableShares}
                                disabled={txStatus === "pending"}
                            />
                            <button
                                className="max-btn"
                                onClick={() => setSellShares(availableShares.toString())}
                                disabled={availableShares <= 0}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    color: 'var(--accent-yes)',
                                    padding: '0.3rem 0.75rem',
                                    margin: '0.3rem 0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    <div className="order-summary">
                        <div className="summary-row">
                            <span className="text-secondary">Current Price</span>
                            <span>{price}¢</span>
                        </div>
                        <div className="summary-row">
                            <span className="text-secondary">Shares to Sell</span>
                            <span>{sellSharesNum.toFixed(2)}</span>
                        </div>
                        <div className="summary-row payout-row">
                            <span className="text-secondary">Est. Payout</span>
                            <span className="payout-amount">${estimatedPayout.toFixed(2)}</span>
                        </div>
                    </div>

                    {availableShares <= 0 && !sharesLoading && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--accent-no)',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                        }}>
                            No {outcome} shares to sell. Buy some first!
                        </div>
                    )}
                </>
            )}

            <button
                className={`button-primary full-width place-order-btn ${mode === "sell" ? "sell-mode" : outcome.toLowerCase()}`}
                onClick={mode === "buy" ? handleBuy : handleSell}
                disabled={
                    txStatus === "pending" ||
                    (mode === "sell" && (sellSharesNum <= 0 || sellSharesNum > availableShares))
                }
                style={{
                    opacity: txStatus === "pending" ? 0.7 : 1,
                    background: txStatus === "success"
                        ? "var(--accent-yes)"
                        : mode === "sell"
                            ? "linear-gradient(135deg, #ef4444, #dc2626)"
                            : undefined,
                }}
            >
                {getButtonText()}
            </button>

            {txStatus === "success" && txHash && (
                <div style={{ marginTop: "0.5rem", textAlign: "center", fontSize: "0.75rem" }}>
                    <a
                        href={`https://explorer-testnet.qubetics.work/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent-blue)", textDecoration: "underline" }}
                    >
                        View on Explorer ↗
                    </a>
                </div>
            )}
        </div>
    );
}
