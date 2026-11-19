import { memo, useMemo } from 'react';
import type { ApprovalFeedbackNotice } from '../../hooks/useOperationsStore.ts';
import { checkOrderFeasibility } from '../../services/operationsEngine.ts';
import type {
  AmbiguityCandidate,
  ExecuteBoundedAgentRunInput,
  OperationsState,
  User,
} from '../../types/domain.ts';
import { DraftApprovalCard } from '../common/DraftApprovalCard.tsx';
import { AgentStepTraceList } from './AgentStepTraceList.tsx';
import { AssistantFeasibilitySnapshot } from './AssistantFeasibilitySnapshot.tsx';
import { ClarificationPromptCard } from './ClarificationPromptCard.tsx';
import {
  DrawerFeedbackBanner,
  DrawerHeader,
  DrawerRunSelector,
} from './DrawerControls.tsx';
import { ScenarioPresetsBar } from './ScenarioPresetsBar.tsx';

interface OperationsAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  state: OperationsState;
  activeUser: User;
  selectedLocationId: number | null;
  activeRunId: number;
  onSelectRunId: (runId: number) => void;
  runSequenceNumber: number;
  ambiguityCandidates: AmbiguityCandidate[];
  missingQuantityProduct: AmbiguityCandidate | null;
  lastAgentPrompt: string;
  feedback: ApprovalFeedbackNotice | null;
  onDismissFeedback: () => void;
  onRunAgentCommand: (input: Omit<ExecuteBoundedAgentRunInput, 'actorUserId'>) => void;
  onRunStaleConflictTest: () => void;
  onUpdateDraftQty: (draftId: number, draftItemId: number, newQty: number) => void;
  onVerifyDraft: (draftId: number) => void;
  onRefreshSnapshot: (draftId: number) => void;
  onSubmitDecision: (draftId: number, decision: 'APPROVE' | 'REJECT') => void;
}

export const OperationsAssistantDrawer = memo(function OperationsAssistantDrawer({
  open,
  onClose,
  state,
  activeUser,
  selectedLocationId,
  activeRunId,
  onSelectRunId,
  runSequenceNumber,
  ambiguityCandidates,
  missingQuantityProduct,
  lastAgentPrompt,
  feedback,
  onDismissFeedback,
  onRunAgentCommand,
  onRunStaleConflictTest,
  onUpdateDraftQty,
  onVerifyDraft,
  onRefreshSnapshot,
  onSubmitDecision,
}: OperationsAssistantDrawerProps) {
  const activeRun = useMemo(
    () => state.agentRuns.find((r) => r.id === activeRunId) ?? state.agentRuns[0],
    [state.agentRuns, activeRunId],
  );

  const activeSteps = useMemo(
    () =>
      activeRun
        ? state.agentSteps
            .filter((s) => s.run_id === activeRun.id)
            .toSorted((a, b) => a.step_number - b.step_number)
        : [],
    [state.agentSteps, activeRun],
  );

  const activeDraft = useMemo(() => {
    if (activeRun?.generated_draft_id != null) {
      return (
        state.reorderDrafts.find((d) => d.id === activeRun.generated_draft_id) ?? null
      );
    }
    return (
      state.reorderDrafts.find(
        (d) => d.status === 'VERIFIED_PENDING_APPROVAL' || d.status === 'STALE_CONFLICT',
      ) ?? null
    );
  }, [state.reorderDrafts, activeRun]);

  const activeDraftItems = useMemo(
    () =>
      activeDraft
        ? state.reorderDraftItems.filter((item) => item.draft_id === activeDraft.id)
        : [],
    [state.reorderDraftItems, activeDraft],
  );

  const shortedSkus = useMemo(
    () =>
      checkOrderFeasibility(state, {
        locationId: selectedLocationId,
        mode: 'CUMULATIVE',
      }).skuSummaries.filter((s) => s.totalShortageQty > 0),
    [state, selectedLocationId],
  );

  if (!open) return null;

  const showClarification =
    activeRun?.status === 'AWAITING_CLARIFICATION' &&
    activeRun.clarification_question != null;
  const resumePrompt = lastAgentPrompt || activeRun?.user_prompt || '';

  return (
    <aside
      aria-label="Operations Assistant Command Console"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col border-l border-hairline bg-surface shadow-sm"
    >
      <DrawerHeader activeUser={activeUser} onClose={onClose} />

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <ScenarioPresetsBar
          selectedLocationId={selectedLocationId}
          onExecuteCommand={onRunAgentCommand}
          onRunStaleConflictTest={onRunStaleConflictTest}
        />

        {feedback ? (
          <DrawerFeedbackBanner feedback={feedback} onDismiss={onDismissFeedback} />
        ) : null}

        <DrawerRunSelector
          runs={state.agentRuns}
          activeRunId={activeRun?.id}
          onSelectRunId={onSelectRunId}
        />

        {showClarification && activeRun.clarification_question ? (
          <ClarificationPromptCard
            key={`clarify-${activeRun.id}`}
            question={activeRun.clarification_question}
            ambiguityCandidates={ambiguityCandidates}
            missingQuantityProduct={missingQuantityProduct}
            onSelectCandidate={(candidate) =>
              onRunAgentCommand({
                prompt: resumePrompt,
                locationId: selectedLocationId,
                selectedProductId: candidate.productId,
              })
            }
            onConfirmQuantity={(product, qty) =>
              onRunAgentCommand({
                prompt: resumePrompt,
                locationId: selectedLocationId,
                selectedProductId: product.productId,
                overrideQuantity: qty,
              })
            }
          />
        ) : null}

        {activeRun ? (
          <AgentStepTraceList
            key={`${activeRun.id}-${runSequenceNumber}`}
            run={activeRun}
            steps={activeSteps}
            animateRunKey={runSequenceNumber}
          />
        ) : null}

        <AssistantFeasibilitySnapshot shortedSkus={shortedSkus} />

        {activeDraft ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Generated Approval Card (`submit_approved_change` Gate)
            </p>
            <DraftApprovalCard
              draft={activeDraft}
              items={activeDraftItems}
              locations={state.locations}
              products={state.products}
              balances={state.inventoryBalances}
              activeRole={activeUser.role}
              onUpdateItemQty={onUpdateDraftQty}
              onVerifyDraft={onVerifyDraft}
              onRefreshSnapshot={onRefreshSnapshot}
              onSubmitDecision={onSubmitDecision}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
});
