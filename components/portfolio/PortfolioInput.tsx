"use client"

import { useState, useRef } from "react";
import { PortfolioHolding } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Upload, Download, Plus } from "lucide-react";
import { getAllSampleStocks } from "@/lib/providers/sample-data";

interface PortfolioInputProps {
  holdings: PortfolioHolding[];
  onAdd: (holding: PortfolioHolding) => void;
  onRemove: (symbol: string) => void;
  onUpdate: (symbol: string, updates: Partial<PortfolioHolding>) => void;
  onImport: (json: string) => void;
  onExport: () => string;
  onClear: () => void;
}

export function PortfolioInput({ holdings, onAdd, onRemove, onUpdate, onImport, onExport, onClear }: PortfolioInputProps) {
  const [ticker, setTicker] = useState('');
  const [amount, setAmount] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string; sector: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allStocks = getAllSampleStocks();

  const handleTickerChange = (value: string) => {
    setTicker(value.toUpperCase());
    if (value.length >= 1) {
      const filtered = allStocks
        .filter(s => s.symbol.startsWith(value.toUpperCase()) || s.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered.map(s => ({ symbol: s.symbol, name: s.name, sector: s.sector })));
    } else {
      setSuggestions([]);
    }
  };

  const handleAdd = () => {
    if (!ticker || !amount) return;
    const stock = allStocks.find(s => s.symbol === ticker);
    const newHolding: PortfolioHolding = {
      symbol: ticker,
      name: stock?.name || ticker,
      sector: stock?.sector || 'Unknown',
      amount: parseFloat(amount),
      weight: 0,
      price: stock?.price || 0,
      beta: stock?.beta || 1,
    };
    onAdd(newHolding);
    setTicker('');
    setAmount('');
    setSuggestions([]);
  };

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        onImport(ev.target?.result as string);
      } catch {
        alert('Invalid portfolio file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Add holding form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Label className="text-xs text-muted-foreground">Ticker</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="AAPL"
            value={ticker}
            onChange={e => handleTickerChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.symbol}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex justify-between"
                  onClick={() => { setTicker(s.symbol); setSuggestions([]); }}
                >
                  <span className="font-mono font-bold">{s.symbol}</span>
                  <span className="text-muted-foreground truncate ml-2">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="w-32">
          <Label className="text-xs text-muted-foreground">Amount ($)</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="10000"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <Button size="sm" className="h-8" onClick={handleAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-3 w-3" /> Import
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExport} disabled={holdings.length === 0}>
          <Download className="h-3 w-3" /> Export
        </Button>
        {holdings.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>

      {/* Holdings table */}
      {holdings.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs px-3 py-2">Ticker</TableHead>
                <TableHead className="text-xs px-3 py-2">Name</TableHead>
                <TableHead className="text-xs px-3 py-2">Sector</TableHead>
                <TableHead className="text-xs px-3 py-2 text-right">Amount</TableHead>
                <TableHead className="text-xs px-3 py-2 text-right">Weight</TableHead>
                <TableHead className="text-xs px-3 py-2 text-right">Beta</TableHead>
                <TableHead className="text-xs px-3 py-2 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map(h => (
                <TableRow key={h.symbol}>
                  <TableCell className="px-3 py-1.5 font-mono font-bold text-xs">{h.symbol}</TableCell>
                  <TableCell className="px-3 py-1.5 text-xs truncate max-w-[120px]">{h.name}</TableCell>
                  <TableCell className="px-3 py-1.5 text-xs">{h.sector}</TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-right font-mono">
                    <Input
                      className="h-6 w-20 text-xs font-mono text-right ml-auto"
                      type="number"
                      value={h.amount}
                      onChange={e => onUpdate(h.symbol, { amount: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-right font-mono">
                    {(h.weight * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="px-3 py-1.5 text-xs text-right font-mono">{h.beta.toFixed(2)}</TableCell>
                  <TableCell className="px-3 py-1.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemove(h.symbol)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
