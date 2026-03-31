# Stock Screener App — Full Build Specification for Claude Code

## Overview

Build a **portfolio-aware stock screener** web application. This is NOT a generic screener — its core differentiator is Layer 3: it ranks stocks by how much they **improve the user's existing portfolio**, not just by raw quality. A stock with a perfect growth score that's 90% correlated to existing holdings ranks LOWER than a decent stock that's uncorrelated.

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Recharts + Financial Modeling Prep API (free tier).

**Philosophy:** Ship a working MVP first. Every feature must be functional end-to-end before adding the next. No placeholders, no mock data in production screens.

---

## Architecture — Three-Layer Pipeline

### Layer 1: Universe Filter (8,000 → ~200 stocks)
Hard binary filters. Stocks that fail ANY filter are eliminated.

**Filters (all user-adjustable via UI):**
- Market cap: min $5B (default), options: $1B / $5B / $10B / $50B / $100B+
- Revenue growth YoY: min 15% (default), range slider 0-200%
- Average daily volume: min 500K shares
- Analyst consensus: Buy or Strong Buy (default), options: any / buy+ / strong buy only
- Sector: multi-select checkboxes (all 11 GICS sectors), default = all
- Country: US-listed only (default), option to include international ADRs
- Exclude user-defined tickers (text input, comma-separated)

