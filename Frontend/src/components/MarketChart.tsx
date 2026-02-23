"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MarketChartProps {
    data: { value: number }[];
    color: string;
}

export default function MarketChart({ data, color }: MarketChartProps) {
    // Simple responsive line chart simulating price history momentum
    return (
        <div style={{ width: '100%', minWidth: '200px', height: '40px', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
