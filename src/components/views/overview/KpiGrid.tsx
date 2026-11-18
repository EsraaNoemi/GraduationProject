import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  PackageCheck,
} from 'lucide-react';
import { memo } from 'react';
import { StatusBadge } from '../../common/StatusBadge.tsx';
import type { NavTabId } from '../OverviewDashboard.tsx';
import type { OverviewMetrics } from './deriveOverviewMetrics.ts';

interface KpiGridProps {
  metrics: OverviewMetrics;
  onNavigate: (tab: NavTabId) => void;
}

export const KpiGrid = memo(function KpiGrid({ metrics, onNavigate }: KpiGridProps) {
  const orderTone =
    metrics.unavailableOrdersCount > 0
      ? 'rose'
      : metrics.partialOrdersCount > 0
        ? 'amber'
        : 'emerald';

  return (
    <section
      aria-label="Key operational indicators"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <div className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Pending Orders &amp; Feasibility
          </span>
          <PackageCheck className="h-4 w-4 text-accent-ink" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {metrics.totalPendingOrders}{' '}
            <span className="text-sm font-medium text-ink-muted">
              / {metrics.feasibilityRatePct}% Full
            </span>
          </p>
          <StatusBadge tone={orderTone}>{metrics.shortedSkuCount} SKUs short</StatusBadge>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-secondary tabular-nums">
          <span>
            {metrics.fullOrdersCount} Full · {metrics.partialOrdersCount} Partial ·{' '}
            {metrics.unavailableOrdersCount} Blocked
          </span>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="font-medium text-accent-ink hover:underline"
          >
            Queue →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            SKUs Below Threshold
          </span>
          <AlertTriangle
            className="h-4 w-4 text-status-amber-text"
            aria-hidden="true"
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {metrics.lowOrOutCount}{' '}
            <span className="text-sm font-medium text-ink-muted">
              / {metrics.totalInventoryRows} rows
            </span>
          </p>
          <StatusBadge tone={metrics.lowOrOutCount > 0 ? 'amber' : 'emerald'}>
            {metrics.zeroStockCount} zero stock
          </StatusBadge>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-secondary tabular-nums">
          <span>Threshold safety monitor</span>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="font-medium text-accent-ink hover:underline"
          >
            Matrix →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Pending Human Approvals
          </span>
          <ClipboardCheck className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {metrics.pendingApprovalsCount}
          </p>
          {metrics.staleConflictCount > 0 ? (
            <StatusBadge tone="rose">{metrics.staleConflictCount} stale conflict</StatusBadge>
          ) : (
            <StatusBadge tone={metrics.pendingApprovalsCount > 0 ? 'amber' : 'emerald'}>
              {metrics.pendingApprovalsCount > 0 ? 'Awaiting Manager' : 'Queue Clear'}
            </StatusBadge>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-secondary">
          <span>HITL gate (submit_approved_change)</span>
          <button
            type="button"
            onClick={() => onNavigate('approvals')}
            className="font-medium text-accent-ink hover:underline"
          >
            Review →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Active Stock Transfers
          </span>
          <ArrowRightLeft className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {metrics.activeTransfersCount}
          </p>
          <StatusBadge tone="slate">{metrics.inTransitTransfersCount} in transit</StatusBadge>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-secondary tabular-nums">
          <span>{metrics.totalMovementsCount} ledger movements</span>
          <button
            type="button"
            onClick={() => onNavigate('transfers')}
            className="font-medium text-accent-ink hover:underline"
          >
            Transfers →
          </button>
        </div>
      </div>
    </section>
  );
});
