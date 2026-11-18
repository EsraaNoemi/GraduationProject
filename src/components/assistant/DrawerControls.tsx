import { Lock, ShieldCheck, Terminal, X } from 'lucide-react';
import type { ApprovalFeedbackNotice } from '../../hooks/useOperationsStore.ts';
import { cn } from '../../lib/cn.ts';
import type { AgentRun, User } from '../../types/domain.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface DrawerHeaderProps {
  activeUser: User;
  onClose: () => void;
}

export function DrawerHeader({ activeUser, onClose }: DrawerHeaderProps) {
  const isManager = activeUser.role === 'MANAGER';
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-5">
      <div className="flex items-center gap-2">
        <Terminal className="h-4 w-4 text-accent-ink" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Operations Assistant Console
          </h2>
          <p className="font-mono text-[11px] text-ink-muted">
            Bounded Orchestrator (MAX_STEPS = 5) · Deterministic Verification
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusBadge tone={isManager ? 'emerald' : 'amber'}>
          {isManager ? (
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Lock className="h-3 w-3" aria-hidden="true" />
          )}
          <span>{activeUser.role}</span>
        </StatusBadge>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Operations Assistant drawer"
          className="rounded-md border border-hairline p-1.5 text-ink-muted hover:bg-subtle hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

interface DrawerFeedbackBannerProps {
  feedback: ApprovalFeedbackNotice;
  onDismiss: () => void;
}

const FEEDBACK_STYLES: Record<ApprovalFeedbackNotice['tone'], string> = {
  emerald:
    'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text',
  rose: 'border-status-rose-border bg-status-rose-bg text-status-rose-text',
  amber: 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
  blue: 'border-status-info-border bg-status-info-bg text-status-info-text',
};

export function DrawerFeedbackBanner({
  feedback,
  onDismiss,
}: DrawerFeedbackBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs',
        FEEDBACK_STYLES[feedback.tone],
      )}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss assistant notice"
        className="rounded p-0.5 hover:bg-subtle"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

interface DrawerRunSelectorProps {
  runs: AgentRun[];
  activeRunId: number | undefined;
  onSelectRunId: (runId: number) => void;
}

export function DrawerRunSelector({
  runs,
  activeRunId,
  onSelectRunId,
}: DrawerRunSelectorProps) {
  if (runs.length <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-hairline bg-subtle px-3 py-2">
      <label htmlFor="agent-run-select" className="text-[11px] font-medium text-ink-secondary">
        Active Execution Run
      </label>
      <select
        id="agent-run-select"
        value={String(activeRunId ?? '')}
        onChange={(e) => onSelectRunId(Number(e.target.value))}
        className="max-w-[280px] rounded border border-hairline-strong bg-surface px-2 py-1 font-mono text-[11px] text-ink focus:border-accent focus:outline-none"
      >
        {runs.map((run) => (
          <option key={run.id} value={String(run.id)}>
            {run.run_code} ({run.status} · {run.step_count}/{run.max_steps})
          </option>
        ))}
      </select>
    </div>
  );
}
