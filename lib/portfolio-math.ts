import { PortfolioHolding, PortfolioStats } from '@/types';
import { SECTOR_AVG_RETURNS, SECTOR_AVG_VOLATILITY, SECTOR_CORRELATIONS, RISK_FREE_RATE } from './constants';

export function computePortfolioStats(holdings: PortfolioHolding[]): PortfolioStats {
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      weightedBeta: 0,
      estimatedReturn: 0,
      estimatedVolatility: 0,
      sharpeRatio: 0,
      sectorBreakdown: {},
      maxSectorConcentration: 0,
    };
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.amount, 0);

  // Recalculate weights based on amounts
  const normalizedHoldings = holdings.map(h => ({
    ...h,
    weight: totalValue > 0 ? h.amount / totalValue : 1 / holdings.length,
  }));

  const weightedBeta = normalizedHoldings.reduce((sum, h) => sum + h.weight * h.beta, 0);

  // Expected return using sector averages
  const estimatedReturn = normalizedHoldings.reduce((sum, h) => {
    return sum + h.weight * (SECTOR_AVG_RETURNS[h.sector] ?? 0.10);
  }, 0);

  // Portfolio volatility using sector correlations
  let portfolioVariance = 0;
  for (const hi of normalizedHoldings) {
    for (const hj of normalizedHoldings) {
      const sigmaI = SECTOR_AVG_VOLATILITY[hi.sector] ?? 0.20;
      const sigmaJ = SECTOR_AVG_VOLATILITY[hj.sector] ?? 0.20;
      const rho = SECTOR_CORRELATIONS[hi.sector]?.[hj.sector] ?? 0.30;
      portfolioVariance += hi.weight * hj.weight * sigmaI * sigmaJ * rho;
    }
  }
  const estimatedVolatility = Math.sqrt(Math.max(0, portfolioVariance));

  const sharpeRatio = estimatedVolatility > 0
    ? (estimatedReturn - RISK_FREE_RATE) / estimatedVolatility
    : 0;

  // Sector breakdown
  const sectorBreakdown: Record<string, number> = {};
  for (const h of normalizedHoldings) {
    sectorBreakdown[h.sector] = (sectorBreakdown[h.sector] || 0) + h.weight;
  }

  const maxSectorConcentration = Math.max(...Object.values(sectorBreakdown), 0);

  return {
    totalValue,
    weightedBeta: Math.round(weightedBeta * 100) / 100,
    estimatedReturn: Math.round(estimatedReturn * 1000) / 1000,
    estimatedVolatility: Math.round(estimatedVolatility * 1000) / 1000,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sectorBreakdown,
    maxSectorConcentration,
  };
}

export function estimateSharpeRatio(expectedReturn: number, volatility: number): number {
  if (volatility === 0) return 0;
  return (expectedReturn - RISK_FREE_RATE) / volatility;
}

export function marginalSharpeImprovement(
  currentStats: PortfolioStats,
  candidateSector: string,
  candidateExpectedReturn: number,
  candidateVolatility: number,
  addWeight: number = 0.10,
  holdings: PortfolioHolding[]
): number {
  if (holdings.length === 0) return 0;

  const currentSharpe = currentStats.sharpeRatio;

  // Scale existing weights down
  const scaleFactor = 1 - addWeight;
  const totalValue = currentStats.totalValue;

  // New portfolio expected return
  const newReturn = currentStats.estimatedReturn * scaleFactor + candidateExpectedReturn * addWeight;

  // New portfolio variance
  let newVariance = 0;

  // Existing-existing contributions
  for (const hi of holdings) {
    const wi = (hi.amount / totalValue) * scaleFactor;
    for (const hj of holdings) {
      const wj = (hj.amount / totalValue) * scaleFactor;
      const sigmaI = SECTOR_AVG_VOLATILITY[hi.sector] ?? 0.20;
      const sigmaJ = SECTOR_AVG_VOLATILITY[hj.sector] ?? 0.20;
      const rho = SECTOR_CORRELATIONS[hi.sector]?.[hj.sector] ?? 0.30;
      newVariance += wi * wj * sigmaI * sigmaJ * rho;
    }
  }

  // Candidate-candidate contribution
  newVariance += addWeight * addWeight * candidateVolatility * candidateVolatility;

  // Candidate-existing cross terms
  for (const h of holdings) {
    const wh = (h.amount / totalValue) * scaleFactor;
    const sigmaH = SECTOR_AVG_VOLATILITY[h.sector] ?? 0.20;
    const rho = SECTOR_CORRELATIONS[candidateSector]?.[h.sector] ?? 0.30;
    newVariance += 2 * addWeight * wh * candidateVolatility * sigmaH * rho;
  }

  const newVolatility = Math.sqrt(Math.max(0, newVariance));
  const newSharpe = newVolatility > 0 ? (newReturn - RISK_FREE_RATE) / newVolatility : 0;

  return Math.round((newSharpe - currentSharpe) * 1000) / 1000;
}
