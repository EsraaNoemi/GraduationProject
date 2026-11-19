import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { UserRole } from '../../types/domain.ts';

interface DraftConflictBannerProps {
  onRefreshSnapshot: () => void;
}

export function DraftConflictBanner({ onRefreshSnapshot }: DraftConflictBannerProps) {
  return (
    <div
      role="alert"
      className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-status-rose-border bg-status-rose-bg px-3 py-2 text-xs text-status-rose-text"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>409 STALE_CONFLICT Risk:</strong> Live inventory version drifted since
          snapshot creation.
        </span>
      </div>
      <button
        type="button"
        onClick={onRefreshSnapshot}
        className="inline-flex items-center gap-1 rounded border border-status-rose-border bg-surface px-2.5 py-1 text-[11px] font-medium text-status-rose-text hover:bg-subtle"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        <span>Refresh Snapshot &amp; Re-Verify</span>
      </button>
    </div>
  );
}

interface DraftActionFooterProps {
  activeRole: UserRole;
  onVerifyDraft: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export function DraftActionFooter({
  activeRole,
  onVerifyDraft,
  onApprove,
  onReject,
}: DraftActionFooterProps) {
  const isManager = activeRole === 'MANAGER';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
      <button
        type="button"
        onClick={onVerifyDraft}
        className="inline-flex items-center gap-1 rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
        <span>Re-Verify (verify_draft)</span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReject}
          className="inline-flex items-center gap-1 rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          <XCircle
            className="h-3.5 w-3.5 text-status-rose-text"
            aria-hidden="true"
          />
          <span>Reject</span>
        </button>

        <button
          type="button"
          onClick={onApprove}
          title={
            isManager
              ? 'Execute human-gated submit_approved_change'
              : 'Manager role required — click to inspect deterministic 403 RBAC enforcement'
          }
          className={
            isManager
              ? 'inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover'
              : 'inline-flex items-center gap-1.5 rounded-md border border-status-amber-border bg-status-amber-bg px-3 py-1.5 text-xs font-medium text-status-amber-text hover:opacity-90'
          }
        >
          {isManager ? (
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>Approve &amp; Commit</span>
        </button>
      </div>
    </div>
  );
}
