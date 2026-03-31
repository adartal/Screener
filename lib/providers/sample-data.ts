import { Stock, StockQuote, StockFundamentals, PricePoint, AnalystData, PriceTarget, FilterConfig, DataProvider } from '@/types';

interface SampleStockData {
  stock: Stock;
  quote: StockQuote;
  fundamentals: StockFundamentals;
  analyst: AnalystData;
  priceTarget: PriceTarget;
}

// Deterministic pseudo-random number generator
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateHistoricalPrices(symbol: string, currentPrice: number, days: number, volatility: number): PricePoint[] {
  const rng = seededRandom(hashString(symbol));
  const prices: PricePoint[] = [];
  let price = currentPrice * (0.85 + rng() * 0.3);

  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dailyReturn = (rng() - 0.48) * volatility * 0.063;
    price = price * (1 + dailyReturn);
    const dayVol = price * volatility * 0.02;

    prices.push({
      date: date.toISOString().split('T')[0],
      open: +(price * (1 + (rng() - 0.5) * 0.01)).toFixed(2),
      high: +(price + dayVol * rng()).toFixed(2),
      low: +(price - dayVol * rng()).toFixed(2),
      close: +price.toFixed(2),
      volume: Math.round(1000000 + rng() * 10000000),
    });
  }

  // Adjust last price to match current
  if (prices.length > 0) {
    const scale = currentPrice / prices[prices.length - 1].close;
    for (const p of prices) {
      p.open = +(p.open * scale).toFixed(2);
      p.high = +(p.high * scale).toFixed(2);
      p.low = +(p.low * scale).toFixed(2);
      p.close = +(p.close * scale).toFixed(2);
    }
  }

  return prices;
}

