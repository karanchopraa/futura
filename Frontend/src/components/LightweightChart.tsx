"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, LineSeries, Time } from "lightweight-charts";

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

        const lineSeries = chart.addSeries(LineSeries, {
            color: color,
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

        lineSeries.setData(cleanData);

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