### Layer 2: Multi-Factor Scoring Engine (score each stock 0-100)
Every stock that passes Layer 1 gets scored across 5 weighted dimensions. Each dimension uses 2-3 sub-metrics. Sub-metrics are **percentile-ranked within their sector** (so a 20% growth pharma isn't penalized vs a 200% growth AI stock).

**Dimension 1: Growth (default weight: 30%)**
- Revenue growth QoQ (most recent quarter vs prior quarter)
- EPS growth YoY (TTM vs prior year TTM)
- Revenue growth acceleration (is growth rate itself increasing?)

**Dimension 2: Momentum (default weight: 25%)**
- Price vs 50-day moving average (% above/below)
- Price vs 200-day moving average (% above/below)  
- 6-month relative performance vs S&P 500

**Dimension 3: Valuation (default weight: 15%)**
- PEG ratio (lower = better, inverted scoring)
- Forward P/E vs sector median (lower = better, inverted)
- EV/EBITDA vs sector median

**Dimension 4: Analyst Edge (default weight: 15%)**
- % of analysts with Buy/Strong Buy rating
- Consensus price target upside % from current price
- Number of upgrades in last 90 days minus downgrades

**Dimension 5: Risk (default weight: 15%, inverted — lower risk = higher score)**
- Beta (lower = better for this dimension)
- 52-week volatility (standard deviation of daily returns, annualized)
- Max drawdown in last 6 months

**Scoring formula per stock:**
```
composite_score = (growth_percentile × growth_weight) + 
                  (momentum_percentile × momentum_weight) +
                  (valuation_percentile × valuation_weight) +
                  (analyst_percentile × analyst_weight) +
                  (risk_percentile × risk_weight)
```

All weights are user-adjustable via sliders in the UI. Sliders should auto-normalize to sum to 100%.

### Layer 3: Portfolio-Aware Optimizer
This is the KEY differentiator. It takes the Layer 2 composite scores and re-ranks based on portfolio fit.

**Inputs:**
- User's current holdings (ticker + weight/dollar amount)
- Candidate stocks from Layer 2 with their scores

**Portfolio-aware adjustments:**
1. **Correlation penalty:** For each candidate, estimate its correlation with the user's existing portfolio using sector-based correlation proxies:
   - Same sub-sector: correlation estimate ~0.80
   - Same sector: ~0.55
   - Adjacent sectors (e.g., tech ↔ communication services): ~0.40
   - Unrelated sectors (e.g., tech ↔ healthcare, tech ↔ defense): ~0.15
   - Apply penalty: `adjusted_score = composite_score × (1 - correlation_penalty × portfolio_overlap_weight)`
   - `portfolio_overlap_weight` = sum of weights of existing holdings in correlated sectors

2. **Sector concentration penalty:** If user already has >40% in one sector, candidates from that sector get a -15 point penalty. If >60%, -30 point penalty.

3. **Portfolio impact score:** For each candidate, estimate the marginal Sharpe ratio improvement:
   - Calculate current portfolio's expected return and volatility (using sector-average returns and vols)
   - Calculate new portfolio's expected return and volatility if this candidate is added at 10% weight
   - Delta Sharpe = new Sharpe - old Sharpe
   - This becomes a secondary ranking signal shown in the results

**Output:** Final ranked list sorted by `adjusted_score`, with columns showing both raw score and portfolio-adjusted score, plus the Sharpe delta.

---

## Data Layer — Financial Modeling Prep API

**API:** https://financialmodelingprep.com — free tier gives 250 requests/day. This is sufficient for our use case because we cache aggressively.

**Required endpoints:**
```
GET /api/v3/stock-screener?marketCapMoreThan=5000000000&limit=500&apikey={key}
GET /api/v3/quote/{symbol}?apikey={key}
GET /api/v3/profile/{symbol}?apikey={key}
GET /api/v3/income-statement/{symbol}?period=quarter&limit=8&apikey={key}
GET /api/v3/key-metrics-ttm/{symbol}?apikey={key}
GET /api/v3/ratios-ttm/{symbol}?apikey={key}
GET /api/v3/analyst-estimates/{symbol}?limit=4&apikey={key}
GET /api/v3/grade/{symbol}?limit=20&apikey={key}
GET /api/v3/historical-price-full/{symbol}?timeseries=180&apikey={key}
GET /api/v4/price-target-consensus?symbol={symbol}&apikey={key}
```

**Caching strategy (CRITICAL — free tier has 250 req/day):**
- Cache all API responses in a local JSON file store (`.cache/` directory) or SQLite database
- TTL: stock screener list = 24 hours, quotes = 1 hour, fundamentals = 24 hours, historical prices = 6 hours
- On app start, load from cache first, only fetch fresh data if cache is expired
- Show "last updated: X hours ago" in the UI
- Implement a "Refresh Data" button that clears cache and re-fetches (with a warning about API limits)
- Batch symbol requests where the API supports it (e.g., `/quote/AAPL,MSFT,NVDA`)

**Fallback:** If FMP API key is not configured, the app should still work with a bundled sample dataset of ~50 popular stocks (hardcoded JSON file) so the user can test the UI and scoring logic without an API key. Show a banner: "Using sample data. Add your FMP API key in settings for live data."

**Alternative API support (future-proofing):**
Structure the data fetching layer as an abstract interface so it's easy to swap in Alpha Vantage, Finnhub, or Yahoo Finance later. Create a `DataProvider` interface with methods like `getQuote()`, `getFundamentals()`, `getHistoricalPrices()`, `getAnalystRatings()`. Implement `FMPProvider` as the default.

---

## UI Design Specification

**Theme:** Dark mode primary (financial apps convention). Light mode as secondary option.
**Design language:** Clean, dense, data-rich. Think Bloomberg Terminal meets modern SaaS. No unnecessary whitespace — this is a power tool, not a marketing site.

### Page Structure (Single Page App with tabs)

**Tab 1: Screener (main view)**
Left sidebar (collapsible, ~300px):
- Filter controls (Layer 1): dropdowns, sliders, multi-select
- Scoring weight sliders (Layer 2): 5 sliders that auto-normalize to 100%
- "Run Screen" button (primary action)
- "Reset to Defaults" button (secondary)

Main content area:
- Results table (sortable by any column):
  - Columns: Rank, Ticker, Company Name, Sector, Price, Market Cap, Composite Score (with color gradient bar 0-100), Growth Score, Momentum Score, Valuation Score, Analyst Score, Risk Score, Portfolio Fit Score (if portfolio is configured), Analyst PT Upside %, Action (+ button to add to portfolio)
  - Rows are clickable → expand to show detail card with:
    - Key fundamentals (revenue, EPS, margins)
    - Price chart (6-month, Recharts line chart)
    - Analyst ratings breakdown (pie chart: strong buy / buy / hold / sell)
    - Correlation estimate with current portfolio
- Pagination or virtual scrolling for 200+ results
- Export to CSV button

**Tab 2: My Portfolio**
- Input area: Add holdings (ticker input with autocomplete + dollar amount or % weight)
- Portfolio table: Ticker, Name, Sector, Weight, Price, Beta, 6M Return
- Portfolio stats cards: Total Value, Weighted Beta, Estimated Annual Return, Estimated Volatility, Sharpe Ratio, Sector Breakdown (pie chart), Top Correlations
- "Analyze Portfolio" button → runs Layer 3 and switches to Screener tab with portfolio-aware results

**Tab 3: Compare**
- Side-by-side comparison of up to 4 stocks
- Radar chart (Recharts) overlaying all 5 factor scores
- Key metrics table
- Correlation matrix between selected stocks
- "What-if" simulator: if I add Stock X at Y%, how does my portfolio change?

**Tab 4: Settings**
- API key input (stored in localStorage, never sent to any server besides FMP)
- Cache management (clear cache, show cache size)
- Default filter presets (save/load custom presets)
- Scoring weight presets: "Aggressive Growth", "Balanced", "Value", "Momentum" (pre-configured weight sets)

### UI Components (use shadcn/ui)
- `Card` for metric displays
- `Table` for results (with `DataTable` pattern for sorting/filtering)
- `Slider` for weights and filters
- `Select` / `MultiSelect` for dropdowns
- `Tabs` for page navigation
- `Badge` for sector tags and score indicators
- `Dialog` for stock detail modal
- `Toast` for notifications (API errors, cache status)
- `Tooltip` for explaining metrics on hover
- `Input` with debounced autocomplete for ticker search

### Score Visualization
- Composite score: horizontal bar with color gradient (red 0-30, yellow 30-60, green 60-100)
- Sub-scores: small spark bars in table cells
- Portfolio fit: green up-arrow if positive Sharpe delta, red down-arrow if negative
- Sector exposure: donut chart (Recharts)

---

## Project Structure

```
stock-screener/
├── app/
│   ├── layout.tsx              # Root layout with theme provider
│   ├── page.tsx                # Main page with tab navigation
│   ├── globals.css             # Tailwind + custom dark theme
│   └── api/                    # API route handlers (proxy to FMP to hide API key)
│       └── stocks/
│           ├── screen/route.ts      # Run screener with filters
│           ├── quote/route.ts       # Get quote for symbol(s)
│           ├── fundamentals/route.ts # Get fundamentals for symbol
│           ├── historical/route.ts   # Get price history
│           └── analysts/route.ts     # Get analyst data
├── components/
│   ├── screener/
│   │   ├── FilterPanel.tsx     # Left sidebar with all Layer 1 filters
│   │   ├── WeightSliders.tsx   # Layer 2 scoring weight controls
│   │   ├── ResultsTable.tsx    # Main sortable results table
│   │   ├── StockDetailCard.tsx # Expanded detail view for a stock
│   │   └── ScoreBar.tsx        # Visual score indicator component
│   ├── portfolio/
│   │   ├── PortfolioInput.tsx  # Add/remove holdings
│   │   ├── PortfolioStats.tsx  # Summary statistics cards
│   │   └── SectorChart.tsx     # Donut chart for sector breakdown
│   ├── compare/
│   │   ├── CompareView.tsx     # Side-by-side comparison
│   │   ├── RadarChart.tsx      # 5-factor overlay chart
│   │   └── WhatIfSimulator.tsx # Portfolio impact simulator
│   └── ui/                     # shadcn/ui components (auto-generated)
├── lib/
│   ├── providers/
│   │   ├── types.ts            # DataProvider interface definition
│   │   ├── fmp.ts              # Financial Modeling Prep implementation
│   │   └── sample-data.ts      # Fallback sample dataset
│   ├── scoring/
│   │   ├── percentile.ts       # Percentile ranking within sectors
│   │   ├── composite.ts        # Multi-factor composite score calculator
│   │   └── portfolio-fit.ts    # Layer 3 portfolio-aware adjustments
│   ├── cache.ts                # File-based or localStorage caching layer
│   ├── correlation.ts          # Sector-based correlation estimation
│   ├── portfolio-math.ts       # Sharpe ratio, volatility, beta calculations
│   └── constants.ts            # Sector lists, default weights, correlation matrix
├── hooks/
│   ├── useScreener.ts          # Main screener state + logic hook
│   ├── usePortfolio.ts         # Portfolio management hook (localStorage persistence)
│   └── useStockData.ts         # Data fetching + caching hook
├── types/
│   └── index.ts                # All TypeScript interfaces
└── .env.local                  # FMP_API_KEY=your_key_here
```

---

## Implementation Order (build in this sequence)

### Phase 1: Foundation (get data flowing)
1. Initialize Next.js project with TypeScript + Tailwind + shadcn/ui
2. Create the `DataProvider` interface and `FMPProvider` implementation
3. Build the caching layer
4. Create API route handlers that proxy FMP calls
5. Build the sample-data fallback
6. Verify data flows end-to-end with a simple page that shows a stock quote

### Phase 2: Scoring Engine (the brain)
7. Implement percentile ranking function
8. Build sub-metric calculators for each of the 5 dimensions
9. Implement composite score calculator with configurable weights
10. Test with sample data: verify scores make intuitive sense (NVDA should score high on growth + momentum, low on valuation)

### Phase 3: Screener UI (main interface)
11. Build the FilterPanel component
12. Build the WeightSliders component (with auto-normalization)
13. Build the ResultsTable with sorting and score visualization
14. Build the StockDetailCard expandable row
15. Wire everything together with the `useScreener` hook
16. Add CSV export

### Phase 4: Portfolio Layer (the differentiator)
17. Build PortfolioInput (add/remove/edit holdings, persist to localStorage)
18. Implement correlation estimation (sector-based proxy matrix)
19. Implement portfolio-aware score adjustments (Layer 3)
20. Build PortfolioStats dashboard with sector chart
21. Add "Portfolio Fit" column to results table
22. Show Sharpe delta for each candidate

### Phase 5: Compare & Polish
23. Build CompareView with radar chart
24. Build WhatIfSimulator
25. Add preset weight profiles
26. Add dark/light mode toggle
27. Error handling, loading states, empty states
28. Mobile responsiveness (sidebar collapses to sheet)

---

## Key TypeScript Interfaces

```typescript
interface Stock {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  volume: number;
  beta: number;
}

interface StockScore {
  symbol: string;
  compositeScore: number;        // 0-100
  growthScore: number;           // 0-100 percentile
  momentumScore: number;
  valuationScore: number;
  analystScore: number;
  riskScore: number;
  portfolioFitScore?: number;    // only if portfolio configured
  sharpeContribution?: number;   // marginal Sharpe delta
}

interface ScoringWeights {
  growth: number;      // 0-1, all must sum to 1
  momentum: number;
  valuation: number;
  analyst: number;
  risk: number;
}

interface FilterConfig {
  minMarketCap: number;
  minRevenueGrowth: number;
  minVolume: number;
  analystConsensus: 'any' | 'buy' | 'strongBuy';
  sectors: string[];
  excludeTickers: string[];
}

interface PortfolioHolding {
  symbol: string;
  name: string;
  sector: string;
  amount: number;      // dollar amount
  weight: number;      // 0-1, percentage of portfolio
  price: number;
  beta: number;
}

interface PortfolioStats {
  totalValue: number;
  weightedBeta: number;
  estimatedReturn: number;
  estimatedVolatility: number;
  sharpeRatio: number;
  sectorBreakdown: Record<string, number>;  // sector → weight
  maxSectorConcentration: number;
}

interface DataProvider {
  getScreenerResults(filters: FilterConfig): Promise<Stock[]>;
  getQuote(symbol: string): Promise<StockQuote>;
  getFundamentals(symbol: string): Promise<StockFundamentals>;
  getHistoricalPrices(symbol: string, days: number): Promise<PricePoint[]>;
  getAnalystRatings(symbol: string): Promise<AnalystData>;
  getPriceTargetConsensus(symbol: string): Promise<PriceTarget>;
}
```

---

## Sector Correlation Matrix (hardcoded constants)

Use this as the default correlation proxy. These are approximations based on historical sector correlations:

```typescript
const SECTOR_CORRELATIONS: Record<string, Record<string, number>> = {
  'Technology':            { 'Technology': 0.85, 'Communication Services': 0.72, 'Consumer Discretionary': 0.65, 'Healthcare': 0.15, 'Industrials': 0.40, 'Financials': 0.50, 'Energy': 0.20, 'Consumer Staples': 0.10, 'Utilities': 0.05, 'Real Estate': 0.15, 'Materials': 0.30 },
  'Healthcare':            { 'Technology': 0.15, 'Communication Services': 0.12, 'Consumer Discretionary': 0.20, 'Healthcare': 0.80, 'Industrials': 0.25, 'Financials': 0.30, 'Energy': 0.10, 'Consumer Staples': 0.45, 'Utilities': 0.35, 'Real Estate': 0.20, 'Materials': 0.15 },
  'Industrials':           { 'Technology': 0.40, 'Communication Services': 0.35, 'Consumer Discretionary': 0.55, 'Healthcare': 0.25, 'Industrials': 0.80, 'Financials': 0.55, 'Energy': 0.50, 'Consumer Staples': 0.30, 'Utilities': 0.25, 'Real Estate': 0.35, 'Materials': 0.60 },
  'Energy':                { 'Technology': 0.20, 'Communication Services': 0.15, 'Consumer Discretionary': 0.30, 'Healthcare': 0.10, 'Industrials': 0.50, 'Financials': 0.40, 'Energy': 0.85, 'Consumer Staples': 0.20, 'Utilities': 0.35, 'Real Estate': 0.15, 'Materials': 0.55 },
  'Financials':            { 'Technology': 0.50, 'Communication Services': 0.45, 'Consumer Discretionary': 0.55, 'Healthcare': 0.30, 'Industrials': 0.55, 'Financials': 0.85, 'Energy': 0.40, 'Consumer Staples': 0.35, 'Utilities': 0.30, 'Real Estate': 0.50, 'Materials': 0.45 },
  'Consumer Discretionary':{ 'Technology': 0.65, 'Communication Services': 0.60, 'Consumer Discretionary': 0.80, 'Healthcare': 0.20, 'Industrials': 0.55, 'Financials': 0.55, 'Energy': 0.30, 'Consumer Staples': 0.40, 'Utilities': 0.15, 'Real Estate': 0.30, 'Materials': 0.40 },
  'Consumer Staples':      { 'Technology': 0.10, 'Communication Services': 0.15, 'Consumer Discretionary': 0.40, 'Healthcare': 0.45, 'Industrials': 0.30, 'Financials': 0.35, 'Energy': 0.20, 'Consumer Staples': 0.80, 'Utilities': 0.55, 'Real Estate': 0.40, 'Materials': 0.25 },
  'Utilities':             { 'Technology': 0.05, 'Communication Services': 0.10, 'Consumer Discretionary': 0.15, 'Healthcare': 0.35, 'Industrials': 0.25, 'Financials': 0.30, 'Energy': 0.35, 'Consumer Staples': 0.55, 'Utilities': 0.85, 'Real Estate': 0.50, 'Materials': 0.20 },
  'Communication Services':{ 'Technology': 0.72, 'Communication Services': 0.85, 'Consumer Discretionary': 0.60, 'Healthcare': 0.12, 'Industrials': 0.35, 'Financials': 0.45, 'Energy': 0.15, 'Consumer Staples': 0.15, 'Utilities': 0.10, 'Real Estate': 0.20, 'Materials': 0.25 },
  'Real Estate':           { 'Technology': 0.15, 'Communication Services': 0.20, 'Consumer Discretionary': 0.30, 'Healthcare': 0.20, 'Industrials': 0.35, 'Financials': 0.50, 'Energy': 0.15, 'Consumer Staples': 0.40, 'Utilities': 0.50, 'Real Estate': 0.85, 'Materials': 0.30 },
  'Materials':             { 'Technology': 0.30, 'Communication Services': 0.25, 'Consumer Discretionary': 0.40, 'Healthcare': 0.15, 'Industrials': 0.60, 'Financials': 0.45, 'Energy': 0.55, 'Consumer Staples': 0.25, 'Utilities': 0.20, 'Real Estate': 0.30, 'Materials': 0.85 },
};
```

---

## Scoring Weight Presets

```typescript
const WEIGHT_PRESETS = {
  'Aggressive Growth':  { growth: 0.35, momentum: 0.30, valuation: 0.05, analyst: 0.15, risk: 0.15 },
  'Balanced Growth':    { growth: 0.25, momentum: 0.20, valuation: 0.20, analyst: 0.20, risk: 0.15 },
  'Value':              { growth: 0.15, momentum: 0.10, valuation: 0.35, analyst: 0.20, risk: 0.20 },
  'Momentum':           { growth: 0.15, momentum: 0.40, valuation: 0.05, analyst: 0.15, risk: 0.25 },
  'Low Risk':           { growth: 0.15, momentum: 0.15, valuation: 0.20, analyst: 0.15, risk: 0.35 },
};
```

---

## Critical Implementation Notes

1. **API key security:** The FMP API key should ONLY be used server-side in Next.js API routes. Never expose it to the client. Store in `.env.local` as `FMP_API_KEY`.

2. **Rate limiting:** The free FMP tier allows 250 requests/day. The app MUST respect this. Implement a request counter that warns the user when approaching the limit. Batch requests where possible.

3. **Percentile ranking:** When computing percentile ranks, group stocks by their GICS sector BEFORE ranking. A tech stock's growth should be compared to other tech stocks, not to utilities.

4. **Weight normalization:** When the user adjusts any scoring weight slider, ALL sliders must auto-adjust proportionally so they always sum to 100%. Use the "redistribute remaining" pattern: if user sets growth to 40% (from 30%), subtract the 10% proportionally from the other 4 sliders.

5. **Portfolio persistence:** Store the user's portfolio in localStorage. It should persist across sessions. Include an import/export JSON feature.

6. **Error states:** Every API call needs proper error handling with user-friendly messages. If FMP is down, fall back to cached data with a warning. If no cache exists, fall back to sample data.

7. **Performance:** The scoring engine must process 200+ stocks in under 2 seconds. Use Web Workers if the main thread gets blocked. Memoize expensive computations.

8. **Empty states:** Design thoughtful empty states for: no API key configured, no portfolio added, no results match filters, API quota exceeded.

9. **Accessibility:** All interactive elements need proper ARIA labels. Score colors must have sufficient contrast. Keyboard navigation for the results table.

10. **Environment setup:** Create a `.env.example` file with:
```
FMP_API_KEY=your_api_key_here
```
And include instructions in README.md for getting a free FMP API key at https://financialmodelingprep.com/developer/docs/

---

## Sample Data Fallback (bundle this)

Include a hardcoded dataset of ~50 stocks spanning all 11 GICS sectors with pre-computed metrics so the app works without an API key. Include at minimum: NVDA, AAPL, MSFT, GOOGL, AMZN, META, AVGO, MU, TSM, AMD, MRVL, CRWD, PLTR, LLY, JNJ, UNH, PFE, ABT, RTX, LMT, NOC, GD, XOM, CVX, JPM, GS, V, MA, PG, KO, WMT, COST, NEE, DUK, AMT, O, CAT, HON, DE, BA, CRM, ORCL, ADBE, NOW, ABNB, NFLX, DIS, CMCSA, T.

For each, include: price, marketCap, sector, industry, beta, revenueGrowth, epsGrowth, peRatio, pegRatio, analystRating, priceTarget, avgVolume, fiftyDayMA, twoHundredDayMA, maxDrawdown6M.

---

## Definition of Done

The app is complete when:
- [ ] User can set filters, adjust weights, and run a screen that returns scored results
- [ ] Results table is sortable by any column with visual score bars
- [ ] User can input their portfolio holdings
- [ ] Layer 3 portfolio-aware scoring visibly re-ranks results (proven by adding 5 tech stocks to portfolio and seeing non-tech candidates rise in rank)
- [ ] Stock detail card shows chart, fundamentals, and analyst data
- [ ] Compare view works with radar chart for up to 4 stocks
- [ ] Settings page accepts API key and manages cache
- [ ] App works in demo mode with sample data when no API key is set
- [ ] Dark mode looks professional and consistent
- [ ] All TypeScript — no `any` types except in API response parsing
