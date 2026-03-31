import { StockWithMetrics, PricePoint } from '@/types';

export function computeMaxDrawdown(prices: PricePoint[]): number {
  if (prices.length === 0) return 0;
  let peak = prices[0].close;
  let maxDrawdown = 0;

  for (const p of prices) {
    if (p.close > peak) peak = p.close;
    const drawdown = (peak - p.close) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  return maxDrawdown * 100;
}

export function computeVolatility(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].close > 0) {
      returns.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
    }
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const dailyVol = Math.sqrt(variance);

  return dailyVol * Math.sqrt(252) * 100;
}

export function computeRelativePerformance(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;
  const stockReturn = (prices[prices.length - 1].close - prices[0].close) / prices[0].close;
  // Approximate S&P 500 6-month return (~5%)
  const spReturn = 0.05;
  return (stockReturn - spReturn) * 100;
}

export function computePriceVsMA(currentPrice: number, ma: number): number {
  if (ma === 0) return 0;
  return ((currentPrice - ma) / ma) * 100;
}

export function extractMetricValue(stock: StockWithMetrics, metric: string): number | null {
  switch (metric) {
    // Growth
    case 'revenueGrowthQoQ': return stock.fundamentals.revenueGrowthQoQ;
    case 'epsGrowthYoY': return stock.fundamentals.epsGrowthYoY;
    case 'revenueGrowthAcceleration': return stock.fundamentals.revenueGrowthAcceleration;
    // Momentum
    case 'priceVs50dMA': return computePriceVsMA(stock.price, stock.quote.fiftyDayMA);
    case 'priceVs200dMA': return computePriceVsMA(stock.price, stock.quote.twoHundredDayMA);
    case 'relativePerformance6M': return stock.relativePerformance6M;
    // Valuation (inverted - lower is better)
    case 'pegRatio': return stock.fundamentals.pegRatio;
    case 'forwardPEvsMedian': {
      const fpe = stock.fundamentals.forwardPE;
      const median = stock.fundamentals.sectorMedianPE;
      if (fpe === null || median === null || median === 0) return null;
      return fpe / median;
    }
    case 'evEbitdaVsMedian': {
      const ev = stock.fundamentals.evToEbitda;
      const median = stock.fundamentals.sectorMedianEvEbitda;
      if (ev === null || median === null || median === 0) return null;
      return ev / median;
    }
    // Analyst
    case 'buyPercent': {
      const total = stock.analystData.numberOfAnalysts;
      if (total === 0) return null;
      return ((stock.analystData.strongBuy + stock.analystData.buy) / total) * 100;
    }
    case 'priceTargetUpside': return stock.analystData.priceTargetUpside;
    case 'netUpgrades': return stock.analystData.upgradesLast90 - stock.analystData.downgradesLast90;
    // Risk (inverted - lower is better)
    case 'beta': return stock.beta;
    case 'volatility': return stock.volatility6M;
    case 'maxDrawdown': return stock.maxDrawdown6M;
    default: return null;
  }
}
