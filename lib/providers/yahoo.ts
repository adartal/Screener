import yahooFinance from 'yahoo-finance2';
import { Stock, StockQuote, StockFundamentals, PricePoint, AnalystData, PriceTarget, FilterConfig, DataProvider } from '@/types';
import { getCached, setCache, getCacheKey } from '@/lib/cache';
import { CACHE_TTLS, GICS_SECTORS } from '@/lib/constants';
import { SampleDataProvider } from './sample-data';

// Suppress yahoo-finance2 validation warnings in production
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (yahooFinance as any).suppressNotices(['yahooSurvey', 'rippieces']);
} catch {
  // Older versions may not support this
}

const sampleFallback = new SampleDataProvider();

// Map Yahoo Finance sector names to our GICS sector names
function mapSector(sector: string | undefined): string {
  if (!sector) return 'Technology';
  const mapping: Record<string, string> = {
    'Technology': 'Technology',
    'Healthcare': 'Healthcare',
    'Financial Services': 'Financials',
    'Financials': 'Financials',
    'Consumer Cyclical': 'Consumer Discretionary',
    'Consumer Defensive': 'Consumer Staples',
    'Communication Services': 'Communication Services',
    'Industrials': 'Industrials',
    'Energy': 'Energy',
    'Utilities': 'Utilities',
    'Real Estate': 'Real Estate',
    'Basic Materials': 'Materials',
  };
  return mapping[sector] || sector;
}

// Default universe of well-known tickers to screen from
const SCREEN_UNIVERSE = [
  // Tech
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AVGO', 'TSM', 'AMD', 'MU',
  'MRVL', 'CRWD', 'PLTR', 'CRM', 'ORCL', 'ADBE', 'NOW', 'ABNB', 'NFLX', 'INTC',
  'QCOM', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'SNPS', 'CDNS', 'PANW', 'FTNT', 'DDOG',
  // Healthcare
  'LLY', 'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'ABBV', 'MRK', 'BMY', 'AMGN',
  'GILD', 'VRTX', 'REGN', 'ISRG', 'MDT',
  // Defense / Industrials
  'RTX', 'LMT', 'NOC', 'GD', 'CAT', 'HON', 'DE', 'BA', 'GE', 'UNP',
  'MMM', 'ETN', 'ITW',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX',
  // Financials
  'JPM', 'GS', 'V', 'MA', 'BAC', 'WFC', 'MS', 'BLK', 'SCHW', 'AXP',
  // Consumer
  'PG', 'KO', 'WMT', 'COST', 'PEP', 'MCD', 'SBUX', 'NKE', 'TGT', 'HD', 'LOW',
  'TSLA', 'TM',
  // Communication Services
  'DIS', 'CMCSA', 'T', 'VZ', 'TMUS',
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP',
  // Real Estate
  'AMT', 'O', 'PLD', 'CCI', 'SPG',
  // Materials
  'LIN', 'APD', 'ECL', 'NEM', 'FCX',
];

export class YahooFinanceProvider implements DataProvider {
  isLive(): boolean { return true; }

  async getScreenerResults(filters: FilterConfig): Promise<Stock[]> {
    const cacheKey = getCacheKey('yahoo-screen', {
      mc: filters.minMarketCap,
      vol: filters.minVolume,
      sectors: filters.sectors.join(','),
    });
    const cached = await getCached<Stock[]>(cacheKey);
    if (cached) return cached.data;

    try {
      // Fetch quotes for our universe in batches
      const results: Stock[] = [];
      const batchSize = 30;

      for (let i = 0; i < SCREEN_UNIVERSE.length; i += batchSize) {
        const batch = SCREEN_UNIVERSE.slice(i, i + batchSize);
        const quotes = await Promise.allSettled(
          batch.map(symbol => yahooFinance.quote(symbol))
        );

        for (const result of quotes) {
          if (result.status !== 'fulfilled' || !result.value) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const q = result.value as any;

          const sector = mapSector(q.sector);
          const marketCap = q.marketCap || 0;
          const volume = q.averageDailyVolume3Month || q.regularMarketVolume || 0;

          // Apply filters
          if (marketCap < filters.minMarketCap) continue;
          if (volume < filters.minVolume) continue;
          if (filters.sectors.length > 0 && filters.sectors.length < GICS_SECTORS.length && !filters.sectors.includes(sector)) continue;
          if (filters.excludeTickers.includes(q.symbol || '')) continue;

          results.push({
            symbol: q.symbol || '',
            name: q.longName || q.shortName || q.symbol || '',
            sector,
            industry: q.industry || 'Unknown',
            price: q.regularMarketPrice || 0,
            marketCap,
            volume,
            beta: q.beta || 1,
          });
        }
      }

      await setCache(cacheKey, results, CACHE_TTLS.screenerList);
      return results;
    } catch (error) {
      console.error('Yahoo Finance screener error:', error);
      return sampleFallback.getScreenerResults(filters);
    }
  }

