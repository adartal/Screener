import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
    }

    const apiKey = request.headers.get('x-fmp-api-key') || undefined;
    const provider = getDataProvider(apiKey);
    const fundamentals = await provider.getFundamentals(symbol);

    return NextResponse.json({ fundamentals, isLive: provider.isLive(), timestamp: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
