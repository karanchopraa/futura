"use client";

import { useState } from "react";
import { X, ArrowRight, Coins } from "lucide-react";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
    const [amount, setAmount] = useState<string>("100");

    if (!isOpen) return null;

    const fee = 2.0;
    const numAmount = Number(amount) || 0;
    const usdcAmount = Math.max(0, numAmount - fee);

    const presets = [50, 100, 250, 500];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="deposit-modal-header">
                    <div className="deposit-modal-title-row">
                        <div className="deposit-icon-wrap">
                            <Coins size={20} />
                        </div>
                        <div>
                            <h2 className="deposit-modal-title">Fund your Wallet</h2>
                            <p className="deposit-modal-subtitle">Buy tUSDC to start trading on prediction markets</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="deposit-close-btn">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="deposit-modal-body">
                    {/* You Pay */}
                    <div className="deposit-field">
                        <label className="deposit-label">You Pay</label>
                        <div className="deposit-input-wrap">
                            <span className="deposit-currency-icon">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="deposit-input"
                                min="0"
                            />
                            <span className="deposit-currency-tag">USD</span>
                        </div>
                    </div>

                    {/* Quick amounts */}
                    <div className="deposit-presets">
                        {presets.map((p) => (
                            <button
                                key={p}
                                className={`deposit-preset-btn ${Number(amount) === p ? "active" : ""}`}
                                onClick={() => setAmount(String(p))}
                            >
                                ${p}
                            </button>
                        ))}
                    </div>

                    {/* Conversion details */}
                    <div className="deposit-details">
                        <div className="deposit-detail-row">
                            <span>Exchange Rate</span>
                            <span className="deposit-detail-value">1 USD = 1.00 tUSDC</span>
                        </div>
                        <div className="deposit-detail-row">
                            <span>Processing Fee</span>
                            <span className="deposit-detail-value">$2.00</span>
                        </div>
                        <div className="deposit-detail-row deposit-total-row">
                            <span>You Receive</span>
                            <span className="deposit-detail-value deposit-receive-amount">
                                {usdcAmount.toFixed(2)} tUSDC
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="deposit-modal-footer">
                    <button className="deposit-cta-btn" disabled={numAmount <= fee}>
                        Continue with MoonPay
                        <ArrowRight size={16} />
                    </button>
                    <p className="deposit-disclaimer">
                        Powered by MoonPay · Fiat on-ramp for Qubetics Testnet
                    </p>
                </div>
            </div>
        </div>
    );
}
