import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const symbol = params.get('symbol');
    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
    }

    const days = Number(params.get('days')) || 180;
    const apiKey = request.headers.get('x-fmp-api-key') || undefined;
    const provider = getDataProvider(apiKey);
    const prices = await provider.getHistoricalPrices(symbol, days);

    return NextResponse.json({ prices, isLive: provider.isLive(), timestamp: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
