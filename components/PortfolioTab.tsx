"use client"

import { PortfolioInput } from "./portfolio/PortfolioInput";
import { PortfolioStatsDisplay } from "./portfolio/PortfolioStats";
import { SectorChart } from "./portfolio/SectorChart";
import { PortfolioHolding, PortfolioStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Briefcase, BarChart3 } from "lucide-react";

interface PortfolioTabProps {
  holdings: PortfolioHolding[];
  stats: PortfolioStats;
  onAdd: (holding: PortfolioHolding) => void;
  onRemove: (symbol: string) => void;
  onUpdate: (symbol: string, updates: Partial<PortfolioHolding>) => void;
  onImport: (json: string) => void;
  onExport: () => string;
  onClear: () => void;
  onAnalyze: () => void;
}

export function PortfolioTab({
  holdings, stats, onAdd, onRemove, onUpdate, onImport, onExport, onClear, onAnalyze,
}: PortfolioTabProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
        <Briefcase className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Portfolio Holdings</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Add your current holdings to get portfolio-aware stock recommendations.
          The screener will rank stocks by how much they improve your portfolio diversification.
        </p>
        <div className="w-full max-w-xl">
          <PortfolioInput
            holdings={holdings}
            onAdd={onAdd}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onImport={onImport}
            onExport={onExport}
            onClear={onClear}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {/* Stats */}
      <PortfolioStatsDisplay stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Breakdown */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sector Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <SectorChart sectorBreakdown={stats.sectorBreakdown} />
          </CardContent>
        </Card>

        {/* Holdings Input */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <PortfolioInput
              holdings={holdings}
              onAdd={onAdd}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onImport={onImport}
              onExport={onExport}
              onClear={onClear}
            />
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-center">
        <Button size="lg" onClick={onAnalyze} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Analyze Portfolio & Find Best Stocks
        </Button>
      </div>
    </div>
  );
}