const SAMPLE_STOCKS_RAW: Array<{
  s: string; n: string; sec: string; ind: string; p: number; mc: number; v: number; b: number;
  rGqoq: number; rGyoy: number; epsG: number; rAcc: number;
  pe: number; fpe: number; peg: number; evEb: number;
  sBuy: number; buy: number; hold: number; sell: number; sSell: number; pt: number; upg: number; dng: number;
  vol: number;
}> = [
  { s:'NVDA', n:'NVIDIA Corporation', sec:'Technology', ind:'Semiconductors', p:875, mc:2150e9, v:45e6, b:1.7, rGqoq:22, rGyoy:122, epsG:150, rAcc:15, pe:65, fpe:35, peg:0.8, evEb:55, sBuy:20, buy:15, hold:3, sell:0, sSell:0, pt:1050, upg:8, dng:0, vol:0.45 },
  { s:'AAPL', n:'Apple Inc.', sec:'Technology', ind:'Consumer Electronics', p:195, mc:3000e9, v:55e6, b:1.2, rGqoq:5, rGyoy:8, epsG:12, rAcc:-2, pe:32, fpe:28, peg:2.5, evEb:25, sBuy:12, buy:18, hold:8, sell:2, sSell:0, pt:220, upg:3, dng:1, vol:0.22 },
  { s:'MSFT', n:'Microsoft Corporation', sec:'Technology', ind:'Software', p:420, mc:3100e9, v:22e6, b:0.9, rGqoq:12, rGyoy:16, epsG:20, rAcc:3, pe:35, fpe:30, peg:1.8, evEb:28, sBuy:18, buy:14, hold:4, sell:0, sSell:0, pt:480, upg:5, dng:0, vol:0.23 },
  { s:'GOOGL', n:'Alphabet Inc.', sec:'Communication Services', ind:'Internet Content', p:155, mc:1900e9, v:25e6, b:1.1, rGqoq:14, rGyoy:15, epsG:30, rAcc:2, pe:25, fpe:22, peg:1.2, evEb:18, sBuy:16, buy:14, hold:5, sell:1, sSell:0, pt:185, upg:6, dng:1, vol:0.28 },
  { s:'AMZN', n:'Amazon.com Inc.', sec:'Consumer Discretionary', ind:'Internet Retail', p:185, mc:1900e9, v:35e6, b:1.2, rGqoq:12, rGyoy:13, epsG:55, rAcc:1, pe:60, fpe:35, peg:1.5, evEb:22, sBuy:22, buy:12, hold:2, sell:0, sSell:0, pt:220, upg:7, dng:0, vol:0.30 },
  { s:'META', n:'Meta Platforms Inc.', sec:'Communication Services', ind:'Internet Content', p:500, mc:1280e9, v:18e6, b:1.3, rGqoq:18, rGyoy:25, epsG:40, rAcc:5, pe:28, fpe:22, peg:1.0, evEb:17, sBuy:20, buy:12, hold:4, sell:1, sSell:0, pt:580, upg:6, dng:1, vol:0.35 },
  { s:'AVGO', n:'Broadcom Inc.', sec:'Technology', ind:'Semiconductors', p:1350, mc:630e9, v:5e6, b:1.3, rGqoq:15, rGyoy:44, epsG:25, rAcc:8, pe:55, fpe:28, peg:1.6, evEb:30, sBuy:14, buy:10, hold:3, sell:0, sSell:0, pt:1550, upg:5, dng:0, vol:0.35 },
  { s:'MU', n:'Micron Technology', sec:'Technology', ind:'Semiconductors', p:95, mc:105e9, v:20e6, b:1.4, rGqoq:25, rGyoy:80, epsG:200, rAcc:10, pe:25, fpe:12, peg:0.5, evEb:10, sBuy:15, buy:12, hold:5, sell:1, sSell:0, pt:130, upg:7, dng:1, vol:0.42 },
  { s:'TSM', n:'Taiwan Semiconductor', sec:'Technology', ind:'Semiconductors', p:170, mc:880e9, v:15e6, b:1.2, rGqoq:20, rGyoy:35, epsG:40, rAcc:8, pe:28, fpe:22, peg:1.1, evEb:16, sBuy:10, buy:8, hold:4, sell:0, sSell:0, pt:200, upg:4, dng:0, vol:0.30 },
  { s:'AMD', n:'Advanced Micro Devices', sec:'Technology', ind:'Semiconductors', p:165, mc:265e9, v:40e6, b:1.6, rGqoq:10, rGyoy:18, epsG:25, rAcc:-5, pe:45, fpe:30, peg:1.8, evEb:35, sBuy:12, buy:15, hold:8, sell:2, sSell:0, pt:195, upg:4, dng:2, vol:0.45 },
  { s:'MRVL', n:'Marvell Technology', sec:'Technology', ind:'Semiconductors', p:75, mc:65e9, v:12e6, b:1.5, rGqoq:18, rGyoy:27, epsG:45, rAcc:6, pe:50, fpe:28, peg:1.3, evEb:32, sBuy:14, buy:10, hold:4, sell:0, sSell:0, pt:95, upg:5, dng:0, vol:0.45 },
  { s:'CRWD', n:'CrowdStrike Holdings', sec:'Technology', ind:'Cybersecurity', p:330, mc:80e9, v:5e6, b:1.1, rGqoq:8, rGyoy:33, epsG:50, rAcc:-2, pe:75, fpe:55, peg:2.0, evEb:50, sBuy:18, buy:12, hold:5, sell:1, sSell:0, pt:380, upg:4, dng:1, vol:0.40 },
  { s:'PLTR', n:'Palantir Technologies', sec:'Technology', ind:'Software', p:24, mc:55e9, v:35e6, b:1.8, rGqoq:12, rGyoy:20, epsG:100, rAcc:3, pe:200, fpe:80, peg:5.0, evEb:100, sBuy:4, buy:6, hold:10, sell:3, sSell:1, pt:22, upg:2, dng:3, vol:0.55 },
  { s:'LLY', n:'Eli Lilly and Company', sec:'Healthcare', ind:'Pharmaceuticals', p:780, mc:740e9, v:3e6, b:0.5, rGqoq:28, rGyoy:32, epsG:45, rAcc:12, pe:110, fpe:55, peg:1.8, evEb:60, sBuy:12, buy:8, hold:4, sell:0, sSell:0, pt:900, upg:5, dng:0, vol:0.30 },
  { s:'JNJ', n:'Johnson & Johnson', sec:'Healthcare', ind:'Pharmaceuticals', p:155, mc:375e9, v:7e6, b:0.5, rGqoq:3, rGyoy:5, epsG:8, rAcc:-1, pe:15, fpe:14, peg:2.5, evEb:14, sBuy:4, buy:8, hold:12, sell:2, sSell:0, pt:170, upg:1, dng:2, vol:0.15 },
  { s:'UNH', n:'UnitedHealth Group', sec:'Healthcare', ind:'Health Plans', p:520, mc:480e9, v:4e6, b:0.6, rGqoq:8, rGyoy:12, epsG:14, rAcc:2, pe:22, fpe:18, peg:1.5, evEb:15, sBuy:12, buy:10, hold:4, sell:0, sSell:0, pt:600, upg:4, dng:0, vol:0.20 },
  { s:'PFE', n:'Pfizer Inc.', sec:'Healthcare', ind:'Pharmaceuticals', p:28, mc:158e9, v:30e6, b:0.7, rGqoq:-5, rGyoy:-15, epsG:-40, rAcc:-8, pe:12, fpe:10, peg:3.0, evEb:9, sBuy:2, buy:6, hold:14, sell:4, sSell:1, pt:32, upg:0, dng:4, vol:0.25 },
  { s:'ABT', n:'Abbott Laboratories', sec:'Healthcare', ind:'Medical Devices', p:115, mc:200e9, v:5e6, b:0.7, rGqoq:6, rGyoy:10, epsG:12, rAcc:1, pe:28, fpe:24, peg:2.2, evEb:20, sBuy:8, buy:10, hold:6, sell:0, sSell:0, pt:130, upg:3, dng:0, vol:0.18 },
  { s:'RTX', n:'RTX Corporation', sec:'Industrials', ind:'Aerospace & Defense', p:100, mc:148e9, v:5e6, b:0.7, rGqoq:8, rGyoy:10, epsG:15, rAcc:2, pe:35, fpe:22, peg:1.8, evEb:18, sBuy:8, buy:12, hold:5, sell:1, sSell:0, pt:115, upg:3, dng:1, vol:0.20 },
  { s:'LMT', n:'Lockheed Martin', sec:'Industrials', ind:'Aerospace & Defense', p:450, mc:110e9, v:1.5e6, b:0.5, rGqoq:5, rGyoy:8, epsG:10, rAcc:0, pe:17, fpe:16, peg:2.0, evEb:14, sBuy:5, buy:7, hold:10, sell:2, sSell:0, pt:490, upg:2, dng:1, vol:0.18 },
  { s:'NOC', n:'Northrop Grumman', sec:'Industrials', ind:'Aerospace & Defense', p:480, mc:62e9, v:1e6, b:0.4, rGqoq:6, rGyoy:7, epsG:12, rAcc:1, pe:20, fpe:18, peg:2.0, evEb:16, sBuy:4, buy:8, hold:8, sell:1, sSell:0, pt:520, upg:2, dng:0, vol:0.17 },
  { s:'GD', n:'General Dynamics', sec:'Industrials', ind:'Aerospace & Defense', p:280, mc:77e9, v:1.2e6, b:0.6, rGqoq:7, rGyoy:9, epsG:11, rAcc:1, pe:20, fpe:18, peg:1.9, evEb:15, sBuy:5, buy:9, hold:6, sell:1, sSell:0, pt:310, upg:3, dng:0, vol:0.18 },
  { s:'XOM', n:'Exxon Mobil Corporation', sec:'Energy', ind:'Oil & Gas', p:105, mc:440e9, v:15e6, b:0.8, rGqoq:-3, rGyoy:-8, epsG:-15, rAcc:-5, pe:13, fpe:12, peg:2.5, evEb:7, sBuy:8, buy:10, hold:8, sell:2, sSell:0, pt:120, upg:2, dng:2, vol:0.22 },
  { s:'CVX', n:'Chevron Corporation', sec:'Energy', ind:'Oil & Gas', p:155, mc:290e9, v:8e6, b:0.9, rGqoq:-4, rGyoy:-10, epsG:-20, rAcc:-3, pe:14, fpe:12, peg:3.0, evEb:6, sBuy:6, buy:10, hold:10, sell:2, sSell:0, pt:175, upg:1, dng:2, vol:0.23 },
  { s:'JPM', n:'JPMorgan Chase & Co.', sec:'Financials', ind:'Banks', p:195, mc:560e9, v:10e6, b:1.1, rGqoq:10, rGyoy:12, epsG:18, rAcc:2, pe:12, fpe:11, peg:1.2, evEb:0, sBuy:10, buy:8, hold:6, sell:0, sSell:0, pt:220, upg:4, dng:0, vol:0.22 },
  { s:'GS', n:'Goldman Sachs Group', sec:'Financials', ind:'Capital Markets', p:440, mc:155e9, v:2.5e6, b:1.3, rGqoq:15, rGyoy:20, epsG:25, rAcc:5, pe:15, fpe:13, peg:1.0, evEb:0, sBuy:8, buy:10, hold:6, sell:1, sSell:0, pt:500, upg:4, dng:1, vol:0.28 },
  { s:'V', n:'Visa Inc.', sec:'Financials', ind:'Payment Processing', p:280, mc:575e9, v:6e6, b:1.0, rGqoq:8, rGyoy:10, epsG:15, rAcc:1, pe:30, fpe:26, peg:2.0, evEb:25, sBuy:14, buy:12, hold:4, sell:0, sSell:0, pt:310, upg:3, dng:0, vol:0.18 },
  { s:'MA', n:'Mastercard Inc.', sec:'Financials', ind:'Payment Processing', p:460, mc:430e9, v:3e6, b:1.1, rGqoq:10, rGyoy:12, epsG:16, rAcc:2, pe:35, fpe:30, peg:2.1, evEb:30, sBuy:16, buy:10, hold:4, sell:0, sSell:0, pt:510, upg:4, dng:0, vol:0.19 },
  { s:'PG', n:'Procter & Gamble', sec:'Consumer Staples', ind:'Household Products', p:165, mc:390e9, v:7e6, b:0.4, rGqoq:3, rGyoy:4, epsG:6, rAcc:0, pe:27, fpe:25, peg:4.0, evEb:22, sBuy:5, buy:8, hold:12, sell:2, sSell:0, pt:175, upg:1, dng:1, vol:0.12 },
  { s:'KO', n:'Coca-Cola Company', sec:'Consumer Staples', ind:'Beverages', p:62, mc:268e9, v:12e6, b:0.6, rGqoq:2, rGyoy:3, epsG:5, rAcc:-1, pe:25, fpe:23, peg:4.5, evEb:23, sBuy:4, buy:10, hold:10, sell:2, sSell:0, pt:68, upg:1, dng:1, vol:0.12 },
  { s:'WMT', n:'Walmart Inc.', sec:'Consumer Staples', ind:'Discount Stores', p:175, mc:470e9, v:8e6, b:0.5, rGqoq:5, rGyoy:6, epsG:8, rAcc:1, pe:30, fpe:27, peg:3.5, evEb:15, sBuy:14, buy:10, hold:4, sell:0, sSell:0, pt:195, upg:4, dng:0, vol:0.15 },
  { s:'COST', n:'Costco Wholesale', sec:'Consumer Staples', ind:'Discount Stores', p:740, mc:328e9, v:2e6, b:0.8, rGqoq:7, rGyoy:9, epsG:12, rAcc:1, pe:50, fpe:42, peg:4.0, evEb:35, sBuy:10, buy:8, hold:8, sell:2, sSell:0, pt:800, upg:2, dng:1, vol:0.18 },
  { s:'NEE', n:'NextEra Energy', sec:'Utilities', ind:'Utilities-Renewable', p:75, mc:155e9, v:10e6, b:0.5, rGqoq:4, rGyoy:8, epsG:10, rAcc:1, pe:22, fpe:20, peg:2.5, evEb:18, sBuy:6, buy:10, hold:6, sell:1, sSell:0, pt:85, upg:2, dng:1, vol:0.18 },
  { s:'DUK', n:'Duke Energy', sec:'Utilities', ind:'Utilities-Regulated', p:100, mc:77e9, v:3e6, b:0.4, rGqoq:2, rGyoy:4, epsG:5, rAcc:0, pe:18, fpe:17, peg:3.5, evEb:14, sBuy:3, buy:6, hold:10, sell:2, sSell:0, pt:108, upg:1, dng:1, vol:0.14 },
  { s:'AMT', n:'American Tower Corp', sec:'Real Estate', ind:'REIT-Specialty', p:215, mc:100e9, v:2e6, b:0.6, rGqoq:3, rGyoy:5, epsG:8, rAcc:0, pe:40, fpe:35, peg:4.5, evEb:25, sBuy:6, buy:8, hold:8, sell:1, sSell:0, pt:240, upg:2, dng:1, vol:0.20 },
  { s:'O', n:'Realty Income Corp', sec:'Real Estate', ind:'REIT-Retail', p:55, mc:46e9, v:5e6, b:0.7, rGqoq:2, rGyoy:18, epsG:5, rAcc:1, pe:45, fpe:40, peg:8.0, evEb:22, sBuy:4, buy:6, hold:10, sell:2, sSell:0, pt:60, upg:1, dng:1, vol:0.17 },
  { s:'CAT', n:'Caterpillar Inc.', sec:'Industrials', ind:'Farm & Heavy Equipment', p:350, mc:172e9, v:3e6, b:1.0, rGqoq:4, rGyoy:8, epsG:12, rAcc:-2, pe:17, fpe:15, peg:1.5, evEb:12, sBuy:6, buy:10, hold:8, sell:2, sSell:0, pt:380, upg:2, dng:1, vol:0.22 },
  { s:'HON', n:'Honeywell International', sec:'Industrials', ind:'Conglomerates', p:210, mc:140e9, v:3e6, b:1.0, rGqoq:5, rGyoy:6, epsG:8, rAcc:0, pe:22, fpe:20, peg:2.5, evEb:16, sBuy:5, buy:10, hold:8, sell:2, sSell:0, pt:230, upg:2, dng:1, vol:0.18 },
  { s:'DE', n:'Deere & Company', sec:'Industrials', ind:'Farm & Heavy Equipment', p:420, mc:120e9, v:2e6, b:0.9, rGqoq:-8, rGyoy:-15, epsG:-20, rAcc:-5, pe:14, fpe:16, peg:2.0, evEb:12, sBuy:4, buy:8, hold:10, sell:3, sSell:0, pt:440, upg:1, dng:3, vol:0.23 },
  { s:'BA', n:'Boeing Company', sec:'Industrials', ind:'Aerospace & Defense', p:185, mc:115e9, v:8e6, b:1.5, rGqoq:10, rGyoy:15, epsG:50, rAcc:5, pe:-20, fpe:35, peg:0, evEb:25, sBuy:6, buy:10, hold:10, sell:3, sSell:1, pt:210, upg:3, dng:2, vol:0.38 },
  { s:'CRM', n:'Salesforce Inc.', sec:'Technology', ind:'Software', p:270, mc:260e9, v:6e6, b:1.2, rGqoq:8, rGyoy:11, epsG:30, rAcc:-1, pe:45, fpe:28, peg:1.8, evEb:25, sBuy:16, buy:14, hold:6, sell:1, sSell:0, pt:310, upg:5, dng:1, vol:0.30 },
  { s:'ORCL', n:'Oracle Corporation', sec:'Technology', ind:'Software', p:125, mc:340e9, v:10e6, b:1.0, rGqoq:10, rGyoy:18, epsG:20, rAcc:4, pe:35, fpe:25, peg:1.5, evEb:20, sBuy:12, buy:10, hold:8, sell:2, sSell:0, pt:150, upg:4, dng:1, vol:0.28 },
  { s:'ADBE', n:'Adobe Inc.', sec:'Technology', ind:'Software', p:530, mc:235e9, v:4e6, b:1.2, rGqoq:6, rGyoy:10, epsG:15, rAcc:-2, pe:42, fpe:28, peg:2.0, evEb:30, sBuy:10, buy:12, hold:8, sell:2, sSell:0, pt:600, upg:3, dng:2, vol:0.30 },
  { s:'NOW', n:'ServiceNow Inc.', sec:'Technology', ind:'Software', p:780, mc:160e9, v:1.5e6, b:1.1, rGqoq:10, rGyoy:24, epsG:35, rAcc:3, pe:70, fpe:50, peg:2.2, evEb:55, sBuy:18, buy:10, hold:3, sell:0, sSell:0, pt:880, upg:6, dng:0, vol:0.30 },
  { s:'ABNB', n:'Airbnb Inc.', sec:'Consumer Discretionary', ind:'Travel Services', p:155, mc:98e9, v:5e6, b:1.4, rGqoq:8, rGyoy:12, epsG:20, rAcc:-3, pe:35, fpe:28, peg:2.0, evEb:22, sBuy:8, buy:10, hold:10, sell:3, sSell:0, pt:170, upg:2, dng:2, vol:0.38 },
  { s:'NFLX', n:'Netflix Inc.', sec:'Communication Services', ind:'Entertainment', p:620, mc:270e9, v:5e6, b:1.4, rGqoq:15, rGyoy:16, epsG:40, rAcc:2, pe:42, fpe:32, peg:1.5, evEb:28, sBuy:14, buy:12, hold:8, sell:2, sSell:0, pt:700, upg:5, dng:1, vol:0.35 },
  { s:'DIS', n:'Walt Disney Company', sec:'Communication Services', ind:'Entertainment', p:110, mc:200e9, v:10e6, b:1.2, rGqoq:5, rGyoy:4, epsG:25, rAcc:-1, pe:65, fpe:22, peg:2.5, evEb:18, sBuy:8, buy:12, hold:10, sell:2, sSell:0, pt:125, upg:3, dng:2, vol:0.28 },
  { s:'CMCSA', n:'Comcast Corporation', sec:'Communication Services', ind:'Telecom Services', p:42, mc:175e9, v:18e6, b:1.0, rGqoq:2, rGyoy:3, epsG:8, rAcc:-2, pe:11, fpe:10, peg:2.0, evEb:8, sBuy:6, buy:10, hold:10, sell:2, sSell:0, pt:48, upg:2, dng:2, vol:0.22 },
  { s:'T', n:'AT&T Inc.', sec:'Communication Services', ind:'Telecom Services', p:17, mc:122e9, v:35e6, b:0.7, rGqoq:1, rGyoy:1, epsG:3, rAcc:0, pe:8, fpe:7, peg:4.0, evEb:7, sBuy:4, buy:8, hold:14, sell:3, sSell:1, pt:20, upg:1, dng:2, vol:0.18 },
];

