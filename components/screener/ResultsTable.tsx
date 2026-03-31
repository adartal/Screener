"use client"

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { ScreenerResult } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "./ScoreBar";
import { StockDetailCard } from "./StockDetailCard";
import { ArrowUpDown, ChevronDown, ChevronRight, Plus, Download } from "lucide-react";

interface ResultsTableProps {
  results: ScreenerResult[];
  hasPortfolio: boolean;
  onAddToPortfolio?: (symbol: string) => void;
  apiKey?: string;
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(0)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${mc.toFixed(0)}`;
}

export function ResultsTable({ results, hasPortfolio, onAddToPortfolio, apiKey }: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'compositeScore', desc: true }]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo((): ColumnDef<ScreenerResult, any>[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<ScreenerResult, any>[] = [
      {
        id: 'rank',
        header: '#',
        cell: info => <span className="text-xs text-muted-foreground font-mono">{info.row.index + 1}</span>,
        size: 40,
      },
      {
        id: 'expand',
        header: '',
        cell: info => (
          <button
            onClick={(e) => { e.stopPropagation(); setExpandedRow(expandedRow === info.row.original.symbol ? null : info.row.original.symbol); }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {expandedRow === info.row.original.symbol ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ),
        size: 30,
      },
      {
        accessorKey: 'symbol',
        header: 'Ticker',
        cell: info => <span className="font-mono font-bold text-sm">{info.getValue() as string}</span>,
        size: 70,
      },
      {
        accessorKey: 'name',
        header: 'Company',
        cell: info => <span className="text-xs truncate max-w-[150px] block">{info.getValue() as string}</span>,
        size: 150,
      },
      {
        accessorKey: 'sector',
        header: 'Sector',
        cell: info => <Badge variant="outline" className="text-[10px] whitespace-nowrap">{info.getValue() as string}</Badge>,
        size: 130,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: info => <span className="font-mono text-xs">${(info.getValue() as number).toFixed(2)}</span>,
        size: 80,
      },
      {
        accessorKey: 'marketCap',
        header: 'Mkt Cap',
        cell: info => <span className="font-mono text-xs">{formatMarketCap(info.getValue() as number)}</span>,
        size: 80,
      },
      {
        id: 'compositeScore',
        accessorFn: row => row.scores.compositeScore,
        header: 'Score',
        cell: info => <ScoreBar score={info.getValue() as number} />,
        size: 120,
      },
      {
        id: 'growthScore',
        accessorFn: row => row.scores.growthScore,
        header: 'Growth',
        cell: info => <ScoreBar score={info.getValue() as number} size="sm" />,
        size: 80,
      },
      {
        id: 'momentumScore',
        accessorFn: row => row.scores.momentumScore,
        header: 'Mom',
        cell: info => <ScoreBar score={info.getValue() as number} size="sm" />,
        size: 80,
      },
      {
        id: 'valuationScore',
        accessorFn: row => row.scores.valuationScore,
        header: 'Value',
        cell: info => <ScoreBar score={info.getValue() as number} size="sm" />,
        size: 80,
      },
      {
        id: 'analystScore',
        accessorFn: row => row.scores.analystScore,
        header: 'Analyst',
        cell: info => <ScoreBar score={info.getValue() as number} size="sm" />,
        size: 80,
      },
      {
        id: 'riskScore',
        accessorFn: row => row.scores.riskScore,
        header: 'Risk',
        cell: info => <ScoreBar score={info.getValue() as number} size="sm" />,
        size: 80,
      },
    ];

    if (hasPortfolio) {
      cols.push({
        id: 'portfolioFit',
        accessorFn: row => row.scores.portfolioFitScore ?? 0,
        header: 'Fit',
        cell: info => {
          const score = info.row.original.scores;
          return (
            <div className="flex items-center gap-1">
              <ScoreBar score={info.getValue() as number} size="sm" />
              {score.sharpeContribution !== undefined && (
                <span className={`text-[10px] font-mono ${score.sharpeContribution > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {score.sharpeContribution > 0 ? '+' : ''}{score.sharpeContribution.toFixed(3)}
                </span>
              )}
            </div>
          );
        },
        size: 130,
      });
    }

    cols.push(
      {
        id: 'ptUpside',
        accessorFn: row => row.analystData.priceTargetUpside,
        header: 'PT %',
        cell: info => {
          const v = info.getValue() as number;
          return (
            <span className={`font-mono text-xs ${v > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {v > 0 ? '+' : ''}{v.toFixed(1)}%
            </span>
          );
        },
        size: 70,
      },
      {
        id: 'action',
        header: '',
        cell: info => onAddToPortfolio ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onAddToPortfolio(info.row.original.symbol); }}
            title="Add to portfolio"
          >
            <Plus className="h-3 w-3" />
          </Button>
        ) : null,
        size: 40,
      }
    );

    return cols;
  }, [hasPortfolio, expandedRow, onAddToPortfolio]);

  const table = useReactTable({
    data: results,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const exportCSV = () => {
    const headers = ['Rank', 'Ticker', 'Company', 'Sector', 'Price', 'Market Cap', 'Score', 'Growth', 'Momentum', 'Valuation', 'Analyst', 'Risk', 'PT Upside'];
    if (hasPortfolio) headers.push('Portfolio Fit', 'Sharpe Delta');

    const rows = results.map((r, i) => {
      const row = [i + 1, r.symbol, r.name, r.sector, r.price, r.marketCap,
        r.scores.compositeScore, r.scores.growthScore, r.scores.momentumScore,
        r.scores.valuationScore, r.scores.analystScore, r.scores.riskScore,
        r.analystData.priceTargetUpside];
      if (hasPortfolio) row.push(r.scores.portfolioFitScore ?? 0, r.scores.sharpeContribution ?? 0);
      return row;
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screener-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-muted-foreground">{results.length} results</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportCSV}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="px-2 py-2 text-xs whitespace-nowrap">
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && <ArrowUpDown className="h-3 w-3 opacity-50" />}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No results. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedRow(expandedRow === row.original.symbol ? null : row.original.symbol)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className="px-2 py-1.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRow === row.original.symbol && (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell colSpan={columns.length} className="p-0">
                        <StockDetailCard stock={row.original} apiKey={apiKey} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Prev
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
