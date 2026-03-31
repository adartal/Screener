"use client"

import { cn } from "@/lib/utils"

interface ScoreBarProps {
  score: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 50) return 'bg-emerald-500';
  if (score >= 30) return 'bg-amber-500';
  return 'bg-red-500';
}

export function ScoreBar({ score, size = 'md', showValue = true }: ScoreBarProps) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const width = size === 'sm' ? 'w-12' : 'w-20';

  return (
    <div className="flex items-center gap-2">
      <div className={cn("rounded-full bg-secondary overflow-hidden", height, width)}>
        <div
          className={cn("h-full rounded-full transition-all", getScoreColor(score))}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showValue && (
        <span className={cn("font-mono-num text-xs tabular-nums", size === 'sm' ? 'w-6' : 'w-8', {
          'text-green-500': score >= 70,
          'text-emerald-500': score >= 50 && score < 70,
          'text-amber-500': score >= 30 && score < 50,
          'text-red-500': score < 30,
        })}>
          {score.toFixed(0)}
        </span>
      )}
    </div>
  );
}
