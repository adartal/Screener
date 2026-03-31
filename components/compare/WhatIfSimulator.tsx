"use client"

import { useState } from "react";
import { PortfolioHolding, PortfolioStats } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computePortfolioStats } from "@/lib/portfolio-math";
import { getAllSampleStocks } from "@/lib/providers/sample-data";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface WhatIfSimulatorProps {
  holdings: PortfolioHolding[];
  portfolioStats: PortfolioStats;
  onAddToPortfolio: (holding: PortfolioHolding) => void;
}

export function WhatIfSimulator({ holdings, portfolioStats, onAddToPortfolio }: WhatIfSimulatorProps) {
  const [ticker, setTicker] = useState('');
  const [weight, setWeight] = useState(10);
  const [showResults, setShowResults] = useState(false);

  const allStocks = getAllSampleStocks();

  const simulate = () => {
    if (!ticker) return;
    setShowResults(true);
  };

  const stock = allStocks.find(s => s.symbol === ticker.toUpperCase());

  // Calculate what-if stats
  const whatIfHoldings: PortfolioHolding[] = holdings.length > 0
    ? [
        ...holdings.map(h => ({
          ...h,
          amount: h.amount * (1 - weight / 100),
        })),
        ...(stock ? [{
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          amount: portfolioStats.totalValue * (weight / 100),
          weight: weight / 100,
          price: stock.price,
          beta: stock.beta,
        }] : []),
      ]
    : stock ? [{
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        amount: 10000,
        weight: 1,
        price: stock.price,
        beta: stock.beta,
      }] : [];

  const whatIfStats = computePortfolioStats(whatIfHoldings);

  const delta = {
    return: whatIfStats.estimatedReturn - portfolioStats.estimatedReturn,
    volatility: whatIfStats.estimatedVolatility - portfolioStats.estimatedVolatility,
    sharpe: whatIfStats.sharpeRatio - portfolioStats.sharpeRatio,
    beta: whatIfStats.weightedBeta - portfolioStats.weightedBeta,
  };

  function DeltaIndicator({ value, inverted = false }: { value: number; inverted?: boolean }) {
    const isPositive = inverted ? value < 0 : value > 0;
    if (Math.abs(value) < 0.001) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return isPositive
      ? <TrendingUp className="h-3 w-3 text-green-500" />
      : <TrendingDown className="h-3 w-3 text-red-500" />;
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm">What-If Simulator</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Add Stock</Label>
            <Input
              className="h-8 text-xs font-mono"
              placeholder="NVDA"
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setShowResults(false); }}
            />
          </div>
          <div className="w-32">
            <Label className="text-xs text-muted-foreground">Weight: {weight}%</Label>
            <Slider value={[weight]} onValueChange={([v]) => { setWeight(v); setShowResults(false); }} min={1} max={30} step={1} />
          </div>
          <Button size="sm" className="h-8" onClick={simulate}>Simulate</Button>
        </div>

        {showResults && stock && holdings.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Adding <span className="font-mono font-bold">{stock.symbol}</span> ({stock.name}) at {weight}% weight:
            </p>
            <div className="grid grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Return', current: `${(portfolioStats.estimatedReturn * 100).toFixed(1)}%`, new: `${(whatIfStats.estimatedReturn * 100).toFixed(1)}%`, delta: delta.return },
                { label: 'Volatility', current: `${(portfolioStats.estimatedVolatility * 100).toFixed(1)}%`, new: `${(whatIfStats.estimatedVolatility * 100).toFixed(1)}%`, delta: delta.volatility, inverted: true },
                { label: 'Sharpe', current: portfolioStats.sharpeRatio.toFixed(2), new: whatIfStats.sharpeRatio.toFixed(2), delta: delta.sharpe },
                { label: 'Beta', current: portfolioStats.weightedBeta.toFixed(2), new: whatIfStats.weightedBeta.toFixed(2), delta: delta.beta, inverted: true },
              ].map(m => (
                <div key={m.label} className="space-y-1">
                  <div className="text-muted-foreground">{m.label}</div>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{m.current}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono font-bold">{m.new}</span>
                    <DeltaIndicator value={m.delta} inverted={m.inverted} />
                  </div>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => onAddToPortfolio({
                symbol: stock.symbol, name: stock.name, sector: stock.sector,
                amount: portfolioStats.totalValue * (weight / 100),
                weight: weight / 100, price: stock.price, beta: stock.beta,
              })}
            >
              Add {stock.symbol} to Portfolio
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
