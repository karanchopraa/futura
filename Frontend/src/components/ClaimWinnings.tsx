"use client";

import { Trophy } from "lucide-react";

interface ClaimWinningsProps {
    totalClaimable: number;
    claimableMarkets: any[];
}

export default function ClaimWinnings({ totalClaimable, claimableMarkets }: ClaimWinningsProps) {
    if (totalClaimable <= 0) return null;

    const handleClaim = async () => {
        // TODO: Wire to on-chain claimWinnings() for each market
        alert(`Claiming $${totalClaimable.toFixed(2)} from ${claimableMarkets.length} market(s)`);
    };

    return (
        <div className="claim-banner glass-panel">
            <div className="claim-content">
                <Trophy size={28} color="#f59e0b" />
                <div className="claim-text">
                    <h3 style={{ color: "#f59e0b", margin: 0 }}>You have winning positions!</h3>
                    <p className="text-secondary" style={{ margin: 0 }}>
                        Claim your unresolved profits to use them in new markets or withdraw.
                    </p>
                </div>
            </div>
            <button className="button-primary claim-btn" onClick={handleClaim}>
                Claim ${totalClaimable.toFixed(2)} →
            </button>
        </div>
    );
}
