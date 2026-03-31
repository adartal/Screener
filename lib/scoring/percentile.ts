import { StockWithMetrics } from '@/types';
import { extractMetricValue } from './metrics';

export function computePercentileRanks(
  stocks: StockWithMetrics[],
  metric: string,
  groupBy: 'sector' | 'all' = 'sector',
  invert: boolean = false
): Map<string, number> {
  const result = new Map<string, number>();

  if (stocks.length === 0) return result;

  if (groupBy === 'all') {
    rankGroup(stocks, metric, invert, result);
  } else {
    const groups = new Map<string, StockWithMetrics[]>();
    for (const stock of stocks) {
      const key = stock.sector || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(stock);
    }

    for (const [, group] of groups) {
      rankGroup(group, metric, invert, result);
    }
  }

  return result;
}

function rankGroup(
  stocks: StockWithMetrics[],
  metric: string,
  invert: boolean,
  result: Map<string, number>
): void {
  const values: Array<{ symbol: string; value: number | null }> = stocks.map(s => ({
    symbol: s.symbol,
    value: extractMetricValue(s, metric),
  }));

  const withValues = values.filter(v => v.value !== null) as Array<{ symbol: string; value: number }>;
  const withoutValues = values.filter(v => v.value === null);

  // Assign 50th percentile to stocks with missing data
  for (const v of withoutValues) {
    result.set(v.symbol, 50);
  }

  if (withValues.length === 0) return;

  // Sort ascending
  withValues.sort((a, b) => a.value - b.value);

  // Handle ties by averaging ranks
  const n = withValues.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && withValues[j].value === withValues[i].value) j++;

    // Average rank for tied values
    const avgRank = (i + j - 1) / 2;
    const percentile = n === 1 ? 50 : (avgRank / (n - 1)) * 100;

    for (let k = i; k < j; k++) {
      const finalPercentile = invert ? 100 - percentile : percentile;
      result.set(withValues[k].symbol, Math.round(finalPercentile * 10) / 10);
    }

    i = j;
  }
}