function buildSampleData(): Map<string, SampleStockData> {
  const map = new Map<string, SampleStockData>();

  for (const r of SAMPLE_STOCKS_RAW) {
    const totalAnalysts = r.sBuy + r.buy + r.hold + r.sell + r.sSell;
    const buyPercent = ((r.sBuy + r.buy) / totalAnalysts) * 100;
    let consensus = 'Hold';
    if (buyPercent >= 80) consensus = 'Strong Buy';
    else if (buyPercent >= 60) consensus = 'Buy';

    map.set(r.s, {
      stock: {
        symbol: r.s, name: r.n, sector: r.sec, industry: r.ind,
        price: r.p, marketCap: r.mc, volume: r.v, beta: r.b,
      },
      quote: {
        symbol: r.s, price: r.p, change: +(r.p * 0.005).toFixed(2),
        changePercent: 0.5, volume: r.v, avgVolume: r.v,
        dayHigh: +(r.p * 1.01).toFixed(2), dayLow: +(r.p * 0.99).toFixed(2),
        fiftyDayMA: +(r.p * 0.97).toFixed(2), twoHundredDayMA: +(r.p * 0.92).toFixed(2),
        yearHigh: +(r.p * 1.15).toFixed(2), yearLow: +(r.p * 0.7).toFixed(2),
        marketCap: r.mc,
      },
      fundamentals: {
        symbol: r.s, revenueGrowthQoQ: r.rGqoq, revenueGrowthYoY: r.rGyoy,
        epsGrowthYoY: r.epsG, revenueGrowthAcceleration: r.rAcc,
        peRatio: r.pe, forwardPE: r.fpe, pegRatio: r.peg, evToEbitda: r.evEb,
        sectorMedianPE: 25, sectorMedianEvEbitda: 18,
        revenue: r.mc * 0.15, netIncome: r.mc * 0.05,
        eps: r.p / (r.pe || 25), grossMargin: 55, operatingMargin: 25, netMargin: 15,
      },
      analyst: {
        symbol: r.s, strongBuy: r.sBuy, buy: r.buy, hold: r.hold, sell: r.sell,
        strongSell: r.sSell, consensusRating: consensus, priceTarget: r.pt,
        numberOfAnalysts: totalAnalysts, upgradesLast90: r.upg, downgradesLast90: r.dng,
        priceTargetUpside: +((r.pt - r.p) / r.p * 100).toFixed(1),
      },
      priceTarget: {
        targetHigh: +(r.pt * 1.15).toFixed(2), targetLow: +(r.pt * 0.75).toFixed(2),
        targetConsensus: r.pt, targetMedian: +(r.pt * 0.98).toFixed(2),
      },
    });
  }

  return map;
}

