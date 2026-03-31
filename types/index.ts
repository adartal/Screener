export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  volume: number;
  beta: number;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  dayHigh: number;
  dayLow: number;
  fiftyDayMA: number;
  twoHundredDayMA: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
}

export interface StockFundamentals {
  symbol: string;
  revenueGrowthQoQ: number | null;
  revenueGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  revenueGrowthAcceleration: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  evToEbitda: number | null;
  sectorMedianPE: number | null;
  sectorMedianEvEbitda: number | null;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalystData {
  symbol: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensusRating: string;
  priceTarget: number;
  numberOfAnalysts: number;
  upgradesLast90: number;
  downgradesLast90: number;
  priceTargetUpside: number;
}

export interface PriceTarget {
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

export interface StockScore {
  symbol: string;
  compositeScore: number;
  growthScore: number;
  momentumScore: number;
  valuationScore: number;
  analystScore: number;
  riskScore: number;
  portfolioFitScore?: number;
  sharpeContribution?: number;
}

export interface ScoringWeights {
  growth: number;
  momentum: number;
  valuation: number;
  analyst: number;
  risk: number;
}

export interface FilterConfig {
  minMarketCap: number;
  minRevenueGrowth: number;
  minVolume: number;
  analystConsensus: 'any' | 'buy' | 'strongBuy';
  sectors: string[];
  includeInternational: boolean;
  excludeTickers: string[];
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  sector: string;
  amount: number;
  weight: number;
  price: number;
  beta: number;
}

export interface PortfolioStats {
  totalValue: number;
  weightedBeta: number;
  estimatedReturn: number;
  estimatedVolatility: number;
  sharpeRatio: number;
  sectorBreakdown: Record<string, number>;
  maxSectorConcentration: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ScreenerResult extends Stock {
  scores: StockScore;
  quote: StockQuote;
  fundamentals: StockFundamentals;
  analystData: AnalystData;
}

export interface StockWithMetrics extends Stock {
  quote: StockQuote;
  fundamentals: StockFundamentals;
  analystData: AnalystData;
  historicalPrices: PricePoint[];
  maxDrawdown6M: number;
  volatility6M: number;
  relativePerformance6M: number;
}

export interface DataProvider {
  getScreenerResults(filters: FilterConfig): Promise<Stock[]>;
  getQuote(symbols: string | string[]): Promise<StockQuote[]>;
  getFundamentals(symbol: string): Promise<StockFundamentals>;
  getHistoricalPrices(symbol: string, days?: number): Promise<PricePoint[]>;
  getAnalystRatings(symbol: string): Promise<AnalystData>;
  getPriceTargetConsensus(symbol: string): Promise<PriceTarget>;
  isLive(): boolean;
}
