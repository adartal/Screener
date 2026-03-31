"use client"

import { PortfolioStats as PortfolioStatsType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PortfolioStatsProps {
  stats: PortfolioStatsType;
}

function formatCurrency(n: number): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function PortfolioStatsDisplay({ stats }: PortfolioStatsProps) {
  const metrics = [
    { label: 'Total Value', value: formatCurrency(stats.totalValue), color: '' },
    { label: 'Weighted Beta', value: stats.weightedBeta.toFixed(2), color: stats.weightedBeta > 1.2 ? 'text-amber-500' : '' },
    { label: 'Est. Return', value: `${(stats.estimatedReturn * 100).toFixed(1)}%`, color: stats.estimatedReturn > 0 ? 'text-green-500' : 'text-red-500' },
    { label: 'Est. Volatility', value: `${(stats.estimatedVolatility * 100).toFixed(1)}%`, color: stats.estimatedVolatility > 0.25 ? 'text-amber-500' : '' },
    { label: 'Sharpe Ratio', value: stats.sharpeRatio.toFixed(2), color: stats.sharpeRatio > 0.5 ? 'text-green-500' : stats.sharpeRatio < 0 ? 'text-red-500' : '' },
    { label: 'Max Sector Conc.', value: `${(stats.maxSectorConcentration * 100).toFixed(0)}%`, color: stats.maxSectorConcentration > 0.4 ? 'text-amber-500' : '' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map(m => (
        <Card key={m.label}>
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-[10px] text-muted-foreground font-normal">{m.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <span className={`text-lg font-mono font-bold tabular-nums ${m.color}`}>{m.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
