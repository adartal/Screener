"use client"

import { ScoringWeights } from "@/types";
import { WEIGHT_PRESETS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal } from "lucide-react";

interface WeightSlidersProps {
  weights: ScoringWeights;
  onWeightsChange: (weights: ScoringWeights) => void;
}

const DIMENSIONS: Array<{ key: keyof ScoringWeights; label: string; color: string }> = [
  { key: 'growth', label: 'Growth', color: 'text-green-400' },
  { key: 'momentum', label: 'Momentum', color: 'text-blue-400' },
  { key: 'valuation', label: 'Valuation', color: 'text-purple-400' },
  { key: 'analyst', label: 'Analyst Edge', color: 'text-amber-400' },
  { key: 'risk', label: 'Risk (inv.)', color: 'text-red-400' },
];

export function WeightSliders({ weights, onWeightsChange }: WeightSlidersProps) {
  const handleSliderChange = (key: keyof ScoringWeights, newValue: number) => {
    const oldValue = weights[key];
    const delta = newValue - oldValue;

    const otherKeys = DIMENSIONS.filter(d => d.key !== key).map(d => d.key);
    const otherSum = otherKeys.reduce((s, k) => s + weights[k], 0);

    const newWeights = { ...weights, [key]: newValue };

    if (otherSum > 0) {
      for (const k of otherKeys) {
        newWeights[k] = Math.max(0, weights[k] - (weights[k] / otherSum) * delta);
      }
    } else {
      const share = delta / otherKeys.length;
      for (const k of otherKeys) {
        newWeights[k] = Math.max(0, -share);
      }
    }

    // Normalize to exactly 1.0
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const k of Object.keys(newWeights) as Array<keyof ScoringWeights>) {
        newWeights[k] = Math.round((newWeights[k] / total) * 1000) / 1000;
      }
    }

    onWeightsChange(newWeights);
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <SlidersHorizontal className="h-4 w-4" />
        Scoring Weights
      </div>

      <Select
        onValueChange={preset => {
          const w = WEIGHT_PRESETS[preset];
          if (w) onWeightsChange({ ...w });
        }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Load preset..." />
        </SelectTrigger>
        <SelectContent>
          {Object.keys(WEIGHT_PRESETS).map(name => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator />

      <div className="space-y-3">
        {DIMENSIONS.map(dim => (
          <div key={dim.key} className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className={`text-xs ${dim.color}`}>{dim.label}</Label>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">
                {Math.round(weights[dim.key] * 100)}%
              </span>
            </div>
            <Slider
              value={[weights[dim.key]]}
              onValueChange={([v]) => handleSliderChange(dim.key, v)}
              min={0}
              max={1}
              step={0.05}
              className="py-0.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
