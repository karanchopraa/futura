"use client";

import { useState, useEffect } from "react";
import { connectWallet, getAddress, isWalletAvailable } from "@/lib/wallet";
import { buyYesShares, buyNoShares, sellYesShares, sellNoShares, getUserShares, getTokenBalance } from "@/lib/contracts";
import { showToast } from "@/components/Toast";

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

    // User balances for buy/sell modes
    const [userYesShares, setUserYesShares] = useState<number>(0);
    const [userNoShares, setUserNoShares] = useState<number>(0);
    const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
    const [balancesLoading, setBalancesLoading] = useState(false);

    // Fetch user shares and token balance
    useEffect(() => {
        if (!marketAddress) return;

        let isActive = true;

        const fetchBalances = async (isBackgroundPoll = false) => {
            const addr = await getAddress();
            if (!addr) return;

            if (!isBackgroundPoll) setBalancesLoading(true);
            try {
                const [shares, tokenBal] = await Promise.all([
                    getUserShares(marketAddress, addr),
                    getTokenBalance(addr)
                ]);
                if (isActive) {
                    setUserYesShares(Number(shares.yesShares));
                    setUserNoShares(Number(shares.noShares));
                    setUserTokenBalance(Number(tokenBal));
                }
            } catch (err) {
                console.error("Failed to fetch balances:", err);
            } finally {
                if (isActive && !isBackgroundPoll) setBalancesLoading(false);
            }
        };

        fetchBalances(false);

        const intervalId = setInterval(() => {
            fetchBalances(true);
        }, 5000);

        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }, [mode, marketAddress, txStatus]);

    const price = outcome === "Yes" ? yesProb : noProb;

    // --- Buy mode calculations ---
    const activeTradingFee = tradingFee || 200; // Default to 2% if missing for demonstration
    const feePct = activeTradingFee / 10000;
    const inputAmount = Number(amount) || 0;
    const feeAmount = inputAmount * feePct;
    const netAmount = inputAmount - feeAmount;
    const buySharesCalc = netAmount ? (netAmount / (price / 100)) : 0;
    const payout = buySharesCalc * 1;
    const returnPct = inputAmount > 0 ? ((payout - inputAmount) / inputAmount) * 100 : 0;

    const availableShares = outcome === "Yes" ? userYesShares : userNoShares;
    const sellSharesNum = Number(sellShares) || 0;
    const estimatedPayout = sellSharesNum * (price / 100);

    const handleAmountChange = (val: string) => {
        if (Number(val) < 0) return;

        // Prevent typing more than 2 decimal places
        if (val.includes('.')) {
            const parts = val.split('.');
            if (parts[1].length > 2) return;
        }

        // Cap at user's max balance
        if (Number(val) > userTokenBalance && userTokenBalance > 0) {
            setAmount(userTokenBalance.toString());
            return;
        }

        setAmount(val);
    };

    const handleSellSharesChange = (val: string) => {
        if (Number(val) < 0) return;

        // Prevent typing more than 2 decimal places
        if (val.includes('.')) {
            const parts = val.split('.');
            if (parts[1].length > 2) return;
        }

        // Cap at max available shares
        if (Number(val) > availableShares && availableShares > 0) {
            setSellShares(availableShares.toString());
            return;
        }

        setSellShares(val);
    };

    const handleBuy = async () => {
        if (!marketAddress || !amount || Number(amount) <= 0 || Number(amount) > userTokenBalance) return;

        let address = await getAddress();
        if (!address) {
            try {
                address = await connectWallet();
            } catch (error) {
                showToast("Please connect your wallet to trade.", "error");
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

            setAmount("");
            setTxStatus("success");
            setTimeout(() => setTxStatus("idle"), 5000);

            // Instantly refresh balances for snappier UI
            setTimeout(async () => {
                if (!address) return;
                try {
                    const [shares, tokenBal] = await Promise.all([
                        getUserShares(marketAddress, address),
                        getTokenBalance(address)
                    ]);
                    setUserYesShares(Number(shares.yesShares));
                    setUserNoShares(Number(shares.noShares));
                    setUserTokenBalance(Number(tokenBal));
                } catch (e) {
                    console.error("Failed to quick-refresh balances after trade", e);
                }
            }, 2000);
        } catch (error: any) {
            console.error("Trade failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            showToast(`Trade failed: ${msg}`, "error");
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
                showToast("Please connect your wallet to sell.", "error");
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

            // Instantly refresh balances for snappier UI
            setTimeout(async () => {
                if (!address) return;
                try {
                    const [shares, tokenBal] = await Promise.all([
                        getUserShares(marketAddress, address),
                        getTokenBalance(address)
                    ]);
                    setUserYesShares(Number(shares.yesShares));
                    setUserNoShares(Number(shares.noShares));
                    setUserTokenBalance(Number(tokenBal));
                } catch (e) {
                    console.error("Failed to quick-refresh balances after trade", e);
                }
            }, 2000);
        } catch (error: any) {
            console.error("Sell failed:", error);
            const msg = error?.reason || error?.message || "Unknown error";
            showToast(`Sell failed: ${msg}`, "error");
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
                            <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                                {balancesLoading ? "Loading..." : `Available: $${userTokenBalance.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="currency-input">
                            <span className="currency-symbol">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => handleAmountChange(e.target.value)}
                                placeholder="0"
                                min="1"
                                max={userTokenBalance}
                                disabled={txStatus === "pending"}
                            />
                            <button
                                className="max-btn"
                                onClick={() => setAmount(userTokenBalance.toString())}
                                disabled={userTokenBalance <= 0 || txStatus === "pending"}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    color: outcome === "Yes" ? 'var(--accent-yes)' : 'var(--accent-no)',
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
                            <span className="currency-type" style={{ marginLeft: "4px" }}>tUSDC</span>
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
                        {activeTradingFee > 0 && (
                            <div className="summary-row">
                                <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Fee ({(activeTradingFee / 100).toFixed(1)}%)
                                    <span style={{ fontSize: '0.65rem', background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '4px' }}>tUSDC</span>
                                </span>
                                <span>${feeAmount.toFixed(2)}</span>
                            </div>
                        )}
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
                                {balancesLoading ? "Loading..." : `Available: ${availableShares.toFixed(2)}`}
                            </span>
                        </div>
                        <div className="currency-input">
                            <input
                                type="number"
                                value={sellShares}
                                onChange={(e) => handleSellSharesChange(e.target.value)}
                                placeholder="0"
                                min="0.01"
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

                    {availableShares <= 0 && !balancesLoading && (
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
                    (mode === "sell" && (sellSharesNum <= 0 || sellSharesNum > availableShares)) ||
                    (mode === "buy" && (inputAmount < 0.01 || inputAmount > userTokenBalance))
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
                        href={`https://explorer.qubetics.work/tx/${txHash}`}
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
