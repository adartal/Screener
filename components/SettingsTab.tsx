"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Database, Trash2, Save, Globe } from "lucide-react";

export function SettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [requestCount, setRequestCount] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('fmp-api-key') || '';
    setApiKey(storedKey);
    fetchCacheStatus();
  }, []);

  const fetchCacheStatus = async () => {
    try {
      const res = await fetch('/api/cache/status');
      const data = await res.json();
      setCacheSize(data.size || 0);
      setRequestCount(data.requestCount?.count || 0);
    } catch {
      // Ignore
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('fmp-api-key', apiKey);
    toast({ title: 'API key saved', description: 'Your FMP API key has been saved. The app will use FMP instead of Yahoo Finance.' });
  };

  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('fmp-api-key');
    toast({ title: 'API key removed', description: 'Switched back to Yahoo Finance (no key required).' });
  };

  const handleClearCache = async () => {
    try {
      await fetch('/api/cache/clear', { method: 'POST' });
      setCacheSize(0);
      toast({ title: 'Cache cleared', description: 'All cached data has been removed.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to clear cache', variant: 'destructive' });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasFmpKey = apiKey.length > 0;

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Data Source */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Data Source
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium flex items-center gap-2">
                Yahoo Finance
                {!hasFmpKey && <Badge variant="default" className="text-[10px] px-1.5 py-0">Active</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No API key required. Unlimited requests. Quotes, fundamentals, historical prices, and analyst data.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium flex items-center gap-2">
                Financial Modeling Prep (optional)
                {hasFmpKey && <Badge variant="default" className="text-[10px] px-1.5 py-0">Active</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Alternative source. Requires API key (free tier: 250 req/day, some endpoints restricted).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FMP API Key (Optional) */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4" />
            FMP API Key (Optional)
          </CardTitle>
          <CardDescription className="text-xs">
            Only needed if you prefer FMP over Yahoo Finance. Get a key at financialmodelingprep.com.
            Stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs font-mono"
              type="password"
              placeholder="Enter your FMP API key..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            <Button size="sm" className="h-8 gap-1" onClick={saveApiKey}>
              <Save className="h-3 w-3" /> Save
            </Button>
          </div>
          {apiKey && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={clearApiKey}>
              Remove Key (switch to Yahoo Finance)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cache Size</span>
            <span className="font-mono">{formatBytes(cacheSize)}</span>
          </div>
          {hasFmpKey && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">FMP Requests Today</span>
              <span className={`font-mono ${requestCount > 200 ? 'text-amber-500' : ''}`}>
                {requestCount} / 250
              </span>
            </div>
          )}
          <Separator />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleClearCache}>
            <Trash2 className="h-3 w-3" /> Clear Cache
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            Portfolio-Aware Stock Screener v1.0. Data provided by Yahoo Finance (default) or Financial Modeling Prep.
            This app ranks stocks by how much they improve your existing portfolio using a 3-layer pipeline:
            Universe Filter, Multi-Factor Scoring, and Portfolio-Aware Optimization.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
