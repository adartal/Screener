import { DataProvider } from '@/types';
import { FMPProvider } from './fmp';
import { YahooFinanceProvider } from './yahoo';
import { SampleDataProvider } from './sample-data';

export function getDataProvider(apiKey?: string): DataProvider {
  const fmpKey = apiKey || process.env.FMP_API_KEY;

  // If FMP key is provided and valid, use FMP
  if (fmpKey && fmpKey.length > 0 && fmpKey !== 'your_api_key_here') {
    return new FMPProvider(fmpKey);
  }

  // Default: use Yahoo Finance (no API key needed)
  return new YahooFinanceProvider();
}

export function getSampleProvider(): DataProvider {
  return new SampleDataProvider();
}

export { FMPProvider, YahooFinanceProvider, SampleDataProvider };
