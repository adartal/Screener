import { StockScore, PortfolioHolding, PortfolioStats, StockWithMetrics } from '@/types';
import { portfolioCorrelationPenalty } from '@/lib/correlation';
import { marginalSharpeImprovement } from '@/lib/portfolio-math';
import { SECTOR_AVG_RETURNS, SECTOR_AVG_VOLATILITY } from '@/lib/constants';

export function computePortfolioAdjustedScores(
  scores: Map<string, StockScore>,
  stocks: StockWithMetrics[],
  holdings: PortfolioHolding[],
  portfolioStats: PortfolioStats
): Map<string, StockScore> {
  if (holdings.length === 0) return scores;

  const adjusted = new Map<string, StockScore>();

  for (const [symbol, score] of scores) {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) {
      adjusted.set(symbol, score);
      continue;
    }

    let adjustedScore = score.compositeScore;

    // 1. Correlation penalty
    const correlationPenalty = portfolioCorrelationPenalty(stock.sector, holdings);
    adjustedScore = adjustedScore * (1 - correlationPenalty * 0.3);

    // 2. Sector concentration penalty
    const sectorWeight = portfolioStats.sectorBreakdown[stock.sector] || 0;
    if (sectorWeight > 0.60) {
      adjustedScore -= 30;
    } else if (sectorWeight > 0.40) {
      adjustedScore -= 15;
    }

    // Clamp to 0-100
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));

    // 3. Marginal Sharpe ratio improvement
    const candidateReturn = SECTOR_AVG_RETURNS[stock.sector] ?? 0.10;
    const candidateVolatility = SECTOR_AVG_VOLATILITY[stock.sector] ?? 0.20;

    const sharpeDelta = marginalSharpeImprovement(
      portfolioStats,
      stock.sector,
      candidateReturn,
      candidateVolatility,
      0.10,
      holdings
    );

    adjusted.set(symbol, {
      ...score,
      portfolioFitScore: Math.round(adjustedScore * 10) / 10,
      sharpeContribution: sharpeDelta,
    });
  }

  return adjusted;
}
