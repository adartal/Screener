import { FilterConfig, ScoringWeights } from '@/types';

export const GICS_SECTORS = [
  'Technology',
  'Healthcare',
  'Financials',
  'Consumer Discretionary',
  'Communication Services',
  'Industrials',
  'Consumer Staples',
  'Energy',
  'Utilities',
  'Real Estate',
  'Materials',
] as const;

export const SECTOR_CORRELATIONS: Record<string, Record<string, number>> = {
  'Technology':             { 'Technology': 0.85, 'Communication Services': 0.72, 'Consumer Discretionary': 0.65, 'Healthcare': 0.15, 'Industrials': 0.40, 'Financials': 0.50, 'Energy': 0.20, 'Consumer Staples': 0.10, 'Utilities': 0.05, 'Real Estate': 0.15, 'Materials': 0.30 },
  'Healthcare':             { 'Technology': 0.15, 'Communication Services': 0.12, 'Consumer Discretionary': 0.20, 'Healthcare': 0.80, 'Industrials': 0.25, 'Financials': 0.30, 'Energy': 0.10, 'Consumer Staples': 0.45, 'Utilities': 0.35, 'Real Estate': 0.20, 'Materials': 0.15 },
  'Industrials':            { 'Technology': 0.40, 'Communication Services': 0.35, 'Consumer Discretionary': 0.55, 'Healthcare': 0.25, 'Industrials': 0.80, 'Financials': 0.55, 'Energy': 0.50, 'Consumer Staples': 0.30, 'Utilities': 0.25, 'Real Estate': 0.35, 'Materials': 0.60 },
  'Energy':                 { 'Technology': 0.20, 'Communication Services': 0.15, 'Consumer Discretionary': 0.30, 'Healthcare': 0.10, 'Industrials': 0.50, 'Financials': 0.40, 'Energy': 0.85, 'Consumer Staples': 0.20, 'Utilities': 0.35, 'Real Estate': 0.15, 'Materials': 0.55 },
  'Financials':             { 'Technology': 0.50, 'Communication Services': 0.45, 'Consumer Discretionary': 0.55, 'Healthcare': 0.30, 'Industrials': 0.55, 'Financials': 0.85, 'Energy': 0.40, 'Consumer Staples': 0.35, 'Utilities': 0.30, 'Real Estate': 0.50, 'Materials': 0.45 },
  'Consumer Discretionary': { 'Technology': 0.65, 'Communication Services': 0.60, 'Consumer Discretionary': 0.80, 'Healthcare': 0.20, 'Industrials': 0.55, 'Financials': 0.55, 'Energy': 0.30, 'Consumer Staples': 0.40, 'Utilities': 0.15, 'Real Estate': 0.30, 'Materials': 0.40 },
  'Consumer Staples':       { 'Technology': 0.10, 'Communication Services': 0.15, 'Consumer Discretionary': 0.40, 'Healthcare': 0.45, 'Industrials': 0.30, 'Financials': 0.35, 'Energy': 0.20, 'Consumer Staples': 0.80, 'Utilities': 0.55, 'Real Estate': 0.40, 'Materials': 0.25 },
  'Utilities':              { 'Technology': 0.05, 'Communication Services': 0.10, 'Consumer Discretionary': 0.15, 'Healthcare': 0.35, 'Industrials': 0.25, 'Financials': 0.30, 'Energy': 0.35, 'Consumer Staples': 0.55, 'Utilities': 0.85, 'Real Estate': 0.50, 'Materials': 0.20 },
  'Communication Services': { 'Technology': 0.72, 'Communication Services': 0.85, 'Consumer Discretionary': 0.60, 'Healthcare': 0.12, 'Industrials': 0.35, 'Financials': 0.45, 'Energy': 0.15, 'Consumer Staples': 0.15, 'Utilities': 0.10, 'Real Estate': 0.20, 'Materials': 0.25 },
  'Real Estate':            { 'Technology': 0.15, 'Communication Services': 0.20, 'Consumer Discretionary': 0.30, 'Healthcare': 0.20, 'Industrials': 0.35, 'Financials': 0.50, 'Energy': 0.15, 'Consumer Staples': 0.40, 'Utilities': 0.50, 'Real Estate': 0.85, 'Materials': 0.30 },
  'Materials':              { 'Technology': 0.30, 'Communication Services': 0.25, 'Consumer Discretionary': 0.40, 'Healthcare': 0.15, 'Industrials': 0.60, 'Financials': 0.45, 'Energy': 0.55, 'Consumer Staples': 0.25, 'Utilities': 0.20, 'Real Estate': 0.30, 'Materials': 0.85 },
};

