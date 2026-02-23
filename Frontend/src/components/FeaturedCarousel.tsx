"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback } from "react";
import { Flame, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import LightweightChart from "./LightweightChart";

export default function FeaturedCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 6000 })]);

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev();
    }, [emblaApi]);

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext();
    }, [emblaApi]);

    const mockChartDataAGI = Array.from({ length: 28 }, (_, i) => ({
        time: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        value: 20 + Math.sin(i / 10) * 10 + i * 0.2
    }));

    const mockChartDataSpaceX = Array.from({ length: 28 }, (_, i) => ({
        time: `2024-01-${(i + 1).toString().padStart(2, '0')}`,
        value: 50 + Math.cos(i / 5) * 15 - i * 0.1
    }));

    const featuredData = [
        {
            id: 1,
            title: "Will Artificial General Intelligence (AGI) be achieved by 2027?",
            volume: "$14.2M",
            description: "This market resolves to 'Yes' if OpenAI, Google, or Anthropic publicly announce the successful creation of an AGI system before Jan 1, 2028.",
            yesProb: "34¢",
            noProb: "66¢",
            badge: <span className="trending-badge"><Flame size={16} color="#ef4444" fill="#ef4444" /> Trending Now</span>,
            chartData: mockChartDataAGI,
            chartColor: "rgba(33, 81, 245, 0.4)" // Blue for AGI upward momentum
        },
        {
            id: 2,
            title: "Will SpaceX land humans on Mars by 2030?",
            volume: "$18.2M",
            description: "Resolves to 'Yes' if humans successfully touch down on the Martian surface as part of a SpaceX mission before Dec 31, 2030.",
            yesProb: "42¢",
            noProb: "58¢",
            badge: <span className="trending-badge"><Rocket size={16} color="#f59e0b" /> Space Race</span>,
            chartData: mockChartDataSpaceX,
            chartColor: "rgba(226, 44, 44, 0.4)" // Red for downward/volatile momentum
        }
    ];

    return (
        <div className="carousel-wrapper">
            <div className="embla" ref={emblaRef}>
                <div className="embla__container">
                    {featuredData.map((data) => (
                        <div className="embla__slide" key={data.id}>
                            <div className="featured-market">
                                <div className="featured-content">
                                    <div className="featured-header">
                                        {data.badge}
                                        <span style={{ color: "var(--border)" }}>•</span>
                                        <span className="featured-volume">{data.volume} Vol.</span>
                                    </div>
                                    <h2 className="featured-title">{data.title}</h2>
                                    <p className="featured-description">{data.description}</p>
                                    <div className="featured-actions">
                                        <button className="button-primary featured-btn" style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Buy Yes</span>
                                            <span>{data.yesProb}</span>
                                        </button>
                                        <button className="button-primary featured-btn" style={{ flex: 1, background: 'var(--accent-no)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Buy No</span>
                                            <span>{data.noProb}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="featured-visual" style={{
                                    background: `linear-gradient(90deg, transparent 0%, ${data.chartColor.replace('0.4', '0.05')} 100%)`,
                                    padding: '2rem 2rem 0 0', opacity: 1, overflow: 'hidden'
                                }}>
                                    <LightweightChart data={data.chartData} color={data.chartColor} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <button className="carousel-control prev" onClick={scrollPrev}>
                <ChevronLeft size={20} />
            </button>
            <button className="carousel-control next" onClick={scrollNext}>
                <ChevronRight size={20} />
            </button>
        </div>
    );
}
