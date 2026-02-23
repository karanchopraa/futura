"use client";

import { useState, useEffect } from "react";
import { connectWallet, getAddress, shortenAddress, isWalletAvailable } from "@/lib/wallet";
import { Wallet, LogOut, ExternalLink } from "lucide-react";

export default function LoginButton() {
    const [address, setAddress] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        // Listen for account changes
        if (typeof window !== "undefined" && (window as any).ethereum) {
            const eth = (window as any).ethereum;
            const handleChange = (accounts: string[]) => {
                setAddress(accounts.length > 0 ? accounts[0] : null);
            };
            eth.on("accountsChanged", handleChange);
            return () => eth.removeListener("accountsChanged", handleChange);
        }
    }, []);

    const handleConnect = async () => {
        if (!isWalletAvailable()) {
            window.open("https://metamask.io/download/", "_blank");
            return;
        }

        setConnecting(true);
        try {
            const addr = await connectWallet();
            setAddress(addr);
        } catch (error) {
            console.error("Connection failed:", error);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        setAddress(null);
    };

    if (address) {
        return (
            <div className="wallet-connected">
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
