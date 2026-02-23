"use client";

import { useState, useEffect } from "react";
import DepositModal from "@/components/DepositModal";
import Navbar from "@/components/Navbar";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import MarketCard from "@/components/MarketCard";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { fetchMarkets, formatVolume, type Market } from "@/lib/api";

export default function Home() {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMarkets = async () => {
      setLoading(true);
      try {
        const categoryParam = activeCategory === "all" || activeCategory === "trending"
          ? undefined
          : activeCategory;
        const data = await fetchMarkets(categoryParam);
        setMarkets(data);
      } catch (error) {
        console.error("Failed to load markets:", error);
      } finally {
        setLoading(false);
      }
    };
    loadMarkets();
  }, [activeCategory]);

  const getCategoryTitle = () => {
    if (activeCategory === "all") return "Popular Markets";
    if (activeCategory === "trending") return "Trending Markets";
    return `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Markets`;
  };

  const getIconType = (category: string): 'crypto' | 'politics' | 'tech' | 'sports' | 'pop' => {
    const map: Record<string, 'crypto' | 'politics' | 'tech' | 'sports' | 'pop'> = {
      crypto: 'crypto',
      politics: 'politics',
      tech: 'tech',
      sports: 'sports',
      pop: 'pop',
    };
    return map[category] || 'tech';
  };

  return (
    <>
      <Navbar onDepositClick={() => setIsDepositOpen(true)} />
      <div className="app-layout">
        <Sidebar activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

        <main className="main-content">
          {(activeCategory === "all" || activeCategory === "trending") && <FeaturedCarousel />}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              {getCategoryTitle()}
            </h2>
          </div>

          <div className="market-grid">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="market-card" style={{ minHeight: '220px', opacity: 0.5 }}>
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Loading...
                  </div>
                </div>
              ))
            ) : markets.length > 0 ? (
              markets.map((m) => (
                <MarketCard
                  key={m.id}
                  id={m.id}
                  title={m.question}
                  volume={formatVolume(m.volume)}
                  yesProb={Math.round(m.yesPrice)}
                  noProb={Math.round(m.noPrice)}
                  iconType={getIconType(m.category)}
                />
              ))
            ) : (
              <div style={{ color: "var(--text-secondary)", marginTop: "2rem" }}>
                No markets found for this category.
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
      {isDepositOpen && <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />}
    </>
  );
}
