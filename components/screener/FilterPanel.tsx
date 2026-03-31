"use client"

import { FilterConfig } from "@/types";
import { GICS_SECTORS, MARKET_CAP_OPTIONS, VOLUME_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Filter, RotateCcw, ChevronDown } from "lucide-react";

interface FilterPanelProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  onRun: () => void;
  onReset: () => void;
  isLoading: boolean;
}

export function FilterPanel({ filters, onFiltersChange, onRun, onReset, isLoading }: FilterPanelProps) {
  const update = (partial: Partial<FilterConfig>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const selectedSectorCount = filters.sectors.length;
  const allSelected = selectedSectorCount === GICS_SECTORS.length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Filter className="h-4 w-4" />
        Universe Filters
      </div>

      <Separator />

      {/* Market Cap */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Min Market Cap</Label>
        <Select
          value={String(filters.minMarketCap)}
          onValueChange={v => update({ minMarketCap: Number(v) })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARKET_CAP_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Growth */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-xs text-muted-foreground">Min Revenue Growth YoY</Label>
          <span className="text-xs font-mono tabular-nums">{filters.minRevenueGrowth}%</span>
        </div>
        <Slider
          value={[filters.minRevenueGrowth]}
          onValueChange={([v]) => update({ minRevenueGrowth: v })}
          min={0}
          max={200}
          step={5}
          className="py-1"
        />
      </div>

      {/* Volume */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Min Avg Volume</Label>
        <Select
          value={String(filters.minVolume)}
          onValueChange={v => update({ minVolume: Number(v) })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOLUME_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Analyst Consensus */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Analyst Consensus</Label>
        <Select
          value={filters.analystConsensus}
          onValueChange={v => update({ analystConsensus: v as FilterConfig['analystConsensus'] })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            <SelectItem value="buy">Buy or Strong Buy</SelectItem>
            <SelectItem value="strongBuy">Strong Buy Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sectors */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Sectors</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full h-8 text-xs justify-between">
              {allSelected ? 'All sectors' : `${selectedSectorCount} selected`}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="flex gap-2 mb-2">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => update({ sectors: [...GICS_SECTORS] })}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => update({ sectors: [] })}>
                Clear All
              </Button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {GICS_SECTORS.map(sector => (
                <label key={sector} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={filters.sectors.includes(sector)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        update({ sectors: [...filters.sectors, sector] });
                      } else {
                        update({ sectors: filters.sectors.filter(s => s !== sector) });
                      }
                    }}
                  />
                  {sector}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* International */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Include International ADRs</Label>
        <Switch
          checked={filters.includeInternational}
          onCheckedChange={v => update({ includeInternational: v })}
        />
      </div>

      {/* Exclude Tickers */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Exclude Tickers</Label>
        <Input
          className="h-8 text-xs"
          placeholder="AAPL, MSFT, ..."
          value={filters.excludeTickers.join(', ')}
          onChange={e => update({ excludeTickers: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
        />
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={onRun} disabled={isLoading} className="flex-1 h-9">
          {isLoading ? 'Screening...' : 'Run Screen'}
        </Button>
        <Button variant="outline" onClick={onReset} className="h-9" title="Reset to Defaults">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
