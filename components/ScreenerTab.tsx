"use client"

import { useEffect } from "react";
import { FilterPanel } from "./screener/FilterPanel";
import { WeightSliders } from "./screener/WeightSliders";
import { ResultsTable } from "./screener/ResultsTable";
import { ScoringWeights, PortfolioHolding, PortfolioStats } from "@/types";
import { useScreener } from "@/hooks/useScreener";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";

interface ScreenerTabProps {
  portfolio?: { holdings: PortfolioHolding[]; stats: PortfolioStats };
  onAddToPortfolio?: (symbol: string) => void;
}

export function ScreenerTab({ portfolio, onAddToPortfolio }: ScreenerTabProps) {
  const {
    filters, setFilters,
    weights, setWeights,
    results, isLoading, isLive, lastUpdated, error,
    runScreen, reScore, resetFilters,
    getApiKey,
  } = useScreener();

  const handleWeightsChange = (newWeights: ScoringWeights) => {
    setWeights(newWeights);
    reScore(newWeights, portfolio);
  };

  // Auto-run screen on first load
  useEffect(() => {
    runScreen(portfolio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-72 border-r overflow-y-auto shrink-0 hidden md:block">
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          onRun={() => runScreen(portfolio)}
          onReset={resetFilters}
          isLoading={isLoading}
        />
        <Separator />
        <WeightSliders weights={weights} onWeightsChange={handleWeightsChange} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Status Bar */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          {!isLive && (
            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
              <AlertCircle className="h-3 w-3" />
              Using sample data. Add your FMP API key in Settings for live data.
            </div>
          )}
          {lastUpdated && (
            <span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
          )}
          {error && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
        </div>

        <ResultsTable
          results={results}
          hasPortfolio={!!portfolio?.holdings.length}
          onAddToPortfolio={onAddToPortfolio}
          apiKey={getApiKey()}
        />
      </div>
    </div>
  );
}