  async getQuote(symbols: string | string[]): Promise<StockQuote[]> {
    const syms = Array.isArray(symbols) ? symbols : [symbols];
    const results: StockQuote[] = [];

    for (const symbol of syms) {
      const cacheKey = getCacheKey('yahoo-quote', { symbol });
      const cached = await getCached<StockQuote>(cacheKey);
      if (cached) {
        results.push(cached.data);
        continue;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yahooFinance.quote(symbol);
        if (!q) continue;

        const quote: StockQuote = {
          symbol: q.symbol || symbol,
          price: q.regularMarketPrice || 0,
          change: q.regularMarketChange || 0,
          changePercent: q.regularMarketChangePercent || 0,
          volume: q.regularMarketVolume || 0,
          avgVolume: q.averageDailyVolume3Month || 0,
          dayHigh: q.regularMarketDayHigh || 0,
          dayLow: q.regularMarketDayLow || 0,
          fiftyDayMA: q.fiftyDayAverage || 0,
          twoHundredDayMA: q.twoHundredDayAverage || 0,
          yearHigh: q.fiftyTwoWeekHigh || 0,
          yearLow: q.fiftyTwoWeekLow || 0,
          marketCap: q.marketCap || 0,
        };

        await setCache(cacheKey, quote, CACHE_TTLS.quotes);
        results.push(quote);
      } catch {
        const fallback = await sampleFallback.getQuote(symbol);
        results.push(...fallback);
      }
    }

    return results;
  }

  async getFundamentals(symbol: string): Promise<StockFundamentals> {
    const cacheKey = getCacheKey('yahoo-fundamentals', { symbol });
    const cached = await getCached<StockFundamentals>(cacheKey);
    if (cached) return cached.data;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [quoteSummary, quote]: any[] = await Promise.all([
        yahooFinance.quoteSummary(symbol, {
          modules: ['financialData', 'defaultKeyStatistics', 'incomeStatementHistory', 'incomeStatementHistoryQuarterly', 'earningsHistory'],
        }),
        yahooFinance.quote(symbol),
      ]);

      const fd = quoteSummary?.financialData || {};
      const ks = quoteSummary?.defaultKeyStatistics || {};
      const quarterlyIncome = quoteSummary?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];

      let revenueGrowthQoQ: number | null = null;
      let revenueGrowthYoY: number | null = null;
      let epsGrowthYoY: number | null = null;
      let revenueGrowthAcceleration: number | null = null;

      if (quarterlyIncome.length >= 2) {
        const rev0 = quarterlyIncome[0]?.totalRevenue;
        const rev1 = quarterlyIncome[1]?.totalRevenue;
        if (rev0 && rev1 && rev1 !== 0) {
          revenueGrowthQoQ = ((rev0 - rev1) / Math.abs(rev1)) * 100;
        }
      }
      if (quarterlyIncome.length >= 5) {
        const rev0 = quarterlyIncome[0]?.totalRevenue;
        const rev4 = quarterlyIncome[4]?.totalRevenue;
        if (rev0 && rev4 && rev4 !== 0) {
          revenueGrowthYoY = ((rev0 - rev4) / Math.abs(rev4)) * 100;
        }
      }

      // EPS growth from earnings history
      const earningsHist = quoteSummary?.earningsHistory?.history || [];
      if (earningsHist.length >= 4) {
        const eps0 = earningsHist[0]?.epsActual;
        const eps4 = earningsHist[3]?.epsActual;
        if (eps0 != null && eps4 != null && eps4 !== 0) {
          epsGrowthYoY = ((eps0 - eps4) / Math.abs(eps4)) * 100;
        }
      }

      // Revenue growth acceleration
      if (quarterlyIncome.length >= 6) {
        const rev0 = quarterlyIncome[0]?.totalRevenue;
        const rev1 = quarterlyIncome[1]?.totalRevenue;
        const rev4 = quarterlyIncome[4]?.totalRevenue;
        const rev5 = quarterlyIncome[5]?.totalRevenue;
        if (rev0 && rev1 && rev4 && rev5 && rev1 !== 0 && rev5 !== 0) {
          const currentGrowth = (rev0 - rev1) / Math.abs(rev1);
          const priorGrowth = (rev4 - rev5) / Math.abs(rev5);
          revenueGrowthAcceleration = (currentGrowth - priorGrowth) * 100;
        }
      }

      const fundamentals: StockFundamentals = {
        symbol,
        revenueGrowthQoQ,
        revenueGrowthYoY,
        epsGrowthYoY,
        revenueGrowthAcceleration,
        peRatio: quote.trailingPE || ks.trailingPE || null,
        forwardPE: quote.forwardPE || ks.forwardPE || null,
        pegRatio: ks.pegRatio || null,
        evToEbitda: ks.enterpriseToEbitda || null,
        sectorMedianPE: null,
        sectorMedianEvEbitda: null,
        revenue: quarterlyIncome[0]?.totalRevenue || fd.totalRevenue || null,
        netIncome: quarterlyIncome[0]?.netIncome || null,
        eps: earningsHist[0]?.epsActual || null,
        grossMargin: fd.grossMargins != null ? fd.grossMargins * 100 : null,
        operatingMargin: fd.operatingMargins != null ? fd.operatingMargins * 100 : null,
        netMargin: fd.profitMargins != null ? fd.profitMargins * 100 : null,
      };

