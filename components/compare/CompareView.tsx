"use client"

import { useState } from "react";
import { ScreenerResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StockRadarChart } from "./RadarChart";
import { estimateCorrelation } from "@/lib/correlation";
import { getAllSampleStocks, getSampleStockData } from "@/lib/providers/sample-data";
import { ScoreBar } from "@/components/screener/ScoreBar";
import { X } from "lucide-react";

interface CompareViewProps {
  screenResults: ScreenerResult[];
}

export function CompareView({ screenResults }: CompareViewProps) {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);

  const allStocks = getAllSampleStocks();

  const handleSearch = (value: string) => {
    setSearchInput(value.toUpperCase());
    if (value.length >= 1) {
      const available = allStocks.filter(s =>
        !selectedSymbols.includes(s.symbol) &&
        (s.symbol.startsWith(value.toUpperCase()) || s.name.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5);
      setSuggestions(available.map(s => ({ symbol: s.symbol, name: s.name })));
    } else {
      setSuggestions([]);
    }
  };

  const addStock = (symbol: string) => {
    if (selectedSymbols.length >= 4) return;
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol]);
    }
    setSearchInput('');
    setSuggestions([]);
  };

  const removeStock = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
  };

  // Get data for selected stocks
  const selectedStocks = selectedSymbols.map(sym => {
    const fromResults = screenResults.find(r => r.symbol === sym);
    if (fromResults) return fromResults;

    // Fallback to sample data
    const sample = getSampleStockData(sym);
    if (sample) {
      return {
        ...sample.stock,
        scores: { symbol: sym, compositeScore: 0, growthScore: 0, momentumScore: 0, valuationScore: 0, analystScore: 0, riskScore: 0 },
        quote: sample.quote,
        fundamentals: sample.fundamentals,
        analystData: sample.analyst,
      } as ScreenerResult;
    }
    return null;
  }).filter((s): s is ScreenerResult => s !== null);

  const metrics = [
    { label: 'Price', fn: (s: ScreenerResult) => `$${s.price.toFixed(2)}` },
    { label: 'Market Cap', fn: (s: ScreenerResult) => s.marketCap >= 1e12 ? `$${(s.marketCap / 1e12).toFixed(1)}T` : `$${(s.marketCap / 1e9).toFixed(0)}B` },
    { label: 'Sector', fn: (s: ScreenerResult) => s.sector },
    { label: 'P/E', fn: (s: ScreenerResult) => s.fundamentals.peRatio?.toFixed(1) ?? 'N/A' },
    { label: 'PEG', fn: (s: ScreenerResult) => s.fundamentals.pegRatio?.toFixed(2) ?? 'N/A' },
    { label: 'Rev Growth YoY', fn: (s: ScreenerResult) => s.fundamentals.revenueGrowthYoY ? `${s.fundamentals.revenueGrowthYoY.toFixed(1)}%` : 'N/A' },
    { label: 'EPS Growth', fn: (s: ScreenerResult) => s.fundamentals.epsGrowthYoY ? `${s.fundamentals.epsGrowthYoY.toFixed(1)}%` : 'N/A' },
    { label: 'Beta', fn: (s: ScreenerResult) => s.beta.toFixed(2) },
    { label: 'Analyst Rating', fn: (s: ScreenerResult) => s.analystData.consensusRating },
    { label: 'PT Upside', fn: (s: ScreenerResult) => `${s.analystData.priceTargetUpside.toFixed(1)}%` },
  ];

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {/* Stock selector */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Input
            className="h-8 text-xs font-mono"
            placeholder={selectedSymbols.length >= 4 ? 'Max 4 stocks' : 'Search ticker...'}
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            disabled={selectedSymbols.length >= 4}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
              {suggestions.map(s => (
                <button
                  key={s.symbol}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex justify-between"
                  onClick={() => addStock(s.symbol)}
                >
                  <span className="font-mono font-bold">{s.symbol}</span>
                  <span className="text-muted-foreground truncate ml-2">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected stocks badges */}
      <div className="flex gap-2 flex-wrap">
        {selectedSymbols.map(sym => (
          <Badge key={sym} variant="secondary" className="gap-1 text-xs">
            {sym}
            <button onClick={() => removeStock(sym)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {selectedStocks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Select up to 4 stocks to compare side-by-side</p>
        </div>
      ) : (
        <>
          {/* Radar Chart */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Factor Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <StockRadarChart stocks={selectedStocks} />
            </CardContent>
          </Card>

          {/* Metrics Table */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Metric</TableHead>
                    {selectedStocks.map(s => (
                      <TableHead key={s.symbol} className="text-xs font-mono">{s.symbol}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Composite Score Row */}
                  <TableRow>
                    <TableCell className="text-xs font-medium">Composite Score</TableCell>
                    {selectedStocks.map(s => (
                      <TableCell key={s.symbol}><ScoreBar score={s.scores.compositeScore} size="sm" /></TableCell>
                    ))}
                  </TableRow>
                  {metrics.map(m => (
                    <TableRow key={m.label}>
                      <TableCell className="text-xs text-muted-foreground">{m.label}</TableCell>
                      {selectedStocks.map(s => (
                        <TableCell key={s.symbol} className="text-xs font-mono">{m.fn(s)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Correlation Matrix */}
          {selectedStocks.length >= 2 && (
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">Correlation Matrix (Sector-Based)</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs"></TableHead>
                      {selectedStocks.map(s => (
                        <TableHead key={s.symbol} className="text-xs font-mono">{s.symbol}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedStocks.map(a => (
                      <TableRow key={a.symbol}>
                        <TableCell className="text-xs font-mono font-bold">{a.symbol}</TableCell>
                        {selectedStocks.map(b => {
                          const corr = estimateCorrelation(a.sector, b.sector);
                          return (
                            <TableCell key={b.symbol} className={`text-xs font-mono ${corr > 0.6 ? 'text-red-500' : corr < 0.3 ? 'text-green-500' : 'text-amber-500'}`}>
                              {corr.toFixed(2)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
