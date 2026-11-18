import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialOperationsState } from '../src/data/seedData.ts';
import {
  advanceStockTransferStatus,
  checkOrderFeasibility,
  createStockTransferDraft,
  executeBoundedAgentRun,
  getInventoryStatus,
  listPendingOrders,
  prepareReorderDraft,
  refreshDraftVersionSnapshots,
  simulateConcurrentStockUpdate,
  submitApprovedChange,
  upsertProduct,
  verifyDraft,
} from '../src/services/operationsEngine.ts';

test('listPendingOrders returns active orders sorted by priority and FIFO', () => {
  const state = createInitialOperationsState();
  const result = listPendingOrders(state, { locationId: 2 });

  assert.equal(result.totalCount, 5);
  assert.deepEqual(
    result.orders.map((o) => o.order.order_number),
    [
      'ORD-2026-1041', // HIGH 08:15
      'ORD-2026-1042', // HIGH 08:40
      'ORD-2026-1044', // HIGH 09:20
      'ORD-2026-1043', // NORMAL 09:05
      'ORD-2026-1045', // NORMAL 09:45
    ],
  );
});

test('getInventoryStatus detects ambiguous thermal queries', () => {
  const state = createInitialOperationsState();

  const thermalPaper = getInventoryStatus(state, { searchQuery: 'thermal paper' });
  assert.equal(thermalPaper.ambiguousMatch, true);
  assert.equal(thermalPaper.matchedProducts.length, 2);

  const thermalRolls = getInventoryStatus(state, { searchQuery: 'thermal rolls' });
  assert.equal(thermalRolls.ambiguousMatch, true);
  assert.equal(thermalRolls.matchedProducts.length, 3);

  const exactSku = getInventoryStatus(state, { searchQuery: 'THM-RCP-8080' });
  assert.equal(exactSku.ambiguousMatch, false);
  assert.equal(exactSku.matchedProducts.length, 1);
});

test('checkOrderFeasibility contrasts ISOLATED vs CUMULATIVE contention on PER-SCN-WL', () => {
  const state = createInitialOperationsState();

  const isolated = checkOrderFeasibility(state, { locationId: 2, mode: 'ISOLATED' });
  const ord1042Isolated = isolated.evaluatedOrders.find(
    (o) => o.order.order_number === 'ORD-2026-1042',
  );
  assert.equal(ord1042Isolated?.feasibility, 'FULL');

  const cumulative = checkOrderFeasibility(state, { locationId: 2, mode: 'CUMULATIVE' });
  const ord1042Cumulative = cumulative.evaluatedOrders.find(
    (o) => o.order.order_number === 'ORD-2026-1042',
  );
  assert.equal(ord1042Cumulative?.feasibility, 'PARTIAL');

  const scannerItem = ord1042Cumulative?.items.find((i) => i.sku === 'PER-SCN-WL');
  assert.equal(scannerItem?.physicalOnHandQty, 14);
  assert.equal(scannerItem?.reservedQty, 2);
  assert.equal(scannerItem?.startingAvailableQty, 12);
  assert.equal(scannerItem?.priorAllocatedByQueueQty, 8);
  assert.equal(scannerItem?.availableBeforeOrder, 4);
  assert.equal(scannerItem?.requestedQty, 9);
  assert.equal(scannerItem?.allocatedQty, 4);
  assert.equal(scannerItem?.shortageQty, 5);
  assert.ok((scannerItem?.surplusLocations.length ?? 0) > 0);
});

