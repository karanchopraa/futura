const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface Market {
    id: number;
    address: string;
    question: string;
    description: string;
    category: string;
    volume: number;
    yesPrice: number;
    noPrice: number;
    resolutionDate: string;
    oracle: string;
    resolved: boolean;
    outcome: boolean | null;
    tradingFee: number;
    createdAt: string;
    priceHistory?: PricePoint[];
    tradersCount?: number;
}

export interface PricePoint {
    id: number;
    marketId: number;
    yesPrice: number;
    noPrice: number;
    timestamp: string;
}

export interface Position {
    id: number;
    marketId: number;
    userAddress: string;
    outcome: string;
    shares: number;
    avgPrice: number;
    currentPrice: number;
    currentValue: number;
    costBasis: number;
    pnl: number;
    pnlPct: number;
    market: {
        id: number;
        address: string;
        question: string;
        yesPrice: number;
        noPrice: number;
        resolved: boolean;
        outcome: boolean | null;
    };
}

export interface Portfolio {
    address: string;
    totalValue: number;
    positions: Position[];
}

export interface Trade {
    id: number;
    marketId: number;
    userAddress: string;
    action: string;
    shares: number;
    price: number;
    amount: number;
    txHash: string;
    timestamp: string;
    market: { question: string; address: string };
}

// --- Markets ---

export async function fetchMarkets(category?: string): Promise<Market[]> {
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    const res = await fetch(`${API_BASE}/markets?${params}`);
    if (!res.ok) throw new Error("Failed to fetch markets");
    return res.json();
}

export async function fetchMarket(id: string | number): Promise<Market> {
    const res = await fetch(`${API_BASE}/markets/${id}`);
    if (!res.ok) throw new Error("Failed to fetch market");
    return res.json();
}

export async function fetchFeaturedMarkets(): Promise<Market[]> {
    const res = await fetch(`${API_BASE}/markets/featured`);
    if (!res.ok) throw new Error("Failed to fetch featured");
    return res.json();
}

export async function searchMarkets(query: string): Promise<Market[]> {
    if (!query) return [];
    const res = await fetch(`${API_BASE}/markets/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search");
    return res.json();
}

// --- Portfolio ---

export async function fetchPortfolio(address: string): Promise<Portfolio> {
    const res = await fetch(`${API_BASE}/portfolio/${address}`);
    if (!res.ok) throw new Error("Failed to fetch portfolio");
    return res.json();
}

export async function fetchTradeHistory(address: string): Promise<Trade[]> {
    const res = await fetch(`${API_BASE}/portfolio/${address}/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
}

export async function fetchClaimable(address: string): Promise<{ claimable: any[]; totalClaimable: number }> {
    const res = await fetch(`${API_BASE}/portfolio/${address}/claimable`);
    if (!res.ok) throw new Error("Failed to fetch claimable");
    return res.json();
}

// --- Utility ---

/** Safely format a number — clamps absurd values from corrupted on-chain data */
export function safeNumber(val: number): number {
    if (!Number.isFinite(val) || Math.abs(val) > 1e9) return 0;
    return val;
}

export function formatVolume(volume: number): string {
    const v = safeNumber(volume);
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
}

export function formatPrice(price: number): string {
    return `${Math.round(price)}¢`;
}
