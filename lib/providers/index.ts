import { DataProvider } from '@/types';
import { FMPProvider } from './fmp';
import { SampleDataProvider } from './sample-data';

export function getDataProvider(apiKey?: string): DataProvider {
  const key = apiKey || process.env.FMP_API_KEY;
  if (key && key.length > 0 && key !== 'your_api_key_here') {
    return new FMPProvider(key);
  }
  return new SampleDataProvider();
}

export { FMPProvider, SampleDataProvider };
