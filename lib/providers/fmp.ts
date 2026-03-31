import { Stock, StockQuote, StockFundamentals, PricePoint, AnalystData, PriceTarget, FilterConfig, DataProvider } from '@/types';
import { getCached, setCache, incrementRequestCount, getRequestCount, getCacheKey } from '@/lib/cache';
import { FMP_BASE_URL, CACHE_TTLS } from '@/lib/constants';
import { SampleDataProvider } from './sample-data';

const MAX_DAILY_REQUESTS = 245;
const WARN_AT_REQUESTS = 200;

let requestQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(() => new Promise<T>((resolve, reject) => {
    setTimeout(() => fn().then(resolve).catch(reject), 200);
  }));
  requestQueue = result.catch(() => {});
  return result;
}

export class FMPProvider implements DataProvider {
  private apiKey: string;
  private sampleFallback = new SampleDataProvider();
  // Track which endpoints are unavailable on the user's plan
  private restrictedEndpoints = new Set<string>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isLive(): boolean { return true; }

  private async fetch<T>(endpoint: string, params: Record<string, string | number> = {}, ttl: number = CACHE_TTLS.fundamentals): Promise<T> {
    const cacheKey = getCacheKey(endpoint, params);
    const cached = await getCached<T>(cacheKey);
    if (cached) return cached.data;

    // If we already know this endpoint is restricted, skip the API call
    const endpointBase = endpoint.split('/').slice(0, 3).join('/');
    if (this.restrictedEndpoints.has(endpointBase)) {
      throw new Error(`Endpoint ${endpointBase} requires a paid FMP plan`);
    }

    const counter = await getRequestCount();
    if (counter.count >= MAX_DAILY_REQUESTS) {
      throw new Error(`API rate limit approaching (${counter.count}/${MAX_DAILY_REQUESTS} requests today). Using cached data where available.`);
    }

    const queryParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      queryParams.set(k, String(v));
    }
    queryParams.set('apikey', this.apiKey);

    const url = `${FMP_BASE_URL}${endpoint}?${queryParams.toString()}`;

    const data = await enqueue(async () => {
      await incrementRequestCount();
      const res = await fetch(url);
      if (res.status === 401) throw new Error('Invalid FMP API key. Check your key in Settings.');
      if (res.status === 403) {
        this.restrictedEndpoints.add(endpointBase);
        throw new Error(`Endpoint ${endpoint} requires a paid FMP plan. Falling back to sample data.`);
      }
      if (res.status === 429) throw new Error('FMP API rate limited. Please wait and try again.');
      if (!res.ok) throw new Error(`FMP API error: ${res.status}`);
      return res.json();
    });

    // FMP sometimes returns an error message in the response body
    if (data && typeof data === 'object' && 'Error Message' in data) {
      throw new Error(data['Error Message'] as string);
    }

    await setCache(cacheKey, data, ttl);

    const currentCount = await getRequestCount();
    if (currentCount.count >= WARN_AT_REQUESTS) {
      console.warn(`FMP API: ${currentCount.count} requests used today (limit: 250)`);
    }

