"use client"

import { useState, useCallback } from 'react';
import { FilterConfig, ScoringWeights, ScreenerResult, Stock, StockWithMetrics, PortfolioHolding, PortfolioStats } from '@/types';
import { DEFAULT_FILTERS, DEFAULT_WEIGHTS } from '@/lib/constants';
import { computeAllScores } from '@/lib/scoring/composite';
import { computePortfolioAdjustedScores } from '@/lib/scoring/portfolio-fit';
import { computeMaxDrawdown, computeVolatility, computeRelativePerformance } from '@/lib/scoring/metrics';
import { useStockData } from './useStockData';

export function useScreener() {
  const [filters, setFilters] = useState<FilterConfig>(DEFAULT_FILTERS);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stocksWithMetrics, setStocksWithMetrics] = useState<StockWithMetrics[]>([]);
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { fetchAllData, getApiKey } = useStockData();

  const runScreen = useCallback(async (portfolio?: { holdings: PortfolioHolding[]; stats: PortfolioStats }) => {
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Fetch screener results (Layer 1 filtering)
      const apiKey = getApiKey();
      const queryHeaders: Record<string, string> = {};
      if (apiKey) queryHeaders['x-fmp-api-key'] = apiKey;

      const params = new URLSearchParams({
        minMarketCap: String(filters.minMarketCap),
        minRevenueGrowth: String(filters.minRevenueGrowth),
        minVolume: String(filters.minVolume),
        analystConsensus: filters.analystConsensus,
        sectors: filters.sectors.join(','),
        includeInternational: String(filters.includeInternational),
        excludeTickers: filters.excludeTickers.join(','),
      });

      const screenRes = await fetch(`/api/stocks/screen?${params}`, { headers: queryHeaders });
      const screenData = await screenRes.json();
      if (screenData.error) throw new Error(screenData.error);

      const screenedStocks: Stock[] = screenData.stocks;
      setStocks(screenedStocks);
      setIsLive(screenData.isLive);

      if (screenedStocks.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch detailed data for all stocks
      const symbols = screenedStocks.map(s => s.symbol);
      const allData = await fetchAllData(symbols);

      // Step 3: Build StockWithMetrics
      const swm: StockWithMetrics[] = screenedStocks.map(stock => {
        const quote = allData.quotes.get(stock.symbol) || {
          symbol: stock.symbol, price: stock.price, change: 0, changePercent: 0,
          volume: stock.volume, avgVolume: stock.volume, dayHigh: stock.price, dayLow: stock.price,
          fiftyDayMA: stock.price, twoHundredDayMA: stock.price, yearHigh: stock.price, yearLow: stock.price,
          marketCap: stock.marketCap,
        };
        const fundamentals = allData.fundamentals.get(stock.symbol) || {
          symbol: stock.symbol, revenueGrowthQoQ: null, revenueGrowthYoY: null, epsGrowthYoY: null,
          revenueGrowthAcceleration: null, peRatio: null, forwardPE: null, pegRatio: null, evToEbitda: null,
          sectorMedianPE: null, sectorMedianEvEbitda: null, revenue: null, netIncome: null, eps: null,
          grossMargin: null, operatingMargin: null, netMargin: null,
        };
        const analystData = allData.analysts.get(stock.symbol) || {
          symbol: stock.symbol, strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0,
          consensusRating: 'N/A', priceTarget: 0, numberOfAnalysts: 0,
          upgradesLast90: 0, downgradesLast90: 0, priceTargetUpside: 0,
        };
        const historicalPrices = allData.historical.get(stock.symbol) || [];

        return {
          ...stock,
          price: quote.price || stock.price,
          quote,
          fundamentals,
          analystData,
          historicalPrices,
          maxDrawdown6M: computeMaxDrawdown(historicalPrices),
          volatility6M: computeVolatility(historicalPrices),
          relativePerformance6M: computeRelativePerformance(historicalPrices),
        };
      }).filter(s => s.fundamentals && s.analystData);

      setStocksWithMetrics(swm);

      // Step 4: Score all stocks
      let scores = computeAllScores(swm, weights);

      // Step 5: Apply portfolio adjustments if portfolio exists
      if (portfolio && portfolio.holdings.length > 0) {
        scores = computePortfolioAdjustedScores(scores, swm, portfolio.holdings, portfolio.stats);
      }

      // Step 6: Build final results
      const finalResults: ScreenerResult[] = swm.map(stock => ({
        ...stock,
        scores: scores.get(stock.symbol) || {
          symbol: stock.symbol, compositeScore: 0, growthScore: 0, momentumScore: 0,
          valuationScore: 0, analystScore: 0, riskScore: 0,
        },
        quote: stock.quote,
        fundamentals: stock.fundamentals,
        analystData: stock.analystData,
      }));

      // Sort by portfolio fit score if portfolio, else composite
      finalResults.sort((a, b) => {
        const scoreA = portfolio?.holdings.length ? (a.scores.portfolioFitScore ?? a.scores.compositeScore) : a.scores.compositeScore;
        const scoreB = portfolio?.holdings.length ? (b.scores.portfolioFitScore ?? b.scores.compositeScore) : b.scores.compositeScore;
        return scoreB - scoreA;
      });

      setResults(finalResults);
      setLastUpdated(Date.now());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Screening failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters, weights, fetchAllData, getApiKey]);

  // Re-score with new weights without refetching data
  const reScore = useCallback((newWeights: ScoringWeights, portfolio?: { holdings: PortfolioHolding[]; stats: PortfolioStats }) => {
    if (stocksWithMetrics.length === 0) return;

    let scores = computeAllScores(stocksWithMetrics, newWeights);

    if (portfolio && portfolio.holdings.length > 0) {
      scores = computePortfolioAdjustedScores(scores, stocksWithMetrics, portfolio.holdings, portfolio.stats);
    }

    const finalResults: ScreenerResult[] = stocksWithMetrics.map(stock => ({
      ...stock,
      scores: scores.get(stock.symbol) || {
        symbol: stock.symbol, compositeScore: 0, growthScore: 0, momentumScore: 0,
        valuationScore: 0, analystScore: 0, riskScore: 0,
      },
      quote: stock.quote,
      fundamentals: stock.fundamentals,
      analystData: stock.analystData,
    }));

    finalResults.sort((a, b) => {
      const scoreA = portfolio?.holdings.length ? (a.scores.portfolioFitScore ?? a.scores.compositeScore) : a.scores.compositeScore;
      const scoreB = portfolio?.holdings.length ? (b.scores.portfolioFitScore ?? b.scores.compositeScore) : b.scores.compositeScore;
      return scoreB - scoreA;
    });

    setResults(finalResults);
  }, [stocksWithMetrics]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setWeights(DEFAULT_WEIGHTS);
  }, []);

  return {
    filters, setFilters,
    weights, setWeights,
    results, stocks,
    isLoading, isLive, lastUpdated, error,
    runScreen, reScore, resetFilters,
    getApiKey,
  };
}
