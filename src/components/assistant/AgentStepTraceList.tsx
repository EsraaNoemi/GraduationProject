import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import type { AgentRun, AgentStep } from '../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../common/StatusBadge.tsx';

interface AgentStepTraceListProps {
  run: AgentRun;
  steps: AgentStep[];
  animateRunKey: number;
}

const STAGE_TITLES: Record<AgentStep['stage_label'], string> = {
  INTERPRET_REQUEST: '1. Interpret Request',
  RETRIEVE_DATA: '2. Retrieve Stock Data',
  ASSESS_FEASIBILITY: '3. Assess Cumulative Feasibility',
  PREPARE_DRAFT: '4. Prepare Staging Draft',
  VERIFY_AND_REPORT: '5. Verify & Report',
};

function stepTone(status: AgentStep['verification_status']): BadgeTone {
  switch (status) {
    case 'VERIFIED':
      return 'emerald';
    case 'WARNING':
      return 'amber';
    case 'ERROR':
      return 'rose';
  }
}

export const AgentStepTraceList = memo(function AgentStepTraceList({
  run,
  steps,
  animateRunKey,
}: AgentStepTraceListProps) {
  const [visibleCount, setVisibleCount] = useState(
    animateRunKey > 0 ? 1 : steps.length,
  );
  const [expandedStepIds, setExpandedStepIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (animateRunKey === 0 || visibleCount >= steps.length) {
      return;
    }
    const timer = setTimeout(() => {
      setVisibleCount((prev) => Math.min(steps.length, prev + 1));
    }, 110);
    return () => clearTimeout(timer);
  }, [animateRunKey, visibleCount, steps.length]);

  const togglePayload = (stepId: number) => {
    setExpandedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const renderedSteps = animateRunKey === 0 ? steps : steps.slice(0, visibleCount);

  return (
    <section
      aria-label="5-stage bounded execution trace"
      className="rounded-lg border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Bounded Execution Trace
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-ink-muted tabular-nums">
            {run.run_code} · Steps {run.step_count}/{run.max_steps} ·{' '}
            {run.total_latency_ms}ms
          </p>
        </div>
        <StatusBadge
          tone={
            run.status === 'AWAITING_CLARIFICATION'
              ? 'amber'
              : run.status === 'FAILED'
                ? 'rose'
                : run.status === 'COMPLETED'
                  ? 'emerald'
                  : 'blue'
          }
        >
          {run.status}
        </StatusBadge>
      </div>

      <p className="mb-3 rounded border border-hairline bg-subtle px-3 py-2 text-xs text-ink-secondary">
        {run.user_prompt}
      </p>

      <ol className="space-y-2">
        {renderedSteps.map((step) => {
          const isExpanded = expandedStepIds.has(step.id);
          return (
            <li
              key={step.id}
              className="rounded-md border border-hairline bg-surface p-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {step.verification_status === 'VERIFIED' ? (
                    <CheckCircle2
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-emerald-text"
                      aria-hidden="true"
                    />
                  ) : step.verification_status === 'WARNING' ? (
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-amber-text"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-rose-text"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-ink">
                        {STAGE_TITLES[step.stage_label]}
                      </span>
                      {step.tool_name ? (
                        <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                          {step.tool_name}
                        </code>
                      ) : null}
                    </div>
                    <p className="mt-1 text-ink-secondary">{step.tool_output_summary}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <StatusBadge tone={stepTone(step.verification_status)}>
                    {step.latency_ms}ms
                  </StatusBadge>
                  <button
                    type="button"
                    onClick={() => togglePayload(step.id)}
                    aria-expanded={isExpanded}
                    aria-label={`Toggle JSON payload for step ${step.step_number}`}
                    className="rounded border border-hairline p-1 text-ink-muted hover:bg-subtle hover:text-ink"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <pre className="mt-2 overflow-x-auto rounded border border-hairline bg-subtle p-2 font-mono text-[10px] text-ink">
                  {step.tool_input_json}
                </pre>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
});
