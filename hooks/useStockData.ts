"use client"

import { useState, useCallback } from 'react';
import { StockQuote, StockFundamentals, AnalystData, PricePoint } from '@/types';

interface StockDataState {
  quotes: Map<string, StockQuote>;
  fundamentals: Map<string, StockFundamentals>;
  analysts: Map<string, AnalystData>;
  historical: Map<string, PricePoint[]>;
}

export function useStockData() {
  const [data, setData] = useState<StockDataState>({
    quotes: new Map(),
    fundamentals: new Map(),
    analysts: new Map(),
    historical: new Map(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApiKey = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fmp-api-key') || undefined;
    }
    return undefined;
  }, []);

  const headers = useCallback(() => {
    const h: Record<string, string> = {};
    const key = getApiKey();
    if (key) h['x-fmp-api-key'] = key;
    return h;
  }, [getApiKey]);

  const fetchQuotes = useCallback(async (symbols: string[]): Promise<Map<string, StockQuote>> => {
    const batchSize = 50;
    const allQuotes = new Map<string, StockQuote>();

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const res = await fetch(`/api/stocks/quote?symbols=${batch.join(',')}`, { headers: headers() });
      const json = await res.json();
      if (json.quotes) {
        for (const q of json.quotes) {
          allQuotes.set(q.symbol, q);
        }
      }
    }

    return allQuotes;
  }, [headers]);

  const fetchFundamentals = useCallback(async (symbol: string): Promise<StockFundamentals> => {
    const res = await fetch(`/api/stocks/fundamentals?symbol=${symbol}`, { headers: headers() });
    const json = await res.json();
    return json.fundamentals;
  }, [headers]);

  const fetchAnalysts = useCallback(async (symbol: string): Promise<AnalystData> => {
    const res = await fetch(`/api/stocks/analysts?symbol=${symbol}`, { headers: headers() });
    const json = await res.json();
    return json.analyst;
  }, [headers]);

  const fetchHistorical = useCallback(async (symbol: string): Promise<PricePoint[]> => {
    const res = await fetch(`/api/stocks/historical?symbol=${symbol}`, { headers: headers() });
    const json = await res.json();
    return json.prices || [];
  }, [headers]);

  const fetchAllData = useCallback(async (symbols: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch quotes in batch
      const quotes = await fetchQuotes(symbols);

      // Fetch fundamentals and analysts in parallel (limited concurrency)
      const fundamentals = new Map<string, StockFundamentals>();
      const analysts = new Map<string, AnalystData>();
      const historical = new Map<string, PricePoint[]>();

      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        await Promise.all(batch.map(async (symbol) => {
          try {
            const [fund, anal, hist] = await Promise.all([
              fetchFundamentals(symbol),
              fetchAnalysts(symbol),
              fetchHistorical(symbol),
            ]);
            fundamentals.set(symbol, fund);
            analysts.set(symbol, anal);
            historical.set(symbol, hist);
          } catch {
            // Skip stocks that fail to fetch
          }
        }));
      }

      setData({ quotes, fundamentals, analysts, historical });
      return { quotes, fundamentals, analysts, historical };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch stock data';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchQuotes, fetchFundamentals, fetchAnalysts, fetchHistorical]);

  return { data, isLoading, error, fetchAllData, getApiKey };
}
