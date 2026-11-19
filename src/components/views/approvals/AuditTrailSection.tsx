import { memo, useMemo, useState } from 'react';
import type { AgentRun, AgentStep, AuditLog, User } from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';

export type ActorSourceFilter = 'ALL' | 'AGENT' | 'USER';

interface AuditTrailSectionProps {
  auditLogs: AuditLog[];
  users: User[];
  agentRuns: AgentRun[];
  agentSteps: AgentStep[];
}

function categoryTone(category: AuditLog['action_category']): BadgeTone {
  switch (category) {
    case 'APPROVAL_COMMITTED':
      return 'emerald';
    case 'APPROVAL_REJECTED':
    case 'CONFLICT_BLOCKED':
      return 'rose';
    case 'DRAFT_CREATED':
      return 'blue';
    case 'DRAFT_EDITED':
      return 'amber';
    case 'AGENT_TOOL_CALL':
    case 'STOCK_TRANSFER':
      return 'slate';
  }
}

export const AuditTrailSection = memo(function AuditTrailSection({
  auditLogs,
  users,
  agentRuns,
  agentSteps,
}: AuditTrailSectionProps) {
  const [sourceFilter, setSourceFilter] = useState<ActorSourceFilter>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [selectedRunId, setSelectedRunId] = useState<number>(agentRuns[0]?.id ?? 1);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const log of auditLogs) set.add(log.entity_type);
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(
    () =>
      auditLogs.filter((log) => {
        const isAgentEvent =
          log.action_category === 'AGENT_TOOL_CALL' ||
          log.action_name === 'prepare_reorder_draft';
        if (sourceFilter === 'AGENT' && !isAgentEvent) return false;
        if (sourceFilter === 'USER' && isAgentEvent) return false;
        if (entityFilter !== 'ALL' && log.entity_type !== entityFilter) return false;
        return true;
      }),
    [auditLogs, sourceFilter, entityFilter],
  );

  const inspectedRun = useMemo(
    () => agentRuns.find((r) => r.id === selectedRunId) ?? agentRuns[0],
    [agentRuns, selectedRunId],
  );

  const inspectedSteps = useMemo(
    () =>
      inspectedRun
        ? agentSteps
            .filter((s) => s.run_id === inspectedRun.id)
            .toSorted((a, b) => a.step_number - b.step_number)
        : [],
    [agentSteps, inspectedRun],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <section
        aria-label="Immutable audit trail"
        className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-xs xl:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Immutable Audit Log (`audit_logs`)
            </h2>
            <p className="text-xs text-ink-muted">
              Filterable by Agent tool calls vs. Human actions and target entity
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="audit-source-filter" className="sr-only">
              Filter by actor source
            </label>
            <select
              id="audit-source-filter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as ActorSourceFilter)}
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Actors (Agent + User)</option>
              <option value="AGENT">AGENT Tool Calls &amp; Drafts</option>
              <option value="USER">USER Reviews, Commits &amp; Edits</option>
            </select>

            <label htmlFor="audit-entity-filter" className="sr-only">
              Filter by entity type
            </label>
            <select
              id="audit-entity-filter"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              {entityTypes.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-[460px] overflow-auto">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-subtle">
              <tr className="border-b border-hairline text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <th className="px-3.5 py-2">Category</th>
                <th className="px-3 py-2">Action &amp; Details</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3.5 py-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {filteredLogs.map((log) => {
                const actor = userMap.get(log.actor_user_id);
                return (
                  <tr key={log.id} className="hover:bg-subtle/60">
                    <td className="px-3.5 py-2.5 align-top">
                      <StatusBadge tone={categoryTone(log.action_category)}>
                        {log.action_category}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                        <span className="font-semibold text-ink">
                          {log.action_name}
                        </span>
                        <span className="text-ink-muted">·</span>
                        <span className="text-ink-secondary">
                          {log.entity_type}:{log.entity_id}
                        </span>
                      </div>
                      <p className="mt-1 text-ink-secondary">{log.details}</p>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-medium text-ink">
                        {actor?.full_name ?? `User #${log.actor_user_id}`}
                      </div>
                      <div className="font-mono text-[10px] text-ink-muted">
                        {log.actor_role}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right align-top font-mono text-[11px] text-ink-muted tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-label="Agent run trace viewer"
        className="rounded-lg border border-hairline bg-surface p-4 shadow-xs xl:col-span-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Agent Run Trace Viewer (`agent_runs`)
            </h2>
            <p className="text-xs text-ink-muted">
              Step-by-step deterministic tool payloads &amp; latencies
            </p>
          </div>

          <label htmlFor="audit-run-select" className="sr-only">
            Select agent run to inspect
          </label>
          <select
            id="audit-run-select"
            value={String(inspectedRun?.id ?? '')}
            onChange={(e) => setSelectedRunId(Number(e.target.value))}
            className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 font-mono text-[11px] text-ink focus:border-accent focus:outline-none"
          >
            {agentRuns.map((run) => (
              <option key={run.id} value={String(run.id)}>
                {run.run_code} · {run.status}
              </option>
            ))}
          </select>
        </div>

        {inspectedRun ? (
          <div className="space-y-3">
            <div className="rounded-md border border-hairline bg-subtle p-3 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] text-ink-secondary tabular-nums">
                <span>
                  {inspectedRun.run_code} · {inspectedRun.step_count}/
                  {inspectedRun.max_steps} steps
                </span>
                <span>{inspectedRun.total_latency_ms}ms</span>
              </div>
              <p className="mt-1.5 font-medium text-ink">
                {inspectedRun.user_prompt}
              </p>
              <p className="mt-1 text-ink-secondary">{inspectedRun.final_summary}</p>
            </div>

            <ol className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {inspectedSteps.map((step) => (
                <li
                  key={step.id}
                  className="rounded-md border border-hairline bg-surface p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-ink tabular-nums">
                        Step {step.step_number}
                      </span>
                      <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                        {step.tool_name ?? step.stage_label}
                      </code>
                    </div>
                    <span className="font-mono text-[10px] text-ink-muted tabular-nums">
                      {step.latency_ms}ms
                    </span>
                  </div>
                  <p className="mt-1 text-ink-secondary">{step.tool_output_summary}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>
    </div>
  );
});
