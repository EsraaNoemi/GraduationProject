import { AlertTriangle, ClipboardCheck, Lock, ShieldCheck, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import type { ApprovalFeedbackNotice } from '../../hooks/useOperationsStore.ts';
import { cn } from '../../lib/cn.ts';
import type {
  DraftStatus,
  OperationsState,
  ReorderDraftItem,
  UserRole,
} from '../../types/domain.ts';
import { DraftApprovalCard } from '../common/DraftApprovalCard.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { AuditTrailSection } from './approvals/AuditTrailSection.tsx';
import { EvaluationMetricsPanel } from './approvals/EvaluationMetricsPanel.tsx';

interface ApprovalsAuditViewProps {
  state: OperationsState;
  selectedLocationId: number | null;
  activeRole: UserRole;
  feedback: ApprovalFeedbackNotice | null;
  onDismissFeedback: () => void;
  onSimulateStockDrift: () => void;
  onUpdateDraftQty: (draftId: number, draftItemId: number, newQty: number) => void;
  onVerifyDraft: (draftId: number) => void;
  onRefreshSnapshot: (draftId: number) => void;
  onSubmitDecision: (draftId: number, decision: 'APPROVE' | 'REJECT') => void;
}

const DRAFT_STATUS_FILTERS: Array<DraftStatus | 'ALL'> = [
  'ALL',
  'VERIFIED_PENDING_APPROVAL',
  'STALE_CONFLICT',
  'APPROVED_COMMITTED',
  'REJECTED',
];

export const ApprovalsAuditView = memo(function ApprovalsAuditView({
  state,
  selectedLocationId,
  activeRole,
  feedback,
  onDismissFeedback,
  onSimulateStockDrift,
  onUpdateDraftQty,
  onVerifyDraft,
  onRefreshSnapshot,
  onSubmitDecision,
}: ApprovalsAuditViewProps) {
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'ALL'>('ALL');

  const itemsByDraftId = useMemo(() => {
    const map = new Map<number, ReorderDraftItem[]>();
    for (const item of state.reorderDraftItems) {
      const list = map.get(item.draft_id) ?? [];
      list.push(item);
      map.set(item.draft_id, list);
    }
    return map;
  }, [state.reorderDraftItems]);

  const locationFilteredDrafts = useMemo(
    () =>
      state.reorderDrafts.filter(
        (d) => selectedLocationId == null || d.target_location_id === selectedLocationId,
      ),
    [state.reorderDrafts, selectedLocationId],
  );

  const visibleDrafts = useMemo(
    () =>
      locationFilteredDrafts.filter(
        (d) => statusFilter === 'ALL' || d.status === statusFilter,
      ),
    [locationFilteredDrafts, statusFilter],
  );

  const isManager = activeRole === 'MANAGER';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Human-in-the-Loop Approvals &amp; Audit Trail
          </h1>
          <p className="text-xs text-ink-muted">
            Review verified staging drafts, edit quantities, enforce `MANAGER` commit RBAC,
            and inspect `409 STALE_CONFLICT` locks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={isManager ? 'emerald' : 'amber'}>
            {isManager ? (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {isManager
                ? 'MANAGER: Commit Unlocked'
                : 'EMPLOYEE: Commit Locked (403 Gate)'}
            </span>
          </StatusBadge>
          <button
            type="button"
            onClick={onSimulateStockDrift}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            <AlertTriangle
              className="h-3.5 w-3.5 text-status-amber-text"
              aria-hidden="true"
            />
            <span>Trigger Concurrent Drift</span>
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className={cn(
            'flex items-center justify-between gap-2 rounded-md border px-4 py-2.5 text-xs',
            feedback.tone === 'emerald'
              ? 'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text'
              : feedback.tone === 'rose'
                ? 'border-status-rose-border bg-status-rose-bg text-status-rose-text'
                : feedback.tone === 'amber'
                  ? 'border-status-amber-border bg-status-amber-bg text-status-amber-text'
                  : 'border-status-info-border bg-status-info-bg text-status-info-text',
          )}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={onDismissFeedback}
            aria-label="Dismiss approval feedback"
            className="rounded p-0.5 hover:bg-subtle"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <EvaluationMetricsPanel
        agentRuns={state.agentRuns}
        drafts={state.reorderDrafts}
        auditLogs={state.auditLogs}
      />

      <section aria-label="Staged drafts queue" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hairline bg-surface px-4 py-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-accent-ink" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">
              Staged Reorder &amp; Transfer Drafts
            </h2>
          </div>

          <div role="group" aria-label="Filter drafts by status" className="flex flex-wrap gap-1.5">
            {DRAFT_STATUS_FILTERS.map((status) => {
              const isActive = statusFilter === status;
              const count =
                status === 'ALL'
                  ? locationFilteredDrafts.length
                  : locationFilteredDrafts.filter((d) => d.status === status).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'border-accent-border bg-accent-subtle text-accent-ink'
                      : 'border-transparent text-ink-secondary hover:bg-subtle hover:text-ink',
                  )}
                >
                  <span>{status}</span>
                  <span className="font-mono tabular-nums text-ink-muted">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleDrafts.length === 0 ? (
          <div className="rounded-lg border border-hairline bg-surface p-8 text-center text-xs text-ink-muted shadow-xs">
            No drafts match the active status and location filters. Run a scenario in the
            Operations Assistant to stage a new verified draft.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleDrafts.map((draft) => (
              <DraftApprovalCard
                key={draft.id}
                draft={draft}
                items={itemsByDraftId.get(draft.id) ?? []}
                locations={state.locations}
                products={state.products}
                balances={state.inventoryBalances}
                activeRole={activeRole}
                onUpdateItemQty={onUpdateDraftQty}
                onVerifyDraft={onVerifyDraft}
                onRefreshSnapshot={onRefreshSnapshot}
                onSubmitDecision={onSubmitDecision}
              />
            ))}
          </div>
        )}
      </section>

      <AuditTrailSection
        auditLogs={state.auditLogs}
        users={state.users}
        agentRuns={state.agentRuns}
        agentSteps={state.agentSteps}
      />
    </div>
  );
});
