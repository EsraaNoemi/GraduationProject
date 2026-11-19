import { useCallback, useMemo, useState } from 'react';
import type { DriftBannerNotice, NavBadgeCounts } from '../components/layout/AppShell.tsx';
import type { AssistantAnalysisRequest } from '../components/views/OrdersFeasibilityView.tsx';
import type { TransferActionFeedback } from '../components/views/StockTransfersView.tsx';
import { createInitialOperationsState } from '../data/seedData.ts';
import {
  advanceStockTransferStatus,
  createStockTransferDraft,
  executeBoundedAgentRun,
  getInventoryStatus,
  listPendingOrders,
  refreshDraftVersionSnapshots,
  simulateConcurrentStockUpdate,
  submitApprovedChange,
  updateDraftItemQuantity,
  upsertProduct,
  verifyDraft,
} from '../services/operationsEngine.ts';
import type {
  AmbiguityCandidate,
  CreateStockTransferInput,
  ExecuteBoundedAgentRunInput,
  OperationsState,
  TransferStatus,
  UpsertProductInput,
  UserRole,
} from '../types/domain.ts';

export interface ApprovalFeedbackNotice {
  tone: 'emerald' | 'rose' | 'amber' | 'blue';
  message: string;
}

export function useOperationsStore(
  selectedLocationId: number | null,
  activeRole: UserRole,
) {
  const [opsState, setOpsState] = useState<OperationsState>(() =>
    createInitialOperationsState(),
  );
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [queuedAssistantRequest, setQueuedAssistantRequest] =
    useState<AssistantAnalysisRequest | null>(null);
  const [driftNotice, setDriftNotice] = useState<DriftBannerNotice | null>(null);
  const [transferFeedback, setTransferFeedback] =
    useState<TransferActionFeedback | null>(null);
  const [approvalFeedback, setApprovalFeedback] =
    useState<ApprovalFeedbackNotice | null>(null);
  const [activeRunId, setActiveRunId] = useState<number>(1);
  const [ambiguityCandidates, setAmbiguityCandidates] = useState<AmbiguityCandidate[]>(
    [],
  );
  const [missingQuantityProduct, setMissingQuantityProduct] =
    useState<AmbiguityCandidate | null>(null);
  const [lastAgentPrompt, setLastAgentPrompt] = useState<string>('');
  const [runSequenceNumber, setRunSequenceNumber] = useState<number>(0);

  const activeUser = useMemo(
    () => opsState.users.find((u) => u.role === activeRole) ?? opsState.users[0],
    [opsState.users, activeRole],
  );

  const navCounts = useMemo<NavBadgeCounts>(() => {
    const pendingOrders = listPendingOrders(opsState, {
      locationId: selectedLocationId,
    }).totalCount;

    const lowStockRows = getInventoryStatus(opsState, {
      locationId: selectedLocationId,
      lowStockOnly: true,
    }).balances.length;

    const activeTransfers = opsState.stockTransfers.filter((t) => {
      if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return false;
      if (
        selectedLocationId != null &&
        t.source_location_id !== selectedLocationId &&
        t.destination_location_id !== selectedLocationId
      ) {
        return false;
      }
      return true;
    }).length;

    const pendingApprovals = opsState.reorderDrafts.filter((d) => {
      if (d.status !== 'VERIFIED_PENDING_APPROVAL' && d.status !== 'STALE_CONFLICT') {
        return false;
      }
      if (selectedLocationId != null && d.target_location_id !== selectedLocationId) {
        return false;
      }
      return true;
    }).length;

    return {
      pendingOrders,
      lowStockRows,
      activeTransfers,
      pendingApprovals,
    };
  }, [opsState, selectedLocationId]);

  const pendingDrafts = useMemo(
    () =>
      opsState.reorderDrafts.filter(
        (d) => d.status === 'VERIFIED_PENDING_APPROVAL' || d.status === 'STALE_CONFLICT',
      ),
    [opsState.reorderDrafts],
  );

  const toggleAssistant = useCallback(() => {
    setAssistantOpen((prev) => !prev);
  }, []);

  const openAssistant = useCallback(() => {
    setAssistantOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false);
  }, []);

  const runAgentCommand = useCallback(
    (input: Omit<ExecuteBoundedAgentRunInput, 'actorUserId'>) => {
      const res = executeBoundedAgentRun(opsState, {
        ...input,
        actorUserId: activeUser.id,
      });

      setOpsState(res.nextState);
      setActiveRunId(res.run.id);
      setAmbiguityCandidates(res.ambiguityCandidates);
      setMissingQuantityProduct(res.missingQuantityProduct);
      setLastAgentPrompt(input.prompt);
      setRunSequenceNumber((n) => n + 1);
      setApprovalFeedback(
        res.draft
          ? {
              tone: 'blue',
              message: `Agent run ${res.run.run_code} prepared & verified ${res.draft.draft_code}.`,
            }
          : {
              tone: 'amber',
              message: `Agent run ${res.run.run_code} paused at Step ${res.run.step_count}/${res.run.max_steps} for human clarification.`,
            },
      );
      setAssistantOpen(true);
      return res;
    },
    [opsState, activeUser.id],
  );

  const analyzeWithAssistant = useCallback(
    (request: AssistantAnalysisRequest) => {
      setQueuedAssistantRequest(request);
      runAgentCommand({
        prompt: request.prompt,
        locationId: request.locationId,
      });
    },
    [runAgentCommand],
  );

  const clearQueuedRequest = useCallback(() => {
    setQueuedAssistantRequest(null);
  }, []);

  const dismissDriftNotice = useCallback(() => {
    setDriftNotice(null);
  }, []);

  const dismissTransferFeedback = useCallback(() => {
    setTransferFeedback(null);
  }, []);

  const dismissApprovalFeedback = useCallback(() => {
    setApprovalFeedback(null);
  }, []);

  const handleSimulateStockDrift = useCallback(() => {
    const targetDraft = opsState.reorderDrafts.find(
      (d) => d.status === 'VERIFIED_PENDING_APPROVAL' || d.status === 'DRAFT',
    );
    const targetDraftItem = targetDraft
      ? opsState.reorderDraftItems.find((i) => i.draft_id === targetDraft.id)
      : undefined;

    const locationId = targetDraftItem?.location_id ?? selectedLocationId ?? 2;
    const productId = targetDraftItem?.product_id ?? 8;

    const res = simulateConcurrentStockUpdate(opsState, {
      locationId,
      productId,
      quantityDelta: -2,
      actorUserId: activeUser.id,
      reason: 'Simulated concurrent POS checkout (-2 units)',
    });

    const affectedText =
      res.affectedPendingDraftCodes.length > 0
        ? ` Pending draft snapshot invalidated: ${res.affectedPendingDraftCodes.join(', ')} (409 STALE_CONFLICT armed).`
        : '';

    setOpsState(res.nextState);
    setDriftNotice({
      tone: 'amber',
      message: `Concurrent stock drift simulated: version incremented to v${res.updatedBalance.version} (on-hand ${res.updatedBalance.quantity}).${affectedText}`,
    });
  }, [opsState, activeUser.id, selectedLocationId]);

  const handleRunStaleConflictScenario = useCallback(() => {
    const runRes = executeBoundedAgentRun(opsState, {
      prompt:
        'Check feasibility for all high-priority orders at Abdali Branch and prepare a supplier reorder draft.',
      locationId: 2,
      actorUserId: activeUser.id,
    });
    const firstItem = runRes.draftItems[0];
    if (!firstItem) {
      setOpsState(runRes.nextState);
      setActiveRunId(runRes.run.id);
      setAssistantOpen(true);
      return;
    }

    const driftRes = simulateConcurrentStockUpdate(runRes.nextState, {
      locationId: firstItem.location_id,
      productId: firstItem.product_id,
      quantityDelta: -2,
      actorUserId: activeUser.id,
      reason: 'Scenario 6 TOCTOU concurrent stock mutation (-2 units)',
    });

    setOpsState(driftRes.nextState);
    setActiveRunId(runRes.run.id);
    setAmbiguityCandidates([]);
    setMissingQuantityProduct(null);
    setRunSequenceNumber((n) => n + 1);
    setApprovalFeedback({
      tone: 'amber',
      message: `Staged ${runRes.draft?.draft_code} at v${firstItem.expected_inventory_version}, then simulated concurrent stock drift to v${driftRes.updatedBalance.version}. Click Approve & Commit (as Manager) to verify 409 STALE_CONFLICT guard.`,
    });
    setAssistantOpen(true);
  }, [opsState, activeUser.id]);

  const handleUpdateDraftQty = useCallback(
    (draftId: number, draftItemId: number, newQty: number) => {
      const nextState = updateDraftItemQuantity(
        opsState,
        draftId,
        draftItemId,
        newQty,
        activeUser.id,
      );
      setOpsState(nextState);
      setApprovalFeedback({
        tone: 'blue',
        message: `Updated line item quantity to ${newQty} and re-verified draft.`,
      });
    },
    [opsState, activeUser.id],
  );

  const handleVerifyDraft = useCallback(
    (draftId: number) => {
      const res = verifyDraft(opsState, { draftId, actorUserId: activeUser.id });
      setOpsState(res.nextState);
      setApprovalFeedback({
        tone: res.passed ? 'emerald' : 'rose',
        message: res.passed
          ? `verify_draft passed for ${res.draft.draft_code}.`
          : `verify_draft flagged issues on ${res.draft.draft_code}: ${res.errors.join(' ')}`,
      });
    },
    [opsState, activeUser.id],
  );

  const handleRefreshDraftSnapshot = useCallback(
    (draftId: number) => {
      const res = refreshDraftVersionSnapshots(opsState, draftId, activeUser.id);
      setOpsState(res.nextState);
      setApprovalFeedback({
        tone: res.passed ? 'emerald' : 'rose',
        message: res.passed
          ? `Refreshed version snapshots and re-verified ${res.draft.draft_code}. Ready for Manager approval.`
          : `Snapshot refresh failed on ${res.draft.draft_code}: ${res.errors.join(' ')}`,
      });
    },
    [opsState, activeUser.id],
  );

  const handleSubmitDecision = useCallback(
    (draftId: number, decision: 'APPROVE' | 'REJECT', rejectionReason?: string) => {
      const res = submitApprovedChange(opsState, {
        draftId,
        actorUserId: activeUser.id,
        decision,
        rejectionReason,
      });
      setOpsState(res.nextState);
      setApprovalFeedback({
        tone:
          res.statusCode === 200
            ? decision === 'APPROVE'
              ? 'emerald'
              : 'amber'
            : 'rose',
        message: res.message,
      });
    },
    [opsState, activeUser.id],
  );

  const handleAdjustStock = useCallback(
    (locationId: number, productId: number, delta: number) => {
      const res = simulateConcurrentStockUpdate(opsState, {
        locationId,
        productId,
        quantityDelta: delta,
        actorUserId: activeUser.id,
        reason:
          delta < 0
            ? `Inline stock decrement (${delta} units)`
            : `Inline manual restock (+${delta} units)`,
      });

      const affectedText =
        res.affectedPendingDraftCodes.length > 0
          ? ` Draft snapshot invalidated: ${res.affectedPendingDraftCodes.join(', ')}.`
          : '';

      setOpsState(res.nextState);
      setDriftNotice({
        tone: 'amber',
        message: `Inventory updated to ${res.updatedBalance.quantity} (version v${res.updatedBalance.version}).${affectedText}`,
      });
    },
    [opsState, activeUser.id],
  );

  const handleUpsertProduct = useCallback(
    (input: UpsertProductInput): string | null => {
      const res = upsertProduct(opsState, input);
      if (res.error) return res.error;
      setOpsState(res.nextState);
      setDriftNotice({
        tone: 'slate',
        message: res.isNew
          ? `Added SKU ${res.product.sku} (${res.product.name}) across all locations.`
          : `Updated SKU ${res.product.sku} (${res.product.name}).`,
      });
      return null;
    },
    [opsState],
  );

  const handleAdvanceTransferStatus = useCallback(
    (transferId: number, nextStatus: TransferStatus) => {
      const res = advanceStockTransferStatus(
        opsState,
        transferId,
        nextStatus,
        activeUser.id,
      );
      setOpsState(res.nextState);
      setTransferFeedback({
        tone: res.statusCode === 200 ? 'emerald' : 'rose',
        message: res.message,
      });
    },
    [opsState, activeUser.id],
  );

  const handleCreateTransfer = useCallback(
    (input: CreateStockTransferInput): string | null => {
      const res = createStockTransferDraft(opsState, input);
      if (res.error || !res.transfer) {
        return res.error ?? 'Failed to create transfer draft.';
      }
      setOpsState(res.nextState);
      setTransferFeedback({
        tone: 'blue',
        message: `Created transfer draft ${res.transfer.transfer_number}. Manager approval required before dispatch.`,
      });
      return null;
    },
    [opsState],
  );

  const handleResetDemoState = useCallback(() => {
    setOpsState(createInitialOperationsState());
    setQueuedAssistantRequest(null);
    setTransferFeedback(null);
    setApprovalFeedback(null);
    setAmbiguityCandidates([]);
    setMissingQuantityProduct(null);
    setActiveRunId(1);
    setRunSequenceNumber(0);
    setDriftNotice({
      tone: 'slate',
      message: 'Workspace reset to initial multi-location seed state.',
    });
  }, []);

  return {
    opsState,
    activeUser,
    navCounts,
    pendingDrafts,
    activeRunId,
    setActiveRunId,
    ambiguityCandidates,
    missingQuantityProduct,
    lastAgentPrompt,
    runSequenceNumber,
    assistantOpen,
    queuedAssistantRequest,
    driftNotice,
    transferFeedback,
    approvalFeedback,
    toggleAssistant,
    openAssistant,
    closeAssistant,
    runAgentCommand,
    analyzeWithAssistant,
    clearQueuedRequest,
    dismissDriftNotice,
    dismissTransferFeedback,
    dismissApprovalFeedback,
    handleSimulateStockDrift,
    handleRunStaleConflictScenario,
    handleUpdateDraftQty,
    handleVerifyDraft,
    handleRefreshDraftSnapshot,
    handleSubmitDecision,
    handleAdjustStock,
    handleUpsertProduct,
    handleAdvanceTransferStatus,
    handleCreateTransfer,
    handleResetDemoState,
  };
}
