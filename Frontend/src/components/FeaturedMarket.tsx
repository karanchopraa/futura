"use client";

import Image from "next/image";
import { Flame } from "lucide-react";

export default function FeaturedMarket() {
    return (
        <div className="featured-market">
            <div className="featured-content">
                <div className="featured-header">
                    <span className="trending-badge"><Flame size={16} color="#ef4444" fill="#ef4444" /> Trending Now</span>
                    <span style={{ color: "var(--border)" }}>•</span>
                    <span className="featured-volume">$14.2M Vol.</span>
                </div>
                <h2 className="featured-title">
                    Will Artificial General Intelligence (AGI) be achieved by 2027?
                </h2>
                <p className="featured-description">
                    This market resolves to "Yes" if OpenAI, Google, or Anthropic publicly announce the successful creation of an AGI system before Jan 1, 2028.
                </p>

                <div className="featured-actions">
                    <button className="button-primary featured-btn" style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Buy Yes</span>
                        <span>34¢</span>
                    </button>
                    <button className="button-primary featured-btn" style={{ flex: 1, background: 'var(--accent-no)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Buy No</span>
                        <span>66¢</span>
                    </button>
                </div>
            </div>
            <div className="featured-visual">
                <div className="chart-placeholder">
                    {/* We can use CSS to draw a cool line chart here */}
                </div>
            </div>
        </div>
    );
}
