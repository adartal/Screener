"use client"

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScreenerTab } from "@/components/ScreenerTab";
import { PortfolioTab } from "@/components/PortfolioTab";
import { CompareTab } from "@/components/CompareTab";
import { SettingsTab } from "@/components/SettingsTab";
import { usePortfolio } from "@/hooks/usePortfolio";
import { PortfolioHolding, ScreenerResult } from "@/types";
import { BarChart3, Briefcase, GitCompare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { getAllSampleStocks } from "@/lib/providers/sample-data";

export default function Home() {
  const [activeTab, setActiveTab] = useState("screener");
  const [screenResults] = useState<ScreenerResult[]>([]);
  const { theme, setTheme } = useTheme();

  const {
    holdings, portfolioStats,
    addHolding, removeHolding, updateHolding,
    clearPortfolio, importPortfolio, exportPortfolio,
  } = usePortfolio();

  const handleAddToPortfolio = useCallback((symbol: string) => {
    const stock = getAllSampleStocks().find(s => s.symbol === symbol);
    if (stock) {
      addHolding({
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector,
        amount: 10000,
        weight: 0,
        price: stock.price,
        beta: stock.beta,
      });
    }
  }, [addHolding]);

  const handleAnalyze = useCallback(() => {
    setActiveTab("screener");
  }, []);

  const handleAddHoldingFromWhatIf = useCallback((holding: PortfolioHolding) => {
    addHolding(holding);
  }, [addHolding]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-bold">Stock Screener</h1>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Portfolio-Aware</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b px-4">
          <TabsList className="h-9 bg-transparent p-0 gap-4">
            <TabsTrigger value="screener" className="px-0 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Screener
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="px-0 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Portfolio
              {holdings.length > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{holdings.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="compare" className="px-0 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="settings" className="px-0 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="screener" className="mt-0">
          <ScreenerTab
            portfolio={holdings.length > 0 ? { holdings, stats: portfolioStats } : undefined}
            onAddToPortfolio={handleAddToPortfolio}
          />
        </TabsContent>

        <TabsContent value="portfolio" className="mt-0">
          <PortfolioTab
            holdings={holdings}
            stats={portfolioStats}
            onAdd={addHolding}
            onRemove={removeHolding}
            onUpdate={updateHolding}
            onImport={importPortfolio}
            onExport={exportPortfolio}
            onClear={clearPortfolio}
            onAnalyze={handleAnalyze}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-0">
          <CompareTab
            screenResults={screenResults}
            holdings={holdings}
            portfolioStats={portfolioStats}
            onAddToPortfolio={handleAddHoldingFromWhatIf}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
