import { ChevronRight, ShieldCheck } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { OperationsState, UserRole } from '../../types/domain.ts';
import { LocationStockHealthChart } from '../charts/LocationStockHealthChart.tsx';
import { OrderFeasibilityChart } from '../charts/OrderFeasibilityChart.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { deriveOverviewMetrics } from './overview/deriveOverviewMetrics.ts';
import { KpiGrid } from './overview/KpiGrid.tsx';
import { RecentAuditFeedCard } from './overview/RecentAuditFeedCard.tsx';
import { TopShortedSkusCard } from './overview/TopShortedSkusCard.tsx';

export type NavTabId = 'overview' | 'orders' | 'inventory' | 'transfers' | 'approvals';

interface OverviewDashboardProps {
  state: OperationsState;
  selectedLocationId: number | null;
  activeRole: UserRole;
  onNavigate: (tab: NavTabId) => void;
  onOpenAssistant: () => void;
}

export const OverviewDashboard = memo(function OverviewDashboard({
  state,
  selectedLocationId,
  activeRole,
  onNavigate,
  onOpenAssistant,
}: OverviewDashboardProps) {
  const metrics = useMemo(
    () => deriveOverviewMetrics(state, selectedLocationId),
    [state, selectedLocationId],
  );

  const recentAuditLogs = useMemo(() => state.auditLogs.slice(0, 7), [state.auditLogs]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Operations Overview
          </h1>
          <p className="text-xs text-ink-muted">
            Deterministic stock feasibility, multi-location health, and Human-in-the-Loop
            approval telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge tone={activeRole === 'MANAGER' ? 'emerald' : 'amber'}>
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {activeRole === 'MANAGER'
                ? 'Commit Authority Active'
                : 'Read & Draft Only (Approval Gated)'}
            </span>
          </StatusBadge>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <span>Open Operations Assistant</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <KpiGrid metrics={metrics} onNavigate={onNavigate} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LocationStockHealthChart data={metrics.locationHealthData} />
        <OrderFeasibilityChart
          data={metrics.feasibilityBreakdownData}
          totalOrders={metrics.totalPendingOrders}
          feasibilityRatePct={metrics.feasibilityRatePct}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <TopShortedSkusCard skus={metrics.topShortedSkus} onNavigate={onNavigate} />
        <RecentAuditFeedCard
          logs={recentAuditLogs}
          users={state.users}
          onNavigate={onNavigate}
        />
      </div>
    </div>
  );
});
