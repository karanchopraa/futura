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
  const [sortBy, setSortBy] = useState<"volume" | "newest" | "ending">("volume");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory]);

  // Read category from URL on initial load if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category");
      if (cat) {
        setActiveCategory(cat);
      }
    }
  }, []);

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

  // Sort markets locally based on selection
  const sortedMarkets = [...markets].sort((a, b) => {
    if (sortBy === "volume") return b.volume - a.volume;
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "ending") {
      const aTime = new Date(a.resolutionDate).getTime();
      const bTime = new Date(b.resolutionDate).getTime();
      const now = Date.now();
      // If one is already ended/passed, put it at the bottom
      if (aTime < now && bTime >= now) return 1;
      if (bTime < now && aTime >= now) return -1;
      return aTime - bTime;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedMarkets.length / ITEMS_PER_PAGE);
  const paginatedMarkets = (activeCategory === "all" || activeCategory === "trending")
    ? sortedMarkets.slice(0, 20)
    : sortedMarkets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="volume">Highest Volume</option>
                <option value="newest">Newest First</option>
                <option value="ending">Ending Soon</option>
              </select>
            </div>
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
            ) : paginatedMarkets.length > 0 ? (
              paginatedMarkets.map((m) => (
                <MarketCard
                  key={m.id}
                  id={m.id}
                  title={m.question}
                  volume={formatVolume(m.volume)}
                  yesProb={Math.round(m.yesPrice)}
                  noProb={Math.round(m.noPrice)}
                  iconType={getIconType(m.category)}
                  resolved={m.resolved}
                  outcome={m.outcome}
                  resolutionDate={m.resolutionDate}
                  priceChange24h={m.priceHistory?.length ? Math.round((m.yesPrice - m.priceHistory[0].yesPrice)) : ((m.id % 7) - 3)} // Mock change if no history
                />
              ))
            ) : (
              <div style={{ color: "var(--text-secondary)", marginTop: "2rem" }}>
                No markets found for this category.
              </div>
            )}
          </div>

          {activeCategory !== "all" && activeCategory !== "trending" && totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
              <button
                className="button-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="button-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer />
      {isDepositOpen && <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />}
    </>
  );
}
