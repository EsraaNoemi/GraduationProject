import { Activity } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { AuditLog, User } from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';
import type { NavTabId } from '../OverviewDashboard.tsx';

interface RecentAuditFeedCardProps {
  logs: AuditLog[];
  users: User[];
  onNavigate: (tab: NavTabId) => void;
}

function formatAuditTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function auditCategoryBadge(category: AuditLog['action_category']): {
  label: string;
  tone: BadgeTone;
} {
  switch (category) {
    case 'APPROVAL_COMMITTED':
      return { label: 'COMMITTED', tone: 'emerald' };
    case 'APPROVAL_REJECTED':
      return { label: 'REJECTED', tone: 'rose' };
    case 'CONFLICT_BLOCKED':
      return { label: 'BLOCKED', tone: 'rose' };
    case 'DRAFT_CREATED':
      return { label: 'DRAFTED', tone: 'blue' };
    case 'DRAFT_EDITED':
      return { label: 'EDITED', tone: 'amber' };
    case 'STOCK_TRANSFER':
      return { label: 'TRANSFER', tone: 'slate' };
    case 'AGENT_TOOL_CALL':
      return { label: 'TOOL CALL', tone: 'slate' };
  }
}

export const RecentAuditFeedCard = memo(function RecentAuditFeedCard({
  logs,
  users,
  onNavigate,
}: RecentAuditFeedCardProps) {
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  return (
    <section
      aria-label="Recent deterministic activity and audit trail"
      className="rounded-lg border border-hairline bg-surface shadow-xs xl:col-span-5"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Recent Activity &amp; Audit Feed
            </h2>
            <p className="text-xs text-ink-muted">
              Immutable tool calls, draft checks &amp; RBAC guard events
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('approvals')}
          className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          Full Audit
        </button>
      </div>

      <ul className="divide-y divide-hairline">
        {logs.map((entry) => {
          const actor = userMap.get(entry.actor_user_id);
          const badge = auditCategoryBadge(entry.action_category);
          return (
            <li key={entry.id} className="px-5 py-3 hover:bg-subtle/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="font-mono text-[11px] font-medium text-ink">
                    {entry.action_name}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                  {formatAuditTime(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                {entry.details}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
                <span>{actor?.full_name ?? `User #${entry.actor_user_id}`}</span>
                <span>·</span>
                <span className="font-mono">{entry.actor_role}</span>
                <span>·</span>
                <span className="font-mono text-ink-secondary">{entry.entity_id}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
