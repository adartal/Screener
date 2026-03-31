import { NextResponse } from 'next/server';
import { clearCache, getCacheSize } from '@/lib/cache';

export async function POST() {
  try {
    const sizeBefore = await getCacheSize();
    await clearCache();
    return NextResponse.json({ cleared: true, previousSize: sizeBefore });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
