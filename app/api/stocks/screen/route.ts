import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/providers';
import { DEFAULT_FILTERS, GICS_SECTORS } from '@/lib/constants';
import { FilterConfig } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const apiKey = request.headers.get('x-fmp-api-key') || undefined;
    const provider = getDataProvider(apiKey);

    const filters: FilterConfig = {
      minMarketCap: Number(params.get('minMarketCap')) || DEFAULT_FILTERS.minMarketCap,
      minRevenueGrowth: Number(params.get('minRevenueGrowth')) ?? DEFAULT_FILTERS.minRevenueGrowth,
      minVolume: Number(params.get('minVolume')) || DEFAULT_FILTERS.minVolume,
      analystConsensus: (params.get('analystConsensus') as FilterConfig['analystConsensus']) || DEFAULT_FILTERS.analystConsensus,
      sectors: params.get('sectors') ? params.get('sectors')!.split(',') : [...GICS_SECTORS],
      includeInternational: params.get('includeInternational') === 'true',
      excludeTickers: params.get('excludeTickers') ? params.get('excludeTickers')!.split(',').map(t => t.trim()).filter(Boolean) : [],
    };

    const stocks = await provider.getScreenerResults(filters);
    return NextResponse.json({ stocks, isLive: provider.isLive(), timestamp: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
