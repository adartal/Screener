"use client"

import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { StockScore } from "@/types";

interface RadarChartProps {
  stocks: Array<{ symbol: string; scores: StockScore }>;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f97316'];

export function StockRadarChart({ stocks }: RadarChartProps) {
  if (stocks.length === 0) return null;

  const data = [
    { dimension: 'Growth', ...Object.fromEntries(stocks.map(s => [s.symbol, s.scores.growthScore])) },
    { dimension: 'Momentum', ...Object.fromEntries(stocks.map(s => [s.symbol, s.scores.momentumScore])) },
    { dimension: 'Valuation', ...Object.fromEntries(stocks.map(s => [s.symbol, s.scores.valuationScore])) },
    { dimension: 'Analyst', ...Object.fromEntries(stocks.map(s => [s.symbol, s.scores.analystScore])) },
    { dimension: 'Risk', ...Object.fromEntries(stocks.map(s => [s.symbol, s.scores.riskScore])) },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadarChart data={data}>
        <PolarGrid stroke="hsl(217, 19%, 18%)" />
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(215, 20%, 55%)' }} />
        {stocks.map((s, i) => (
          <Radar
            key={s.symbol}
            name={s.symbol}
            dataKey={s.symbol}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
