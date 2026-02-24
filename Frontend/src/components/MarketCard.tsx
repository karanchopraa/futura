"use client";

import { TrendingUp, Activity, Globe, Zap, Bitcoin, CheckCircle2 } from "lucide-react";
import MarketChart from "./MarketChart";
import Link from "next/link";

interface MarketCardProps {
    id: number;
    title: string;
    volume: string;
    yesProb: number;
    noProb: number;
    iconType?: 'crypto' | 'politics' | 'tech' | 'sports' | 'pop';
    chartData?: { value: number }[];
    resolved?: boolean;
    outcome?: boolean | null;
    resolutionDate?: string;
    priceChange24h?: number;
}
export default function MarketCard({ id, title, volume, yesProb, noProb, iconType = 'tech', chartData, resolved, outcome, resolutionDate, priceChange24h = 0 }: MarketCardProps) {
    const getIcon = () => {
        switch (iconType) {
            case 'crypto': return <Bitcoin size={20} color="#f59e0b" />;
            case 'politics': return <Globe size={20} color="#3b82f6" />;
            case 'tech': return <Zap size={20} color="#8b5cf6" />;
            case 'sports': return <Activity size={20} color="#10b981" />;
            case 'pop': return <TrendingUp size={20} color="#ec4899" />;
            default: return <CheckCircle2 size={20} color="#9da3ad" />;
        }
    };

    const chartColor = yesProb > 50 ? "var(--accent-yes)" : "var(--accent-no)";

    const data = chartData || [
        { value: yesProb - 10 }, { value: yesProb - 5 }, { value: yesProb + 3 }, { value: yesProb }
    ];

    const isPositiveChange = priceChange24h >= 0;

    const getCountdownText = (dateStr: string) => {
        const target = new Date(dateStr).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) return "Ended";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `Ends in ${days}d`;
        if (hours > 0) return `Ends in ${hours}h`;
        return "Ends soon";
    };

    return (
        <Link href={`/market/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={`market-card ${resolved ? 'market-resolved' : ''}`}>
                <div className="card-header">
                    <div className="card-image-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIcon()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {resolved ? (
                            <span className={`status-badge ${outcome ? 'badge-yes' : 'badge-no'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                Resolved: {outcome ? 'YES' : 'NO'}
                            </span>
                        ) : resolutionDate ? (
                            <span className="text-secondary" style={{ fontSize: '0.7rem', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                {getCountdownText(resolutionDate)}
                            </span>
                        ) : null}
                        <div className="card-volume">
                            ${volume} Vol.
                        </div>
                    </div>
                </div>

                <h3 className="card-title">{title}</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Chance of <span style={{ color: yesProb > 50 ? 'var(--accent-yes)' : 'var(--text-primary)' }}>Yes</span>: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(yesProb)}%</strong>
                    </div>
                    {priceChange24h !== 0 && (
                        <div style={{ fontSize: '0.7rem', color: isPositiveChange ? 'var(--accent-yes)' : 'var(--accent-no)', display: 'flex', alignItems: 'center' }}>
                            {isPositiveChange ? '↑' : '↓'} {Math.abs(priceChange24h)}%
                        </div>
                    )}
                </div>

                <MarketChart data={data} color={chartColor} />

                <div className="card-actions">
                    <Link href={`/market/${id}?outcome=yes`} className="trade-button yes-button" style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <span>Yes</span>
                        <span className="trade-prob">{yesProb}¢</span>
                    </Link>
                    <Link href={`/market/${id}?outcome=no`} className="trade-button no-button" style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <span>No</span>
                        <span className="trade-prob">{noProb}¢</span>
                    </Link>
                </div>
            </div>
        </Link>
    );
}
