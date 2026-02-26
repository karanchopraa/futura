"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, AreaSeries, Time } from "lightweight-charts";

interface LightweightChartProps {
    data: { time: Time; value: number }[];
    color: string;
}

export default function LightweightChart({ data, color }: LightweightChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "rgba(255, 255, 255, 0.4)",
            },
            grid: {
                vertLines: { color: "transparent" },
                horzLines: { color: "transparent" },
            },
            rightPriceScale: {
                visible: false,
            },
            timeScale: {
                visible: true,
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
            },
            crosshair: {
                mode: 0,
            },
            handleScroll: false,
            handleScale: false,
        });

        const getAlphaColor = (val: string, alpha: number) => {
            if (val.startsWith('rgba')) {
                // e.g. "rgba(41, 98, 255, 1)" -> "rgba(41, 98, 255, 0.4)"
                return val.replace(/,[\s]*[\d\.]+\)$/, `, ${alpha})`);
            }
            if (val.startsWith('rgb')) {
                // e.g. "rgb(41, 98, 255)" -> "rgba(41, 98, 255, 0.4)"
                return val.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
            }
            if (val.startsWith('#')) {
                const hex = val.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return `rgba(41, 98, 255, ${alpha})`;
        };

        const areaSeries = chart.addSeries(AreaSeries, {
            lineColor: color,
            topColor: getAlphaColor(color, 0.4),
            bottomColor: getAlphaColor(color, 0.0),
            lineWidth: 3,
            crosshairMarkerVisible: false,
        });

        // Deduplicate by time and ensure ascending order
        const seen = new Set<number>();
        const cleanData = data
            .filter((d) => {
                const t = d.time as number;
                if (seen.has(t)) return false;
                seen.add(t);
                return true;
            })
            .sort((a, b) => ((a.time as number) < (b.time as number) ? -1 : (a.time as number) > (b.time as number) ? 1 : 0));

        areaSeries.setData(cleanData);

        // Ensure chart auto-zooms to fit newly filtered data points
        setTimeout(() => {
            chart.timeScale().fitContent();
        }, 10);

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [data, color]);

    return <div ref={chartContainerRef} style={{ width: "100%", height: "100%" }} />;
}
