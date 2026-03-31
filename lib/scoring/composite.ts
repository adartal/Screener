import { StockWithMetrics, StockScore, ScoringWeights } from '@/types';
import { computePercentileRanks } from './percentile';

export interface DimensionScores {
  growth: number;
  momentum: number;
  valuation: number;
  analyst: number;
  risk: number;
}

function avg(...values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function computeAllScores(
  stocks: StockWithMetrics[],
  weights: ScoringWeights
): Map<string, StockScore> {
  if (stocks.length === 0) return new Map();

  // Compute percentile ranks for all metrics
  // Growth metrics
  const revGrowthQoQ = computePercentileRanks(stocks, 'revenueGrowthQoQ');
  const epsGrowthYoY = computePercentileRanks(stocks, 'epsGrowthYoY');
  const revAcceleration = computePercentileRanks(stocks, 'revenueGrowthAcceleration');

  // Momentum metrics
  const priceVs50d = computePercentileRanks(stocks, 'priceVs50dMA');
  const priceVs200d = computePercentileRanks(stocks, 'priceVs200dMA');
  const relPerf6m = computePercentileRanks(stocks, 'relativePerformance6M');

  // Valuation metrics (inverted - lower is better)
  const peg = computePercentileRanks(stocks, 'pegRatio', 'sector', true);
  const fwdPE = computePercentileRanks(stocks, 'forwardPEvsMedian', 'sector', true);
  const evEbitda = computePercentileRanks(stocks, 'evEbitdaVsMedian', 'sector', true);

  // Analyst metrics
  const buyPct = computePercentileRanks(stocks, 'buyPercent');
  const ptUpside = computePercentileRanks(stocks, 'priceTargetUpside');
  const netUpgrades = computePercentileRanks(stocks, 'netUpgrades');

  // Risk metrics (inverted - lower is better)
  const beta = computePercentileRanks(stocks, 'beta', 'all', true);
  const volatility = computePercentileRanks(stocks, 'volatility', 'all', true);
  const maxDrawdown = computePercentileRanks(stocks, 'maxDrawdown', 'all', true);

  const results = new Map<string, StockScore>();

  for (const stock of stocks) {
    const s = stock.symbol;

    const growthScore = avg(
      revGrowthQoQ.get(s) ?? 50,
      epsGrowthYoY.get(s) ?? 50,
      revAcceleration.get(s) ?? 50
    );

    const momentumScore = avg(
      priceVs50d.get(s) ?? 50,
      priceVs200d.get(s) ?? 50,
      relPerf6m.get(s) ?? 50
    );

    const valuationScore = avg(
      peg.get(s) ?? 50,
      fwdPE.get(s) ?? 50,
      evEbitda.get(s) ?? 50
    );

    const analystScore = avg(
      buyPct.get(s) ?? 50,
      ptUpside.get(s) ?? 50,
      netUpgrades.get(s) ?? 50
    );

    const riskScore = avg(
      beta.get(s) ?? 50,
      volatility.get(s) ?? 50,
      maxDrawdown.get(s) ?? 50
    );

    const compositeScore =
      growthScore * weights.growth +
      momentumScore * weights.momentum +
      valuationScore * weights.valuation +
      analystScore * weights.analyst +
      riskScore * weights.risk;

    results.set(s, {
      symbol: s,
      compositeScore: Math.round(compositeScore * 10) / 10,
      growthScore: Math.round(growthScore * 10) / 10,
      momentumScore: Math.round(momentumScore * 10) / 10,
      valuationScore: Math.round(valuationScore * 10) / 10,
      analystScore: Math.round(analystScore * 10) / 10,
      riskScore: Math.round(riskScore * 10) / 10,
    });
  }

  return results;
}
