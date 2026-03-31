import { NextResponse } from 'next/server';
import { getCacheSize, getRequestCount } from '@/lib/cache';

export async function GET() {
  try {
    const [size, requestCount] = await Promise.all([
      getCacheSize(),
      getRequestCount(),
    ]);
    return NextResponse.json({ size, requestCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
