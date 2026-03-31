"use client"

import { useEffect, useState } from "react";
import { ScreenerResult, PricePoint, AnalystData } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface StockDetailCardProps {
  stock: ScreenerResult;
  apiKey?: string;
}

const ANALYST_COLORS = ['#22c55e', '#4ade80', '#facc15', '#f87171', '#ef4444'];

function formatLargeNumber(n: number | null): string {
  if (n === null) return 'N/A';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function formatPercent(n: number | null): string {
  if (n === null) return 'N/A';
  return `${n.toFixed(1)}%`;
}

export function StockDetailCard({ stock, apiKey }: StockDetailCardProps) {
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [analystDetail, setAnalystDetail] = useState<AnalystData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (apiKey) headers['x-fmp-api-key'] = apiKey;

    Promise.all([
      fetch(`/api/stocks/historical?symbol=${stock.symbol}`, { headers }).then(r => r.json()),
      fetch(`/api/stocks/analysts?symbol=${stock.symbol}`, { headers }).then(r => r.json()),
    ]).then(([histData, analystData]) => {
      setPrices(histData.prices || []);
      setAnalystDetail(analystData.analyst || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [stock.symbol, apiKey]);

  const f = stock.fundamentals;
  const analystData = analystDetail || stock.analystData;

  const analystPieData = [
    { name: 'Strong Buy', value: analystData.strongBuy },
    { name: 'Buy', value: analystData.buy },
    { name: 'Hold', value: analystData.hold },
    { name: 'Sell', value: analystData.sell },
    { name: 'Strong Sell', value: analystData.strongSell },
  ].filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
      {/* Fundamentals */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h4 className="text-sm font-semibold mb-3">Fundamentals</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Revenue</span>
              <p className="font-mono">{formatLargeNumber(f.revenue)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Net Income</span>
              <p className="font-mono">{formatLargeNumber(f.netIncome)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">P/E Ratio</span>
              <p className="font-mono">{f.peRatio?.toFixed(1) ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">PEG Ratio</span>
              <p className="font-mono">{f.pegRatio?.toFixed(2) ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">EV/EBITDA</span>
              <p className="font-mono">{f.evToEbitda?.toFixed(1) ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">EPS</span>
              <p className="font-mono">${f.eps?.toFixed(2) ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Gross Margin</span>
              <p className="font-mono">{formatPercent(f.grossMargin)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Net Margin</span>
              <p className="font-mono">{formatPercent(f.netMargin)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Rev Growth YoY</span>
              <p className="font-mono">{formatPercent(f.revenueGrowthYoY)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">EPS Growth YoY</span>
              <p className="font-mono">{formatPercent(f.epsGrowthYoY)}</p>
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-[10px]">Beta: {stock.beta.toFixed(2)}</Badge>
            {stock.scores.portfolioFitScore !== undefined && (
              <Badge variant={stock.scores.sharpeContribution && stock.scores.sharpeContribution > 0 ? 'default' : 'destructive'} className="text-[10px]">
                Sharpe: {stock.scores.sharpeContribution?.toFixed(3) ?? 'N/A'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price Chart */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">6-Month Price</h4>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>
          ) : prices.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={prices}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={45} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222, 20%, 8%)', border: '1px solid hsl(217, 19%, 18%)', fontSize: '12px' }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
                />
                <Line type="monotone" dataKey="close" stroke="hsl(142, 71%, 45%)" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No price data</div>
          )}
        </CardContent>
      </Card>

      {/* Analyst Ratings */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">Analyst Ratings</h4>
          <div className="flex items-center gap-4">
            <div className="w-28 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analystPieData} cx="50%" cy="50%" innerRadius={20} outerRadius={40} dataKey="value">
                    {analystPieData.map((_, i) => (
                      <Cell key={i} fill={ANALYST_COLORS[i % ANALYST_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(222, 20%, 8%)', border: '1px solid hsl(217, 19%, 18%)', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 text-xs">
              <div>Consensus: <span className="font-semibold">{analystData.consensusRating}</span></div>
              <div>Target: <span className="font-mono">${analystData.priceTarget.toFixed(0)}</span></div>
              <div>Upside: <span className={`font-mono ${analystData.priceTargetUpside > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {analystData.priceTargetUpside.toFixed(1)}%
              </span></div>
              <div>Analysts: {analystData.numberOfAnalysts}</div>
              <div className="text-[10px] text-muted-foreground">
                90d: +{analystData.upgradesLast90} / -{analystData.downgradesLast90}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
