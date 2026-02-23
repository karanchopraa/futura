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
}

export default function MarketCard({ id, title, volume, yesProb, noProb, iconType = 'tech', chartData }: MarketCardProps) {

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

    return (
        <Link href={`/market/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="market-card">
                <div className="card-header">
                    <div className="card-image-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIcon()}
                    </div>
                    <div className="card-volume">
                        ${volume} Vol.
                    </div>
                </div>

                <h3 className="card-title">{title}</h3>

                <MarketChart data={data} color={chartColor} />

                <div className="card-actions">
                    <button className="trade-button yes-button" onClick={(e) => e.preventDefault()}>
                        <span>Yes</span>
                        <span className="trade-prob">{yesProb}¢</span>
                    </button>
                    <button className="trade-button no-button" onClick={(e) => e.preventDefault()}>
                        <span>No</span>
                        <span className="trade-prob">{noProb}¢</span>
                    </button>
                </div>
            </div>
        </Link>
    );
}
