import { NextRequest, NextResponse } from 'next/server';
import { getDataProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const symbols = params.get('symbols');
    if (!symbols) {
      return NextResponse.json({ error: 'symbols parameter required' }, { status: 400 });
    }

    const apiKey = request.headers.get('x-fmp-api-key') || undefined;
    const provider = getDataProvider(apiKey);
    const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);
    const quotes = await provider.getQuote(symbolList);

    return NextResponse.json({ quotes, isLive: provider.isLive(), timestamp: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
