import { SECTOR_CORRELATIONS } from './constants';
import { PortfolioHolding } from '@/types';

export function estimateCorrelation(sectorA: string, sectorB: string): number {
  const row = SECTOR_CORRELATIONS[sectorA];
  if (!row) return 0.3;
  return row[sectorB] ?? 0.3;
}

export function portfolioCorrelationPenalty(
  candidateSector: string,
  holdings: PortfolioHolding[]
): number {
  if (holdings.length === 0) return 0;

  let penalty = 0;
  for (const holding of holdings) {
    const correlation = estimateCorrelation(candidateSector, holding.sector);
    penalty += holding.weight * correlation;
  }

  return Math.min(penalty, 1);
}