export const WEIGHT_PRESETS: Record<string, ScoringWeights> = {
  'Aggressive Growth': { growth: 0.35, momentum: 0.30, valuation: 0.05, analyst: 0.15, risk: 0.15 },
  'Balanced Growth':   { growth: 0.25, momentum: 0.20, valuation: 0.20, analyst: 0.20, risk: 0.15 },
  'Value':             { growth: 0.15, momentum: 0.10, valuation: 0.35, analyst: 0.20, risk: 0.20 },
  'Momentum':          { growth: 0.15, momentum: 0.40, valuation: 0.05, analyst: 0.15, risk: 0.25 },
  'Low Risk':          { growth: 0.15, momentum: 0.15, valuation: 0.20, analyst: 0.15, risk: 0.35 },
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  growth: 0.30,
  momentum: 0.25,
  valuation: 0.15,
  analyst: 0.15,
  risk: 0.15,
};

export const DEFAULT_FILTERS: FilterConfig = {
  minMarketCap: 5000000000,
  minRevenueGrowth: 15,
  minVolume: 500000,
  analystConsensus: 'buy',
  sectors: [...GICS_SECTORS],
  includeInternational: false,
  excludeTickers: [],
};

export const CACHE_TTLS = {
  screenerList: 24 * 60 * 60 * 1000,
  quotes: 1 * 60 * 60 * 1000,
  fundamentals: 24 * 60 * 60 * 1000,
  historical: 6 * 60 * 60 * 1000,
  analysts: 24 * 60 * 60 * 1000,
};

export const FMP_BASE_URL = 'https://financialmodelingprep.com/api';

export const SECTOR_AVG_RETURNS: Record<string, number> = {
  'Technology': 0.18,
  'Healthcare': 0.12,
  'Financials': 0.13,
  'Consumer Discretionary': 0.14,
  'Communication Services': 0.15,
  'Industrials': 0.11,
  'Consumer Staples': 0.08,
  'Energy': 0.10,
  'Utilities': 0.07,
  'Real Estate': 0.09,
  'Materials': 0.10,
};

export const SECTOR_AVG_VOLATILITY: Record<string, number> = {
  'Technology': 0.25,
  'Healthcare': 0.22,
  'Financials': 0.20,
  'Consumer Discretionary': 0.22,
  'Communication Services': 0.24,
  'Industrials': 0.18,
  'Consumer Staples': 0.12,
  'Energy': 0.28,
  'Utilities': 0.14,
  'Real Estate': 0.20,
  'Materials': 0.20,
};

export const MARKET_CAP_OPTIONS = [
  { label: '$1B+', value: 1000000000 },
  { label: '$5B+', value: 5000000000 },
  { label: '$10B+', value: 10000000000 },
  { label: '$50B+', value: 50000000000 },
  { label: '$100B+', value: 100000000000 },
];

export const VOLUME_OPTIONS = [
  { label: '100K+', value: 100000 },
  { label: '500K+', value: 500000 },
  { label: '1M+', value: 1000000 },
  { label: '5M+', value: 5000000 },
];

export const RISK_FREE_RATE = 0.05;