test('prepareReorderDraft -> verifyDraft -> submitApprovedChange enforces RBAC and TOCTOU', () => {
  const initial = createInitialOperationsState();

  // 1. EMPLOYEE prepares and verifies a draft
  const prepared = prepareReorderDraft(initial, {
    draftType: 'REORDER_DRAFT',
    title: 'Test Reorder Draft',
    targetLocationId: 2,
    items: [{ productId: 4, locationId: 2, suggestedReorderQty: 50, shortageQty: 4 }],
    rationale: 'Restock Cat6 UTP cables at Abdali.',
    createdByUserId: 1, // Tariq (EMPLOYEE)
  });
  assert.equal(prepared.draft.status, 'DRAFT');

  const verified = verifyDraft(prepared.nextState, {
    draftId: prepared.draft.id,
    actorUserId: 1,
  });
  assert.equal(verified.passed, true);
  assert.equal(verified.draft.status, 'VERIFIED_PENDING_APPROVAL');

  // 2. EMPLOYEE cannot approve (403)
  const employeeAttempt = submitApprovedChange(verified.nextState, {
    draftId: verified.draft.id,
    actorUserId: 1,
    decision: 'APPROVE',
  });
  assert.equal(employeeAttempt.statusCode, 403);

  // 3. Concurrent stock mutation triggers 409 STALE_CONFLICT on MANAGER approval
  const drifted = simulateConcurrentStockUpdate(employeeAttempt.nextState, {
    locationId: 2,
    productId: 4,
    quantityDelta: -2,
    actorUserId: 2,
  });
  assert.ok(drifted.affectedPendingDraftCodes.includes(verified.draft.draft_code));

  const conflictAttempt = submitApprovedChange(drifted.nextState, {
    draftId: verified.draft.id,
    actorUserId: 2, // Esraa (MANAGER)
    decision: 'APPROVE',
  });
  assert.equal(conflictAttempt.statusCode, 409);
  assert.equal(conflictAttempt.draft.status, 'STALE_CONFLICT');

  // 4. Fresh draft with current version succeeds for MANAGER
  const freshDraft = prepareReorderDraft(conflictAttempt.nextState, {
    draftType: 'REORDER_DRAFT',
    title: 'Fresh Reorder Draft',
    targetLocationId: 2,
    items: [{ productId: 4, locationId: 2, suggestedReorderQty: 50, shortageQty: 6 }],
    rationale: 'Refreshed snapshot after concurrent stock update.',
    createdByUserId: 1,
  });
  const freshVerified = verifyDraft(freshDraft.nextState, {
    draftId: freshDraft.draft.id,
    actorUserId: 1,
  });
  const approved = submitApprovedChange(freshVerified.nextState, {
    draftId: freshVerified.draft.id,
    actorUserId: 2,
    decision: 'APPROVE',
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.draft.status, 'APPROVED_COMMITTED');
});

test('upsertProduct adds SKU across all locations and edits existing SKU', () => {
  const initial = createInitialOperationsState();

  const added = upsertProduct(initial, {
    category_id: 1,
    sku: 'NET-CAT6A-10M',
    name: 'Cat6A Shielded Patch Cable 10m',
    description: '10GbE LSZH patch cord.',
    unit: 'pcs',
    reorder_threshold: 10,
    default_reorder_qty: 25,
    unit_cost_jod: 6.5,
    supplier_name: 'Levant Network Systems',
    initialQuantitiesByLocationId: { 1: 30, 2: 8, 3: 12 },
    actorUserId: 2,
  });

  assert.equal(added.isNew, true);
  assert.equal(added.error, undefined);
  assert.equal(added.nextState.products.length, initial.products.length + 1);
  assert.equal(
    added.nextState.inventoryBalances.length,
    initial.inventoryBalances.length + initial.locations.length,
  );

  const edited = upsertProduct(added.nextState, {
    id: added.product.id,
    category_id: 1,
    sku: 'NET-CAT6A-10M',
    name: 'Cat6A Shielded Patch Cable 10m (Updated)',
    description: '10GbE LSZH patch cord.',
    unit: 'pcs',
    reorder_threshold: 15,
    default_reorder_qty: 30,
    unit_cost_jod: 6.75,
    supplier_name: 'Levant Network Systems',
    actorUserId: 2,
  });

  assert.equal(edited.isNew, false);
  assert.equal(edited.product.reorder_threshold, 15);
});

test('createStockTransferDraft and advanceStockTransferStatus enforce RBAC and update balances', () => {
  const initial = createInitialOperationsState();

  const created = createStockTransferDraft(initial, {
    sourceLocationId: 1,
    destinationLocationId: 2,
    transferDate: '2026-11-18',
    notes: 'Cover Abdali scanner contention',
    items: [{ productId: 8, quantity: 10 }],
    actorUserId: 1, // EMPLOYEE creates DRAFT
  });

  assert.ok(created.transfer);
  assert.equal(created.transfer?.status, 'DRAFT');

  // EMPLOYEE cannot approve (403)
  const denied = advanceStockTransferStatus(
    created.nextState,
    created.transfer!.id,
    'APPROVED',
    1,
  );
  assert.equal(denied.statusCode, 403);

  // MANAGER approves -> Dispatch -> Complete
  const approved = advanceStockTransferStatus(
    denied.nextState,
    created.transfer!.id,
    'APPROVED',
    2,
  );
  assert.equal(approved.statusCode, 200);

  const dispatched = advanceStockTransferStatus(
    approved.nextState,
    created.transfer!.id,
    'IN_TRANSIT',
    1,
  );
  assert.equal(dispatched.statusCode, 200);

  const completed = advanceStockTransferStatus(
    dispatched.nextState,
    created.transfer!.id,
    'COMPLETED',
    1,
  );
  assert.equal(completed.statusCode, 200);

  const srcBalance = completed.nextState.inventoryBalances.find(
    (b) => b.location_id === 1 && b.product_id === 8,
  );
  const dstBalance = completed.nextState.inventoryBalances.find(
    (b) => b.location_id === 2 && b.product_id === 8,
  );
  assert.equal(srcBalance?.quantity, 35); // 45 - 10
  assert.equal(dstBalance?.quantity, 24); // 14 + 10
});

test('executeBoundedAgentRun handles standard 5-step workflow, ambiguity clarification, and snapshot refresh', () => {
  const initial = createInitialOperationsState();

  // 1. Standard 5-step pending orders run
  const standardRun = executeBoundedAgentRun(initial, {
    prompt: "Review today's pending orders, flag shortages, and prepare a supplier reorder draft.",
    actorUserId: 1,
  });
  assert.equal(standardRun.run.step_count, 5);
  assert.equal(standardRun.run.max_steps, 5);
  assert.equal(standardRun.run.status, 'AWAITING_APPROVAL');
  assert.ok(standardRun.draft);
  assert.equal(standardRun.draft?.status, 'VERIFIED_PENDING_APPROVAL');

  // 2. Ambiguous thermal paper query halts at Step 2 for clarification
  const ambiguousRun = executeBoundedAgentRun(standardRun.nextState, {
    prompt: 'Check thermal paper stock and prepare a reorder draft for 50 rolls.',
    actorUserId: 1,
  });
  assert.equal(ambiguousRun.run.status, 'AWAITING_CLARIFICATION');
  assert.equal(ambiguousRun.run.step_count, 2);
  assert.ok(ambiguousRun.ambiguityCandidates.length >= 2);
  assert.equal(ambiguousRun.draft, null);

  // 3. Selecting candidate SKU completes 5-step run
  const resolvedRun = executeBoundedAgentRun(ambiguousRun.nextState, {
    prompt: 'Check thermal paper stock and prepare a reorder draft for 50 rolls.',
    actorUserId: 1,
    selectedProductId: ambiguousRun.ambiguityCandidates[0].productId,
    overrideQuantity: 50,
  });
  assert.equal(resolvedRun.run.step_count, 5);
  assert.equal(resolvedRun.run.status, 'AWAITING_APPROVAL');
  assert.equal(resolvedRun.draft?.status, 'VERIFIED_PENDING_APPROVAL');

  // 4. Concurrent stock drift triggers 409 STALE_CONFLICT, resolved by refreshDraftVersionSnapshots
  const draftItem = resolvedRun.draftItems[0];
  const drifted = simulateConcurrentStockUpdate(resolvedRun.nextState, {
    locationId: draftItem.location_id,
    productId: draftItem.product_id,
    quantityDelta: -2,
    actorUserId: 2,
  });
  const conflict = submitApprovedChange(drifted.nextState, {
    draftId: resolvedRun.draft!.id,
    actorUserId: 2,
    decision: 'APPROVE',
  });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.draft.status, 'STALE_CONFLICT');

  const refreshed = refreshDraftVersionSnapshots(
    conflict.nextState,
    resolvedRun.draft!.id,
    2,
  );
  assert.equal(refreshed.passed, true);
  assert.equal(refreshed.draft.status, 'VERIFIED_PENDING_APPROVAL');

  const committed = submitApprovedChange(refreshed.nextState, {
    draftId: resolvedRun.draft!.id,
    actorUserId: 2,
    decision: 'APPROVE',
  });
  assert.equal(committed.statusCode, 200);
  assert.equal(committed.draft.status, 'APPROVED_COMMITTED');
});
