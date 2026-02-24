"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchMarkets, formatVolume, type Market } from "@/lib/api";
import LightweightChart from "./LightweightChart";

export default function FeaturedCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 8000 })]);
    const [featured, setFeatured] = useState<Market[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            try {
                const markets = await fetchMarkets();
                // Take top 3 by volume
                const top = markets
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 3);
                setFeatured(top);
            } catch (err) {
                console.error("Failed to load featured:", err);
            }
        };
        load();
    }, []);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setCurrentIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi, setCurrentIndex]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    if (featured.length === 0) {
        return (
            <div className="carousel-wrapper" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-secondary">Loading featured markets...</span>
            </div>
        );
    }

    return (
        <div className="carousel-wrapper" style={{ position: 'relative', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Featured Events</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {currentIndex + 1} of {featured.length}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={scrollPrev}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={scrollNext}
                            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="embla" ref={emblaRef}>
                <div className="embla__container">
                    {featured.map((market) => (
                        <div className="embla__slide" key={market.id}>
                            <div
                                style={{ display: 'flex', flexDirection: 'column', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                                onClick={() => router.push(`/market/${market.id}`)}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '3rem' }}>

                                    {/* Left Column */}
                                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '40%' }}>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, lineHeight: 1.2, color: 'var(--text-primary)' }}>{market.question}</h2>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }}></div>
                                            LIVE
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {/* Yes Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dotted var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-yes)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>Y</div>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Yes</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    <button className="button-primary" style={{ minWidth: '80px', padding: '10px', fontSize: '1rem' }} onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}`); }}>{Math.round(market.yesPrice)}¢</button>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, width: '60px', textAlign: 'right', color: 'var(--accent-yes)' }}>{Math.round(market.yesPrice)}%</span>
                                                </div>
                                            </div>

                                            {/* No Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dotted var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-no)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>N</div>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>No</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    <button className="button-primary" style={{ background: 'var(--accent-no)', minWidth: '80px', padding: '10px', fontSize: '1rem' }} onClick={(e) => { e.stopPropagation(); router.push(`/market/${market.id}`); }}>{Math.round(market.noPrice)}¢</button>
                                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, width: '60px', textAlign: 'right', color: 'var(--accent-no)' }}>{Math.round(market.noPrice)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                            <span>${formatVolume(market.volume)} vol</span>
                                            <span>•</span>
                                            <span>{new Date(market.resolutionDate).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{market.category}</span>
                                        </div>

                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '1rem', lineHeight: 1.5 }}>
                                            <strong style={{ color: 'var(--text-primary)' }}>News</strong> · {market.description.length > 200 ? market.description.substring(0, 200) + '...' : market.description}
                                        </div>
                                    </div>

                                    {/* Right Column (Chart) */}
                                    <div style={{ flex: '1', minHeight: '350px', background: 'var(--bg-primary)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            <span>PROBABILITY (YES)</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>100%</span>
                                        </div>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            {market.priceHistory && market.priceHistory.length > 0 ? (
                                                <LightweightChart
                                                    data={market.priceHistory.map(p => ({ time: new Date(p.timestamp).getTime() / 1000 as any, value: p.yesPrice }))}
                                                    color="var(--accent-yes)"
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                                                    Not enough price history yet
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            <span>{market.priceHistory && market.priceHistory.length > 0 ? new Date(market.priceHistory[0].timestamp).toLocaleDateString() : ''}</span>
                                            <span>0%</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
