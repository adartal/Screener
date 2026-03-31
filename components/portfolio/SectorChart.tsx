"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SectorChartProps {
  sectorBreakdown: Record<string, number>;
}

const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#ef4444',
  'Financials': '#22c55e',
  'Consumer Discretionary': '#f97316',
  'Communication Services': '#a855f7',
  'Industrials': '#6b7280',
  'Consumer Staples': '#14b8a6',
  'Energy': '#eab308',
  'Utilities': '#64748b',
  'Real Estate': '#ec4899',
  'Materials': '#8b5cf6',
};

export function SectorChart({ sectorBreakdown }: SectorChartProps) {
  const data = Object.entries(sectorBreakdown)
    .filter(([, weight]) => weight > 0)
    .map(([sector, weight]) => ({
      name: sector,
      value: Math.round(weight * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">No holdings</div>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={SECTOR_COLORS[entry.name] || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(222, 20%, 8%)',
                border: '1px solid hsl(217, 19%, 18%)',
                fontSize: '12px',
                borderRadius: '6px',
              }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1">
        {data.map(entry => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: SECTOR_COLORS[entry.name] || '#6b7280' }}
            />
            <span className="truncate max-w-[100px]">{entry.name}</span>
            <span className={`font-mono ml-auto ${entry.value > 40 ? 'text-amber-500' : ''} ${entry.value > 60 ? 'text-red-500' : ''}`}>
              {entry.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
