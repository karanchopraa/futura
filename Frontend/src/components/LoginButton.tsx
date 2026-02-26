"use client";

import { useState, useEffect } from "react";
import { connectWallet, getAddress, shortenAddress, isWalletAvailable } from "@/lib/wallet";
import { getTokenBalance } from "@/lib/contracts";
import { Wallet, LogOut, ExternalLink, RefreshCw } from "lucide-react";

export default function LoginButton() {
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);

    const fetchBalance = async (addr: string) => {
        setIsLoadingBalance(true);
        try {
            const bal = await getTokenBalance(addr);
            setBalance(Number(bal).toFixed(2));
        } catch (error) {
            console.error("Failed to fetch balance:", error);
        } finally {
            setIsLoadingBalance(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        // Initialize state on mount
        if (isWalletAvailable()) {
            getAddress().then((addr) => {
                if (addr) {
                    setAddress(addr);
                    fetchBalance(addr);
                    // Start polling
                    interval = setInterval(() => {
                        fetchBalance(addr);
                    }, 5000);
                }
            }).catch(console.error);
        }

        // Listen for account changes
        if (typeof window !== "undefined" && (window as any).ethereum) {
            const eth = (window as any).ethereum;
            const handleChange = (accounts: string[]) => {
                const newAddr = accounts.length > 0 ? accounts[0] : null;
                setAddress(newAddr);
                if (interval) clearInterval(interval);

                if (newAddr) {
                    fetchBalance(newAddr);
                    interval = setInterval(() => {
                        fetchBalance(newAddr);
                    }, 5000);
                } else {
                    setBalance(null);
                }
            };
            eth.on("accountsChanged", handleChange);
            return () => {
                eth.removeListener("accountsChanged", handleChange);
                if (interval) clearInterval(interval);
            };
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, []);

    const handleConnect = async () => {
        // Mobile redirect logic is now handled internally inside connectWallet
        setConnecting(true);
        try {
            const addr = await connectWallet();
            if (addr) {
                setAddress(addr);
                fetchBalance(addr);
            }
        } catch (error) {
            console.error("Connection failed:", error);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setAddress(null);
        setBalance(null);
    };

    if (address) {
        return (
            <div className="wallet-connected" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                    className="balance-pill"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                    }}
                    title="Refresh Balance"
                    onClick={() => fetchBalance(address)}
                >
                    <span style={{ color: 'var(--text-secondary)' }}>$</span>
                    {isLoadingBalance ? (
                        <RefreshCw size={14} className="spin" style={{ color: 'var(--text-secondary)' }} />
                    ) : (
                        balance || "0.00"
                    )}
                </div>

                <div className="wallet-address-pill">
                    <span className="wallet-dot"></span>
                    <span>{shortenAddress(address)}</span>
                </div>
                <button className="icon-button wallet-disconnect" onClick={handleDisconnect} title="Disconnect">
                    <LogOut size={16} />
                </button>
            </div>
        );
    }

    return (
        <button className="button-primary wallet-connect-btn" onClick={handleConnect} disabled={connecting}>
            <Wallet size={16} style={{ marginRight: '6px' }} />
            {connecting ? "Connecting..." : isWalletAvailable() ? "Connect Wallet" : "Install MetaMask"}
        </button>
    );
}
