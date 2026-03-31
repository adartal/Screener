import fs from 'fs';
import path from 'path';
import { CacheEntry } from '@/types';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function getCacheKey(endpoint: string, params: Record<string, string | number | boolean> = {}): string {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return `${endpoint}:${sortedParams}`;
}

export async function getCached<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${hashKey(key)}.json`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);

    if (Date.now() - entry.timestamp > entry.ttl) {
      return null;
    }

    return { data: entry.data, timestamp: entry.timestamp };
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    ensureCacheDir();
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: ttlMs };
    const filePath = path.join(CACHE_DIR, `${hashKey(key)}.json`);
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(entry));
    fs.renameSync(tmpPath, filePath);
  } catch {
    // Silently fail cache writes
  }
}

export async function clearCache(): Promise<void> {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    }
  } catch {
    // Silently fail
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    if (!fs.existsSync(CACHE_DIR)) return 0;
    const files = fs.readdirSync(CACHE_DIR);
    let totalSize = 0;
    for (const file of files) {
      const stats = fs.statSync(path.join(CACHE_DIR, file));
      totalSize += stats.size;
    }
    return totalSize;
  } catch {
    return 0;
  }
}

// Request counter for FMP API rate limiting
const COUNTER_KEY = '_request_count';

export async function getRequestCount(): Promise<{ date: string; count: number }> {
  try {
    const filePath = path.join(CACHE_DIR, `${COUNTER_KEY}.json`);
    if (!fs.existsSync(filePath)) return { date: new Date().toISOString().split('T')[0], count: 0 };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch {
    return { date: new Date().toISOString().split('T')[0], count: 0 };
  }
}

export async function incrementRequestCount(): Promise<number> {
  ensureCacheDir();
  const counter = await getRequestCount();
  const today = new Date().toISOString().split('T')[0];
  const newCount = counter.date === today ? counter.count + 1 : 1;
  const filePath = path.join(CACHE_DIR, `${COUNTER_KEY}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ date: today, count: newCount }));
  return newCount;
}
