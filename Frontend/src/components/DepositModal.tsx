"use client";

import { useState } from "react";
import { X, ArrowRight, Coins } from "lucide-react";
import { mintTestTokens } from "@/lib/contracts";
import { connectWallet, isWalletAvailable } from "@/lib/wallet";
import { showToast } from "@/components/Toast";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const [amount, setAmount] = useState<string>("100");
    const [status, setStatus] = useState<"idle" | "minting" | "success" | "error">("idle");
    const [txHash, setTxHash] = useState<string>("");

    if (!isOpen) return null;

    const numAmount = Number(amount) || 0;
    const presets = [50, 100, 250, 500];

    const handleMint = async () => {
        if (numAmount <= 0) return;

        if (!isWalletAvailable()) {
            showToast("Please install MetaMask to mint tokens.", "error");
            return;
        }

        setStatus("minting");
        try {
            await connectWallet(); // Ensure connected
            const hash = await mintTestTokens(numAmount);
            setTxHash(hash);
            setStatus("success");
            showToast(`Successfully minted ${numAmount} tUSDC!`, "success");

            // Allow user to see success before closing
            setTimeout(() => {
                setStatus("idle");
                onClose();
            }, 3000);
        } catch (error: any) {
            console.error("Minting failed:", error);
            setStatus("error");
            showToast(error?.reason || error?.message || "Minting failed.", "error");
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="deposit-modal-header">
                    <div className="deposit-modal-title-row">
                        <div className="deposit-icon-wrap" style={{ background: 'var(--accent-blue)', color: 'white' }}>
                            <Coins size={20} />
                        </div>
                        <div>
                            <h2 className="deposit-modal-title">Mint Test Tokens</h2>
                            <p className="deposit-modal-subtitle">Get free tUSDC to test the platform</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="deposit-close-btn" disabled={status === "minting"}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="deposit-modal-body">
                    {/* You Receive */}
                    <div className="deposit-field">
                        <label className="deposit-label">Amount to Mint</label>
                        <div className="deposit-input-wrap">
                            <span className="deposit-currency-icon">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="deposit-input"
                                min="0"
                                disabled={status === "minting"}
                            />
                            <span className="deposit-currency-tag">tUSDC</span>
                        </div>
                    </div>

                    {/* Quick amounts */}
                    <div className="deposit-presets">
                        {presets.map((p) => (
                            <button
                                key={p}
                                className={`deposit-preset-btn ${Number(amount) === p ? "active" : ""}`}
                                onClick={() => setAmount(String(p))}
                                disabled={status === "minting"}
                            >
                                ${p}
                            </button>
                        ))}
                    </div>

                    {/* Faucet details */}
                    <div className="deposit-details" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                        <div className="deposit-detail-row">
                            <span>Network</span>
                            <span className="deposit-detail-value">Qubetics Testnet</span>
                        </div>
                        <div className="deposit-detail-row">
                            <span>Fee</span>
                            <span className="deposit-detail-value" style={{ color: 'var(--accent-yes)' }}>Free (Faucet)</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="deposit-modal-footer">
                    <button
                        className="deposit-cta-btn"
                        disabled={numAmount <= 0 || status === "minting"}
                        onClick={handleMint}
                        style={{
                            background: status === "success" ? 'var(--accent-yes)' : 'var(--accent-blue)',
                            opacity: status === "minting" ? 0.7 : 1
                        }}
                    >
                        {status === "minting" ? "Confirming in Wallet..." :
                            status === "success" ? "✓ Minted Successfully!" :
                                "Mint tUSDC"}
                        {status === "idle" && <ArrowRight size={16} />}
                    </button>
                    <p className="deposit-disclaimer">
                        This is a testnet environment. Tokens have no real value.
                    </p>
                    {status === "success" && txHash && (
                        <div style={{ textAlign: "center", fontSize: "0.75rem", marginTop: "0.5rem" }}>
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
            </div>
        </div>
    );
}
