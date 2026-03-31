"use client"

import { useState, useEffect, useCallback } from 'react';
import { PortfolioHolding, PortfolioStats } from '@/types';
import { computePortfolioStats } from '@/lib/portfolio-math';

const STORAGE_KEY = 'stock-screener-portfolio';

export function usePortfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHoldings(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
    } catch {
      // Ignore storage errors
    }
  }, [holdings, isLoaded]);

  const addHolding = useCallback((holding: PortfolioHolding) => {
    setHoldings(prev => {
      const existing = prev.find(h => h.symbol === holding.symbol);
      if (existing) {
        return prev.map(h => h.symbol === holding.symbol ? { ...h, amount: h.amount + holding.amount } : h);
      }
      return [...prev, holding];
    });
  }, []);

  const removeHolding = useCallback((symbol: string) => {
    setHoldings(prev => prev.filter(h => h.symbol !== symbol));
  }, []);

  const updateHolding = useCallback((symbol: string, updates: Partial<PortfolioHolding>) => {
    setHoldings(prev => prev.map(h => h.symbol === symbol ? { ...h, ...updates } : h));
  }, []);

  const clearPortfolio = useCallback(() => {
    setHoldings([]);
  }, []);

  const importPortfolio = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        setHoldings(data);
      }
    } catch {
      throw new Error('Invalid portfolio JSON');
    }
  }, []);

  const exportPortfolio = useCallback(() => {
    return JSON.stringify(holdings, null, 2);
  }, [holdings]);

  // Compute stats with normalized weights
  const totalValue = holdings.reduce((sum, h) => sum + h.amount, 0);
  const normalizedHoldings = holdings.map(h => ({
    ...h,
    weight: totalValue > 0 ? h.amount / totalValue : 0,
  }));

  const portfolioStats: PortfolioStats = computePortfolioStats(normalizedHoldings);

  return {
    holdings: normalizedHoldings,
    portfolioStats,
    addHolding,
    removeHolding,
    updateHolding,
    clearPortfolio,
    importPortfolio,
    exportPortfolio,
    isLoaded,
  };
}
