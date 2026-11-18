import { Search, SlidersHorizontal, Terminal } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../../lib/cn.ts';
import type { FeasibilityStatus, OrderPriority } from '../../../types/domain.ts';

export type FeasibilityMode = 'CUMULATIVE' | 'ISOLATED';

interface OrdersFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  priorityFilter: OrderPriority | 'ALL';
  onPriorityChange: (priority: OrderPriority | 'ALL') => void;
  feasibilityFilter: FeasibilityStatus | 'ALL';
  onFeasibilityChange: (status: FeasibilityStatus | 'ALL') => void;
  mode: FeasibilityMode;
  onModeChange: (mode: FeasibilityMode) => void;
  totalFilteredCount: number;
  downgradedByContentionCount: number;
  onAnalyzeBatch: () => void;
}

export const OrdersFilterBar = memo(function OrdersFilterBar({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  feasibilityFilter,
  onFeasibilityChange,
  mode,
  onModeChange,
  totalFilteredCount,
  downgradedByContentionCount,
  onAnalyzeBatch,
}: OrdersFilterBarProps) {
  return (
    <section
      aria-label="Orders feasibility controls"
      className="rounded-lg border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <label htmlFor="orders-search-input" className="sr-only">
              Search orders by number, customer, or SKU
            </label>
            <input
              id="orders-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search order #, customer, or SKU..."
              className="w-60 rounded-md border border-hairline-strong bg-surface py-1.5 pr-3 pl-8 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="orders-priority-filter" className="text-xs text-ink-muted">
              Priority
            </label>
            <select
              id="orders-priority-filter"
              value={priorityFilter}
              onChange={(e) => onPriorityChange(e.target.value as OrderPriority | 'ALL')}
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="orders-feasibility-filter" className="text-xs text-ink-muted">
              Feasibility
            </label>
            <select
              id="orders-feasibility-filter"
              value={feasibilityFilter}
              onChange={(e) =>
                onFeasibilityChange(e.target.value as FeasibilityStatus | 'ALL')
              }
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="FULL">FULL</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="UNAVAILABLE">UNAVAILABLE</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            <div
              role="group"
              aria-label="Feasibility Evaluation Mode"
              className="inline-flex rounded-md border border-hairline bg-subtle p-0.5"
            >
              <button
                type="button"
                onClick={() => onModeChange('CUMULATIVE')}
                aria-pressed={mode === 'CUMULATIVE'}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  mode === 'CUMULATIVE'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink',
                )}
              >
                Cumulative FIFO
              </button>
              <button
                type="button"
                onClick={() => onModeChange('ISOLATED')}
                aria-pressed={mode === 'ISOLATED'}
                className={cn(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  mode === 'ISOLATED'
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink-secondary hover:text-ink',
                )}
              >
                Isolated Check
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onAnalyzeBatch}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Analyze Batch with Assistant</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5 text-xs text-ink-secondary">
        <p>
          {mode === 'CUMULATIVE'
            ? 'Sequential allocation by Priority (HIGH → NORMAL → LOW) and FIFO timestamp; shared SKU pools decrement across orders.'
            : 'Single-order check against starting available stock without reserving for earlier orders in the queue.'}
        </p>
        <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
          <span>Showing {totalFilteredCount} orders</span>
          {downgradedByContentionCount > 0 ? (
            <span className="rounded border border-status-amber-border bg-status-amber-bg px-2 py-0.5 font-medium text-status-amber-text">
              {downgradedByContentionCount}{' '}
              {downgradedByContentionCount === 1 ? 'order' : 'orders'} downgraded by FIFO
              contention
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
});