const SAMPLE_DATA = buildSampleData();

export class SampleDataProvider implements DataProvider {
  isLive(): boolean { return false; }

  async getScreenerResults(filters: FilterConfig): Promise<Stock[]> {
    const results: Stock[] = [];
    for (const [, data] of SAMPLE_DATA) {
      const s = data.stock;
      if (s.marketCap < filters.minMarketCap) continue;
      if (filters.sectors.length > 0 && !filters.sectors.includes(s.sector)) continue;
      if (filters.excludeTickers.includes(s.symbol)) continue;
      if (s.volume < filters.minVolume) continue;

      // Revenue growth filter
      const rg = data.fundamentals.revenueGrowthYoY;
      if (rg !== null && rg < filters.minRevenueGrowth) continue;

      // Analyst consensus filter
      if (filters.analystConsensus !== 'any') {
        const cr = data.analyst.consensusRating;
        if (filters.analystConsensus === 'strongBuy' && cr !== 'Strong Buy') continue;
        if (filters.analystConsensus === 'buy' && cr !== 'Buy' && cr !== 'Strong Buy') continue;
      }

      results.push(s);
    }
    return results;
  }

  async getQuote(symbols: string | string[]): Promise<StockQuote[]> {
    const syms = Array.isArray(symbols) ? symbols : [symbols];
    return syms.map(s => SAMPLE_DATA.get(s)?.quote).filter((q): q is StockQuote => q !== undefined);
  }