    return data as T;
  }

  async getScreenerResults(filters: FilterConfig): Promise<Stock[]> {
    try {
      const params: Record<string, string | number> = {
        marketCapMoreThan: filters.minMarketCap,
        volumeMoreThan: filters.minVolume,
        limit: 500,
      };
      if (!filters.includeInternational) {
        params.country = 'US';
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await this.fetch<any[]>('/v3/stock-screener', params, CACHE_TTLS.screenerList);

      return raw
        .filter(s => {
          if (filters.sectors.length > 0 && !filters.sectors.includes(s.sector)) return false;
          if (filters.excludeTickers.includes(s.symbol)) return false;
          return true;
        })
        .map(s => ({
          symbol: s.symbol,
          name: s.companyName || s.name || s.symbol,
          sector: s.sector || 'Unknown',
          industry: s.industry || 'Unknown',
          price: s.price || 0,
          marketCap: s.marketCap || 0,
          volume: s.volume || 0,
          beta: s.beta || 1,
        }));
    } catch {
      // Free tier doesn't have stock-screener — use sample stock universe
      // but try to enrich with live quotes
      console.warn('FMP stock-screener not available, using sample universe with live quotes');
      const sampleStocks = await this.sampleFallback.getScreenerResults(filters);

      try {
        const symbols = sampleStocks.map(s => s.symbol);
        const quotes = await this.getQuote(symbols);
        const quoteMap = new Map(quotes.map(q => [q.symbol, q]));

        return sampleStocks.map(s => {
          const q = quoteMap.get(s.symbol);
          if (q) {
            return { ...s, price: q.price, marketCap: q.marketCap, volume: q.volume };
          }
          return s;
        });
      } catch {
        // If quotes also fail, return pure sample data
        return sampleStocks;
      }
    }
  }

  async getQuote(symbols: string | string[]): Promise<StockQuote[]> {
    const syms = Array.isArray(symbols) ? symbols : [symbols];
    const batchSize = 50;
    const results: StockQuote[] = [];

    for (let i = 0; i < syms.length; i += batchSize) {
      const batch = syms.slice(i, i + batchSize);
      const symbolStr = batch.join(',');

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await this.fetch<any[]>(`/v3/quote/${symbolStr}`, {}, CACHE_TTLS.quotes);
        if (!Array.isArray(raw)) continue;

        for (const q of raw) {
          results.push({
            symbol: q.symbol,
            price: q.price || 0,
            change: q.change || 0,
            changePercent: q.changesPercentage || 0,
            volume: q.volume || 0,
            avgVolume: q.avgVolume || 0,
            dayHigh: q.dayHigh || 0,
            dayLow: q.dayLow || 0,
            fiftyDayMA: q.priceAvg50 || 0,
            twoHundredDayMA: q.priceAvg200 || 0,
            yearHigh: q.yearHigh || 0,
            yearLow: q.yearLow || 0,
            marketCap: q.marketCap || 0,
          });
        }
      } catch {
        // Fall back to sample data for this batch
        for (const sym of batch) {
          const sampleQuotes = await this.sampleFallback.getQuote(sym);
          results.push(...sampleQuotes);
        }
      }
    }

    return results;
  }

  async getFundamentals(symbol: string): Promise<StockFundamentals> {
    try {
      const [income, metrics, ratios] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.fetch<any[]>(`/v3/income-statement/${symbol}`, { period: 'quarter', limit: 8 }, CACHE_TTLS.fundamentals),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.fetch<any[]>(`/v3/key-metrics-ttm/${symbol}`, {}, CACHE_TTLS.fundamentals),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.fetch<any[]>(`/v3/ratios-ttm/${symbol}`, {}, CACHE_TTLS.fundamentals),
      ]);

      const ttm = metrics[0] || {};
      const rat = ratios[0] || {};

      let revenueGrowthQoQ: number | null = null;
      let revenueGrowthYoY: number | null = null;
      let epsGrowthYoY: number | null = null;
      let revenueGrowthAcceleration: number | null = null;

      if (income.length >= 2) {
        const rev0 = income[0]?.revenue;
        const rev1 = income[1]?.revenue;
        if (rev0 && rev1 && rev1 !== 0) {
          revenueGrowthQoQ = ((rev0 - rev1) / Math.abs(rev1)) * 100;
        }
      }
      if (income.length >= 5) {
        const rev0 = income[0]?.revenue;
        const rev4 = income[4]?.revenue;
        if (rev0 && rev4 && rev4 !== 0) {
          revenueGrowthYoY = ((rev0 - rev4) / Math.abs(rev4)) * 100;
        }
        const eps0 = income[0]?.eps;
        const eps4 = income[4]?.eps;
        if (eps0 && eps4 && eps4 !== 0) {
          epsGrowthYoY = ((eps0 - eps4) / Math.abs(eps4)) * 100;
        }
      }
      if (income.length >= 6) {
        const rev0 = income[0]?.revenue;
        const rev1 = income[1]?.revenue;
        const rev4 = income[4]?.revenue;
        const rev5 = income[5]?.revenue;
        if (rev0 && rev1 && rev4 && rev5 && rev1 !== 0 && rev5 !== 0) {
          const currentGrowth = (rev0 - rev1) / Math.abs(rev1);
          const priorGrowth = (rev4 - rev5) / Math.abs(rev5);
          revenueGrowthAcceleration = (currentGrowth - priorGrowth) * 100;
        }
      }

      return {
        symbol,
        revenueGrowthQoQ,
        revenueGrowthYoY,
        epsGrowthYoY,
        revenueGrowthAcceleration,
        peRatio: ttm.peRatioTTM || rat.peRatioTTM || null,
        forwardPE: rat.priceEarningsToGrowthRatioTTM ? (rat.peRatioTTM || 0) / (rat.priceEarningsToGrowthRatioTTM || 1) : null,
        pegRatio: rat.priceEarningsToGrowthRatioTTM || ttm.pegRatioTTM || null,
        evToEbitda: ttm.enterpriseValueOverEBITDATTM || null,
        sectorMedianPE: null,
        sectorMedianEvEbitda: null,
        revenue: income[0]?.revenue || null,
        netIncome: income[0]?.netIncome || null,
        eps: income[0]?.eps || null,
        grossMargin: rat.grossProfitMarginTTM ? rat.grossProfitMarginTTM * 100 : null,
        operatingMargin: rat.operatingProfitMarginTTM ? rat.operatingProfitMarginTTM * 100 : null,
        netMargin: rat.netProfitMarginTTM ? rat.netProfitMarginTTM * 100 : null,
      };
    } catch {
      // Fall back to sample fundamentals
      return this.sampleFallback.getFundamentals(symbol);
    }
  }

  async getHistoricalPrices(symbol: string, days: number = 180): Promise<PricePoint[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await this.fetch<any>(`/v3/historical-price-full/${symbol}`, { timeseries: days }, CACHE_TTLS.historical);
      const hist = raw?.historical || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return hist.map((p: any) => ({
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        volume: p.volume,
      })).reverse();
    } catch {
      return this.sampleFallback.getHistoricalPrices(symbol, days);
    }
  }

  async getAnalystRatings(symbol: string): Promise<AnalystData> {
    try {
      const [grades, estimates] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.fetch<any[]>(`/v3/grade/${symbol}`, { limit: 20 }, CACHE_TTLS.analysts),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.fetch<any[]>(`/v3/analyst-estimates/${symbol}`, { limit: 4 }, CACHE_TTLS.analysts),
      ]);

      let strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0;
      let upgrades = 0, downgrades = 0;

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      for (const g of grades) {
        const grade = (g.newGrade || '').toLowerCase();
        if (grade.includes('strong buy')) strongBuy++;
        else if (grade.includes('buy') || grade.includes('outperform') || grade.includes('overweight')) buy++;
        else if (grade.includes('hold') || grade.includes('neutral') || grade.includes('equal')) hold++;
        else if (grade.includes('strong sell') || grade.includes('underperform')) strongSell++;
        else if (grade.includes('sell') || grade.includes('underweight')) sell++;

        const gradeDate = new Date(g.date);
        if (gradeDate >= ninetyDaysAgo) {
          if (g.action === 'upgrade') upgrades++;
          else if (g.action === 'downgrade') downgrades++;
        }
      }

      const total = strongBuy + buy + hold + sell + strongSell || 1;
      const buyPct = (strongBuy + buy) / total;
      let consensus = 'Hold';
      if (buyPct >= 0.8) consensus = 'Strong Buy';
      else if (buyPct >= 0.6) consensus = 'Buy';
      else if (buyPct < 0.3) consensus = 'Sell';

      const priceTarget = estimates[0]?.estimatedEpsAvg ? estimates[0].estimatedEpsAvg * 20 : 0;

      return {
        symbol,
        strongBuy, buy, hold, sell, strongSell,
        consensusRating: consensus,
        priceTarget,
        numberOfAnalysts: total,
        upgradesLast90: upgrades,
        downgradesLast90: downgrades,
        priceTargetUpside: 0,
      };
    } catch {
      return this.sampleFallback.getAnalystRatings(symbol);
    }
  }

  async getPriceTargetConsensus(symbol: string): Promise<PriceTarget> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await this.fetch<any[]>(`/v4/price-target-consensus`, { symbol }, CACHE_TTLS.analysts);
      const pt = Array.isArray(raw) ? raw[0] || {} : raw || {};
      return {
        targetHigh: pt.targetHigh || 0,
        targetLow: pt.targetLow || 0,
        targetConsensus: pt.targetConsensus || 0,
        targetMedian: pt.targetMedian || 0,
      };
    } catch {
      return this.sampleFallback.getPriceTargetConsensus(symbol);
    }
  }
}
