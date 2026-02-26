import { BrowserProvider, JsonRpcSigner } from "ethers";

declare global {
    interface Window {
        ethereum?: any;
    }
}

const QUBETICS_CHAIN = {
    chainId: "0x2345", // 9029 in hex
    chainName: "Qubetics Testnet",
    rpcUrls: ["https://rpc-testnet.qubetics.work/"],
    nativeCurrency: {
        name: "TICS",
        symbol: "TICS",
        decimals: 18,
    },
    blockExplorerUrls: ["https://explorer.qubetics.work"],
};

export function isWalletAvailable(): boolean {
    return typeof window !== "undefined" && !!window.ethereum;
}

export async function connectWallet(): Promise<string> {
    if (!isWalletAvailable()) {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            const currentUrl = window.location.href;
            const dappUrl = currentUrl.replace(/^https?:\/\//, "");
            window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
            // Return empty string to prevent throwing, user is redirecting
            return "";
        }
        throw new Error("No wallet detected. Please install MetaMask.");
    }

    // Force MetaMask permission popup even if already connected in the background
    await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
    });

    const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
    });

    // Try to switch to Qubetics network
    await switchToQubetics();

    return accounts[0];
}

export async function getAddress(): Promise<string | null> {
    if (!isWalletAvailable()) return null;

    const accounts = await window.ethereum.request({
        method: "eth_accounts",
    });

    return accounts[0] || null;
}

export async function getSigner(): Promise<JsonRpcSigner> {
    if (!isWalletAvailable()) {
        throw new Error("No wallet detected");
    }

    const provider = new BrowserProvider(window.ethereum);
    return provider.getSigner();
}

export async function getProvider(): Promise<BrowserProvider> {
    if (!isWalletAvailable()) {
        throw new Error("No wallet detected");
    }

    return new BrowserProvider(window.ethereum);
}

export async function switchToQubetics(): Promise<void> {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: QUBETICS_CHAIN.chainId }],
        });
    } catch (switchError: any) {
        // Network not added — add it
        if (switchError.code === 4902) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [QUBETICS_CHAIN],
            });
        }
    }
}

export function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (isWalletAvailable()) {
        window.ethereum.on("accountsChanged", callback);
    }
}

export function onChainChanged(callback: (chainId: string) => void): void {
    if (isWalletAvailable()) {
        window.ethereum.on("chainChanged", callback);
    }
}