  async getFundamentals(symbol: string): Promise<StockFundamentals> {
    const data = SAMPLE_DATA.get(symbol);
    if (!data) throw new Error(`No sample data for ${symbol}`);
    return data.fundamentals;
  }

  async getHistoricalPrices(symbol: string, days: number = 180): Promise<PricePoint[]> {
    const data = SAMPLE_DATA.get(symbol);
    if (!data) throw new Error(`No sample data for ${symbol}`);
    return generateHistoricalPrices(symbol, data.stock.price, days, data.analyst.symbol === symbol ? 0.3 : 0.25);
  }

  async getAnalystRatings(symbol: string): Promise<AnalystData> {
    const data = SAMPLE_DATA.get(symbol);
    if (!data) throw new Error(`No sample data for ${symbol}`);
    return data.analyst;
  }

  async getPriceTargetConsensus(symbol: string): Promise<PriceTarget> {
    const data = SAMPLE_DATA.get(symbol);
    if (!data) throw new Error(`No sample data for ${symbol}`);
    return data.priceTarget;
  }
}

export function getAllSampleStocks(): Stock[] {
  return Array.from(SAMPLE_DATA.values()).map(d => d.stock);
}

export function getSampleStockData(symbol: string): SampleStockData | undefined {
  return SAMPLE_DATA.get(symbol);
}