      await setCache(cacheKey, fundamentals, CACHE_TTLS.fundamentals);
      return fundamentals;
    } catch (error) {
      console.error(`Yahoo Finance fundamentals error for ${symbol}:`, error);
      return sampleFallback.getFundamentals(symbol);
    }
  }

  async getHistoricalPrices(symbol: string, days: number = 180): Promise<PricePoint[]> {
    const cacheKey = getCacheKey('yahoo-historical', { symbol, days });
    const cached = await getCached<PricePoint[]>(cacheKey);
    if (cached) return cached.data;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = await yahooFinance.historical(symbol, {
        period1: startDate.toISOString().split('T')[0],
        period2: endDate.toISOString().split('T')[0],
        interval: '1d',
      });

      const prices: PricePoint[] = result.map(p => ({
        date: typeof p.date === 'string' ? p.date : p.date.toISOString().split('T')[0],
        open: p.open || 0,
        high: p.high || 0,
        low: p.low || 0,
        close: p.close || 0,
        volume: p.volume || 0,
      }));

      await setCache(cacheKey, prices, CACHE_TTLS.historical);
      return prices;
    } catch (error) {
      console.error(`Yahoo Finance historical error for ${symbol}:`, error);
      return sampleFallback.getHistoricalPrices(symbol, days);
    }
  }

  async getAnalystRatings(symbol: string): Promise<AnalystData> {
    const cacheKey = getCacheKey('yahoo-analyst', { symbol });
    const cached = await getCached<AnalystData>(cacheKey);
    if (cached) return cached.data;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [quoteSummary, quote]: any[] = await Promise.all([
        yahooFinance.quoteSummary(symbol, {
          modules: ['recommendationTrend', 'upgradeDowngradeHistory', 'financialData'],
        }),
        yahooFinance.quote(symbol),
      ]);

      const trend = quoteSummary?.recommendationTrend?.trend || [];
      const currentTrend = trend[0] || {};

      const strongBuy = currentTrend.strongBuy || 0;
      const buy = currentTrend.buy || 0;
      const hold = currentTrend.hold || 0;
      const sell = currentTrend.sell || 0;
      const strongSell = currentTrend.strongSell || 0;

      // Count upgrades/downgrades in last 90 days
      const history = quoteSummary?.upgradeDowngradeHistory?.history || [];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      let upgrades = 0;
      let downgrades = 0;
      for (const h of history) {
        const date = h.epochGradeDate ? new Date(h.epochGradeDate * 1000) : (h.date ? new Date(h.date as unknown as string) : null);
        if (!date || date < ninetyDaysAgo) break;
        if (h.action === 'up' || h.action === 'upgrade' || h.action === 'init') upgrades++;
        else if (h.action === 'down' || h.action === 'downgrade') downgrades++;
      }

      const total = strongBuy + buy + hold + sell + strongSell || 1;
      const buyPct = (strongBuy + buy) / total;
      let consensus = 'Hold';
      if (buyPct >= 0.8) consensus = 'Strong Buy';
      else if (buyPct >= 0.6) consensus = 'Buy';
      else if (buyPct < 0.3) consensus = 'Sell';

      const fd = quoteSummary?.financialData || {};
      const targetPrice = fd.targetMeanPrice || fd.targetMedianPrice || 0;
      const currentPrice = quote.regularMarketPrice || 1;
      const upside = targetPrice > 0 ? ((targetPrice - currentPrice) / currentPrice) * 100 : 0;

      const analystData: AnalystData = {
        symbol,
        strongBuy,
        buy,
        hold,
        sell,
        strongSell,
        consensusRating: consensus,
        priceTarget: targetPrice,
        numberOfAnalysts: total,
        upgradesLast90: upgrades,
        downgradesLast90: downgrades,
        priceTargetUpside: Math.round(upside * 100) / 100,
      };

      await setCache(cacheKey, analystData, CACHE_TTLS.analysts);
      return analystData;
    } catch (error) {
      console.error(`Yahoo Finance analyst error for ${symbol}:`, error);
      return sampleFallback.getAnalystRatings(symbol);
    }
  }

  async getPriceTargetConsensus(symbol: string): Promise<PriceTarget> {
    const cacheKey = getCacheKey('yahoo-pt', { symbol });
    const cached = await getCached<PriceTarget>(cacheKey);
    if (cached) return cached.data;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quoteSummary: any = await yahooFinance.quoteSummary(symbol, {
        modules: ['financialData'],
      });

      const fd = quoteSummary?.financialData || {};

      const pt: PriceTarget = {
        targetHigh: fd.targetHighPrice || 0,
        targetLow: fd.targetLowPrice || 0,
        targetConsensus: fd.targetMeanPrice || 0,
        targetMedian: fd.targetMedianPrice || 0,
      };

      await setCache(cacheKey, pt, CACHE_TTLS.analysts);
      return pt;
    } catch (error) {
      console.error(`Yahoo Finance price target error for ${symbol}:`, error);
      return sampleFallback.getPriceTargetConsensus(symbol);
    }
  }
}
