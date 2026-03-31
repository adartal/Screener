"use client"

import { ScreenerResult, PortfolioHolding, PortfolioStats } from "@/types";
import { CompareView } from "./compare/CompareView";
import { WhatIfSimulator } from "./compare/WhatIfSimulator";
import { Separator } from "@/components/ui/separator";

interface CompareTabProps {
  screenResults: ScreenerResult[];
  holdings: PortfolioHolding[];
  portfolioStats: PortfolioStats;
  onAddToPortfolio: (holding: PortfolioHolding) => void;
}

export function CompareTab({ screenResults, holdings, portfolioStats, onAddToPortfolio }: CompareTabProps) {
  return (
    <div className="space-y-6">
      <CompareView screenResults={screenResults} />
      {holdings.length > 0 && (
        <>
          <Separator className="mx-4" />
          <div className="px-4 max-w-6xl mx-auto">
            <WhatIfSimulator
              holdings={holdings}
              portfolioStats={portfolioStats}
              onAddToPortfolio={onAddToPortfolio}
            />
          </div>
        </>
      )}
    </div>
  );
}
