import type {
  AgentRun,
  AgentStep,
  AmbiguityCandidate,
  AuditLog,
  CheckOrderFeasibilityInput,
  CheckOrderFeasibilityResult,
  CreateStockTransferInput,
  CreateStockTransferResult,
  ExecuteBoundedAgentRunInput,
  ExecuteBoundedAgentRunResult,
  GetInventoryStatusInput,
  GetInventoryStatusResult,
  InventoryBalance,
  InventoryBalanceView,
  ListPendingOrdersInput,
  ListPendingOrdersResult,
  OperationsState,
  OrderFeasibilityDetail,
  OrderItemFeasibilityDetail,
  OrderPriority,
  OrderStatus,
  OrderSummaryRecord,
  PrepareReorderDraftInput,
  PrepareReorderDraftItemInput,
  PrepareReorderDraftResult,
  Product,
  ReorderDraft,
  ReorderDraftItem,
  SimulateConcurrentStockUpdateInput,
  SimulateConcurrentStockUpdateResult,
  SkuCumulativeDemandSummary,
  StockMovement,
  StockTransfer,
  StockTransferItem,
  SubmitApprovedChangeInput,
  SubmitApprovedChangeResult,
  TransferStatus,
  UpsertProductInput,
  UpsertProductResult,
  VerifyDraftInput,
  VerifyDraftResult,
} from '../types/domain.ts';

// ----------------------------------------------------------------------------
// Internal Helpers (Pure & Deterministic)
// ----------------------------------------------------------------------------

const PRIORITY_RANK: Record<OrderPriority, number> = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
};

const NON_PENDING_ORDER_STATUSES = new Set<OrderStatus>(['FULFILLED', 'CANCELLED']);

const SEARCH_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'unit',
  'units',
  'with',
]);

function nowIso(): string {
  return new Date().toISOString();
}

function nextNumericId(items: Array<{ id: number }>): number {
  let maxId = 0;
  for (const item of items) {
    if (item.id > maxId) {
      maxId = item.id;
    }
  }
  return maxId + 1;
}

function formatCode(prefix: string, id: number, padLength = 3): string {
  return `${prefix}-${String(id).padStart(padLength, '0')}`;
}

function balanceKey(locationId: number, productId: number): string {
  return `${locationId}:${productId}`;
}

function normalizeToken(token: string): string {
  const cleaned = token.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (cleaned.length > 3 && cleaned.endsWith('s') && !cleaned.endsWith('ss')) {
    return cleaned.slice(0, -1);
  }
  return cleaned;
}

function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length > 0 && !SEARCH_STOP_WORDS.has(token));
}

function computeAvailableQty(balance: InventoryBalance | undefined): number {
  if (!balance) return 0;
  return Math.max(0, Number((balance.quantity - balance.reserved_quantity).toFixed(3)));
}

function deriveStockHealth(
  availableQty: number,
  reorderThreshold: number,
): 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (availableQty <= 0) return 'OUT_OF_STOCK';
  if (availableQty < reorderThreshold) return 'LOW_STOCK';
  return 'HEALTHY';
}

function appendAuditLog(
  logs: AuditLog[],
  entry: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: string },
): AuditLog[] {
  const nextId = nextNumericId(logs);
  const newLog: AuditLog = {
    id: nextId,
    timestamp: entry.timestamp ?? nowIso(),
    actor_user_id: entry.actor_user_id,
    actor_role: entry.actor_role,
    action_category: entry.action_category,
    action_name: entry.action_name,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    details: entry.details,
  };
  return [newLog, ...logs];
}

// ----------------------------------------------------------------------------
// Tool 1: list_pending_orders (Read-Only)
// ----------------------------------------------------------------------------

export function listPendingOrders(
  state: OperationsState,
  input: ListPendingOrdersInput = {},
): ListPendingOrdersResult {
  const locationMap = new Map(state.locations.map((loc) => [loc.id, loc]));
  const productMap = new Map(state.products.map((prod) => [prod.id, prod]));

  const allowedStatusSet =
    input.includeStatuses && input.includeStatuses.length > 0
      ? new Set(input.includeStatuses)
      : null;

  const filteredOrders = state.orders
    .filter((order) => {
      if (input.locationId != null && order.fulfillment_location_id !== input.locationId) {
        return false;
      }
      if (input.priority && input.priority !== 'ALL' && order.priority !== input.priority) {
        return false;
      }
      if (allowedStatusSet) {
        if (!allowedStatusSet.has(order.status)) return false;
      } else if (NON_PENDING_ORDER_STATUSES.has(order.status)) {
        return false;
      }
      if (input.fromDate && order.requested_delivery_date < input.fromDate) {
        return false;
      }
      if (input.toDate && order.requested_delivery_date > input.toDate) {
        return false;
      }
      return true;
    })
    .toSorted((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      const timeDiff = a.created_at.localeCompare(b.created_at);
      if (timeDiff !== 0) return timeDiff;
      return a.id - b.id;
    });

  const itemsByOrderId = new Map<number, OrderSummaryRecord['items']>();
  for (const item of state.orderItems) {
    const product = productMap.get(item.product_id);
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push({
      ...item,
      sku: product?.sku ?? `SKU-${item.product_id}`,
      productName: product?.name ?? 'Unknown Product',
      unit: product?.unit ?? 'pcs',
    });
    itemsByOrderId.set(item.order_id, list);
  }

  const summaries: OrderSummaryRecord[] = filteredOrders.map((order) => {
    const items = itemsByOrderId.get(order.id) ?? [];
    let totalRequestedUnits = 0;
    for (const item of items) {
      totalRequestedUnits += item.requested_quantity;
    }
    return {
      order,
      locationName:
        locationMap.get(order.fulfillment_location_id)?.name ??
        `Location #${order.fulfillment_location_id}`,
      items,
      totalRequestedUnits,
    };
  });

  return {
    orders: summaries,
    totalCount: summaries.length,
  };
}

// ----------------------------------------------------------------------------
// Tool 2: get_inventory_status (Read-Only + Ambiguity Detection)
// ----------------------------------------------------------------------------

export function getInventoryStatus(
  state: OperationsState,
  input: GetInventoryStatusInput = {},
): GetInventoryStatusResult {
  const locationMap = new Map(state.locations.map((loc) => [loc.id, loc]));
  const categoryMap = new Map(state.categories.map((cat) => [cat.id, cat]));
  const productMap = new Map(state.products.map((prod) => [prod.id, prod]));

  let matchedProducts: Product[] = state.products;
  let ambiguousMatch = false;
  let ambiguityReason: string | null = null;

  if (input.productIds && input.productIds.length > 0) {
    const idSet = new Set(input.productIds);
    matchedProducts = matchedProducts.filter((p) => idSet.has(p.id));
  }

  if (input.categoryId != null) {
    matchedProducts = matchedProducts.filter((p) => p.category_id === input.categoryId);
  }

  const trimmedQuery = input.searchQuery?.trim() ?? '';
  if (trimmedQuery.length > 0) {
    const normalizedQuery = trimmedQuery.toLowerCase();
    const exactSkuMatch = matchedProducts.find(
      (p) => p.sku.toLowerCase() === normalizedQuery || p.name.toLowerCase() === normalizedQuery,
    );

    if (exactSkuMatch) {
      matchedProducts = [exactSkuMatch];
    } else {
      const tokens = tokenizeQuery(trimmedQuery);
      if (tokens.length > 0) {
        matchedProducts = matchedProducts.filter((product) => {
          const haystack = [
            product.sku,
            product.name,
            product.description,
            product.unit,
            categoryMap.get(product.category_id)?.name ?? '',
          ]
            .join(' ')
            .toLowerCase();

          return tokens.every((token) => haystack.includes(token));
        });
      }

      if (matchedProducts.length > 1) {
        ambiguousMatch = true;
        const candidateLabels = matchedProducts
          .map((p) => `${p.sku} (${p.name})`)
          .join('; ');
        ambiguityReason = `Query "${trimmedQuery}" matched ${matchedProducts.length} distinct SKUs: ${candidateLabels}. Clarification required before drafting.`;
      }
    }
  }

  const matchedProductIds = new Set(matchedProducts.map((p) => p.id));

  const balances: InventoryBalanceView[] = [];
  for (const balance of state.inventoryBalances) {
    if (input.locationId != null && balance.location_id !== input.locationId) {
      continue;
    }
    if (!matchedProductIds.has(balance.product_id)) {
      continue;
    }

    const product = productMap.get(balance.product_id);
    const location = locationMap.get(balance.location_id);
    if (!product || !location) continue;

    const availableQty = computeAvailableQty(balance);
    const stockHealth = deriveStockHealth(availableQty, product.reorder_threshold);

    if (input.lowStockOnly && stockHealth === 'HEALTHY') {
      continue;
    }

    balances.push({
      locationId: location.id,
      locationName: location.name,
      locationType: location.location_type,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      categoryName: categoryMap.get(product.category_id)?.name ?? 'Uncategorized',
      unit: product.unit,
      quantity: balance.quantity,
      reserved_quantity: balance.reserved_quantity,
      available_quantity: availableQty,
      reorder_threshold: product.reorder_threshold,
      default_reorder_qty: product.default_reorder_qty,
      unit_cost_jod: product.unit_cost_jod,
      supplier_name: product.supplier_name,
      version: balance.version,
      updated_at: balance.updated_at,
      stockHealth,
    });
  }

  balances.sort((a, b) => {
    if (a.locationId !== b.locationId) return a.locationId - b.locationId;
    return a.sku.localeCompare(b.sku);
  });

  return {
    balances,
    matchedProducts,
    ambiguousMatch,
    ambiguityReason,
  };
}

// ----------------------------------------------------------------------------
// Tool 3: check_order_feasibility (Deterministic Cumulative or Isolated)
// ----------------------------------------------------------------------------

export function checkOrderFeasibility(
  state: OperationsState,
  input: CheckOrderFeasibilityInput = {},
): CheckOrderFeasibilityResult {
  const mode = input.mode ?? 'CUMULATIVE';
  const locationMap = new Map(state.locations.map((loc) => [loc.id, loc]));
  const productMap = new Map(state.products.map((prod) => [prod.id, prod]));

  const initialAvailMap = new Map<string, number>();
  const balanceMap = new Map<string, InventoryBalance>();
  for (const balance of state.inventoryBalances) {
    const key = balanceKey(balance.location_id, balance.product_id);
    balanceMap.set(key, balance);
    initialAvailMap.set(key, computeAvailableQty(balance));
  }

  const orderIdSet =
    input.orderIds && input.orderIds.length > 0 ? new Set(input.orderIds) : null;

  const targetOrders = state.orders
    .filter((order) => {
      if (orderIdSet) {
        return orderIdSet.has(order.id);
      }
      if (NON_PENDING_ORDER_STATUSES.has(order.status)) {
        return false;
      }
      if (input.locationId != null && order.fulfillment_location_id !== input.locationId) {
        return false;
      }
      if (
        input.priorityFilter &&
        input.priorityFilter !== 'ALL' &&
        order.priority !== input.priorityFilter
      ) {
        return false;
      }
      return true;
    })
    .toSorted((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      const timeDiff = a.created_at.localeCompare(b.created_at);
      if (timeDiff !== 0) return timeDiff;
      return a.id - b.id;
    });

  const runningAvailMap = new Map(initialAvailMap);

  const itemsByOrderId = new Map<number, typeof state.orderItems>();
  for (const item of state.orderItems) {
    const list = itemsByOrderId.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrderId.set(item.order_id, list);
  }

  const findSurplusLocations = (excludeLocationId: number, productId: number) => {
    const product = productMap.get(productId);
    const threshold = product?.reorder_threshold ?? 0;
    const options: OrderItemFeasibilityDetail['surplusLocations'] = [];

    for (const loc of state.locations) {
      if (loc.id === excludeLocationId) continue;
      const avail = initialAvailMap.get(balanceKey(loc.id, productId)) ?? 0;
      const transferableSurplusQty = Math.max(0, Number((avail - threshold).toFixed(3)));
      if (transferableSurplusQty > 0) {
        options.push({
          locationId: loc.id,
          locationName: loc.name,
          locationType: loc.location_type,
          availableQty: avail,
          transferableSurplusQty,
        });
      }
    }

    options.sort((a, b) => b.transferableSurplusQty - a.transferableSurplusQty);
    return options;
  };

  interface SkuAccumulator {
    productId: number;
    locationId: number;
    totalRequestedQty: number;
    totalAllocatedQty: number;
    totalShortageQty: number;
    competingOrders: Set<number>;
  }

  const skuAccumulators = new Map<string, SkuAccumulator>();
  const evaluatedOrders: OrderFeasibilityDetail[] = [];

  let fullCount = 0;
  let partialCount = 0;
  let unavailableCount = 0;

  for (const order of targetOrders) {
    const orderItems = itemsByOrderId.get(order.id) ?? [];
    const itemDetails: OrderItemFeasibilityDetail[] = [];

    let totalRequestedQty = 0;
    let totalAllocatedQty = 0;
    let totalShortageQty = 0;

    for (const item of orderItems) {
      const product = productMap.get(item.product_id);
      const key = balanceKey(order.fulfillment_location_id, item.product_id);
      const balance = balanceMap.get(key);
      const startingAvailableQty = initialAvailMap.get(key) ?? 0;
      const availBefore =
        mode === 'CUMULATIVE'
          ? (runningAvailMap.get(key) ?? 0)
          : startingAvailableQty;
      const priorAllocatedByQueueQty = Math.max(
        0,
        Number((startingAvailableQty - availBefore).toFixed(3)),
      );

      const allocatedQty = Math.min(item.requested_quantity, availBefore);
      const shortageQty = Math.max(0, Number((item.requested_quantity - allocatedQty).toFixed(3)));
      const availAfter = Math.max(0, Number((availBefore - allocatedQty).toFixed(3)));

      if (mode === 'CUMULATIVE') {
        runningAvailMap.set(key, availAfter);
      }

      totalRequestedQty += item.requested_quantity;
      totalAllocatedQty += allocatedQty;
      totalShortageQty += shortageQty;

      const surplusLocations =
        shortageQty > 0
          ? findSurplusLocations(order.fulfillment_location_id, item.product_id)
          : [];

      itemDetails.push({
        orderItemId: item.id,
        orderId: order.id,
        productId: item.product_id,
        sku: product?.sku ?? `SKU-${item.product_id}`,
        productName: product?.name ?? 'Unknown Product',
        unit: product?.unit ?? 'pcs',
        requestedQty: item.requested_quantity,
        physicalOnHandQty: balance?.quantity ?? 0,
        reservedQty: balance?.reserved_quantity ?? 0,
        startingAvailableQty,
        priorAllocatedByQueueQty,
        availableBeforeOrder: availBefore,
        allocatedQty,
        shortageQty,
        availableAfterOrder: availAfter,
        inventoryVersion: balance?.version ?? 1,
        surplusLocations,
      });

      const acc = skuAccumulators.get(key) ?? {
        productId: item.product_id,
        locationId: order.fulfillment_location_id,
        totalRequestedQty: 0,
        totalAllocatedQty: 0,
        totalShortageQty: 0,
        competingOrders: new Set<number>(),
      };
      acc.totalRequestedQty += item.requested_quantity;
      acc.totalAllocatedQty += allocatedQty;
      acc.totalShortageQty += shortageQty;
      acc.competingOrders.add(order.id);
      skuAccumulators.set(key, acc);
    }

    let feasibility: OrderFeasibilityDetail['feasibility'];
    let derivedOrderStatus: OrderStatus;

    if (totalShortageQty === 0) {
      feasibility = 'FULL';
      derivedOrderStatus = 'READY_TO_FULFILL';
      fullCount += 1;
    } else if (totalAllocatedQty > 0) {
      feasibility = 'PARTIAL';
      derivedOrderStatus = 'PARTIAL_SHORTAGE';
      partialCount += 1;
    } else {
      feasibility = 'UNAVAILABLE';
      derivedOrderStatus = 'BLOCKED_SHORTAGE';
      unavailableCount += 1;
    }

    evaluatedOrders.push({
      order,
      locationName:
        locationMap.get(order.fulfillment_location_id)?.name ??
        `Location #${order.fulfillment_location_id}`,
      feasibility,
      derivedOrderStatus,
      items: itemDetails,
      totalRequestedQty,
      totalAllocatedQty,
      totalShortageQty,
    });
  }

  const skuSummaries: SkuCumulativeDemandSummary[] = [];
  for (const [key, acc] of skuAccumulators.entries()) {
    const product = productMap.get(acc.productId);
    const location = locationMap.get(acc.locationId);
    if (!product || !location) continue;

    const startingAvailableQty = initialAvailMap.get(key) ?? 0;
    const remainingAvailableQty =
      mode === 'CUMULATIVE'
        ? (runningAvailMap.get(key) ?? 0)
        : Math.max(0, startingAvailableQty - acc.totalAllocatedQty);

    const neededForSafetyAndShortage = Math.max(
      0,
      acc.totalShortageQty + product.reorder_threshold - remainingAvailableQty,
    );
    const recommendedReorderQty =
      acc.totalShortageQty > 0 || remainingAvailableQty < product.reorder_threshold
        ? Math.max(neededForSafetyAndShortage, product.default_reorder_qty)
        : 0;

    const transferCoverageOptions = findSurplusLocations(acc.locationId, acc.productId).map(
      (opt) => ({
        sourceLocationId: opt.locationId,
        sourceLocationName: opt.locationName,
        availableQty: opt.availableQty,
        transferableSurplusQty: opt.transferableSurplusQty,
      }),
    );

    skuSummaries.push({
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      unit: product.unit,
      locationId: location.id,
      locationName: location.name,
      startingAvailableQty,
      totalRequestedQty: acc.totalRequestedQty,
      totalAllocatedQty: acc.totalAllocatedQty,
      totalShortageQty: acc.totalShortageQty,
      remainingAvailableQty,
      reorderThreshold: product.reorder_threshold,
      defaultReorderQty: product.default_reorder_qty,
      recommendedReorderQty,
      supplierName: product.supplier_name,
      unitCostJod: product.unit_cost_jod,
      currentVersion: balanceMap.get(key)?.version ?? 1,
      competingOrderCount: acc.competingOrders.size,
      transferCoverageOptions,
    });
  }

  skuSummaries.sort((a, b) => {
    if (b.totalShortageQty !== a.totalShortageQty) {
      return b.totalShortageQty - a.totalShortageQty;
    }
    return a.sku.localeCompare(b.sku);
  });

  const shortedSkuCount = skuSummaries.filter((s) => s.totalShortageQty > 0).length;
  const feasibilityRatePct =
    evaluatedOrders.length > 0
      ? Math.round((fullCount / evaluatedOrders.length) * 100)
      : 100;

  return {
    mode,
    evaluatedOrders,
    skuSummaries,
    fullCount,
    partialCount,
    unavailableCount,
    shortedSkuCount,
    feasibilityRatePct,
  };
}

// ----------------------------------------------------------------------------
// Tool 4: prepare_reorder_draft (Staging Write Only — Never Mutates Stock)
// ----------------------------------------------------------------------------

export function prepareReorderDraft(
  state: OperationsState,
  input: PrepareReorderDraftInput,
): PrepareReorderDraftResult {
  const user = state.users.find((u) => u.id === input.createdByUserId) ?? state.users[0];
  const productMap = new Map(state.products.map((p) => [p.id, p]));
  const balanceMap = new Map(
    state.inventoryBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  const nextDraftId = nextNumericId(state.reorderDrafts);
  const draftCode = formatCode('DRF-2026', 88 + nextDraftId, 3);
  const timestamp = nowIso();

  const newDraft: ReorderDraft = {
    id: nextDraftId,
    draft_code: draftCode,
    draft_type: input.draftType,
    title: input.title,
    target_location_id: input.targetLocationId,
    source_location_id: input.sourceLocationId ?? null,
    related_order_ids: input.relatedOrderIds ?? [],
    status: 'DRAFT',
    created_by_agent_run_id: input.createdByAgentRunId ?? null,
    created_by_user_id: user.id,
    reviewed_by_user_id: null,
    verification_passed: false,
    verification_warnings: [],
    rationale: input.rationale,
    created_at: timestamp,
    reviewed_at: null,
  };

  let nextItemId = nextNumericId(state.reorderDraftItems);
  const newDraftItems: ReorderDraftItem[] = input.items.map((itemInput) => {
    const product = productMap.get(itemInput.productId);
    const balance = balanceMap.get(balanceKey(itemInput.locationId, itemInput.productId));
    const availableQty = computeAvailableQty(balance);
    const suggestedQty =
      itemInput.suggestedReorderQty ?? product?.default_reorder_qty ?? 10;

    const draftItem: ReorderDraftItem = {
      id: nextItemId++,
      draft_id: nextDraftId,
      product_id: itemInput.productId,
      location_id: itemInput.locationId,
      current_available_qty: availableQty,
      expected_inventory_version: balance?.version ?? 1,
      shortage_qty: itemInput.shortageQty ?? 0,
      suggested_reorder_qty: suggestedQty,
      supplier_name: product?.supplier_name ?? 'Unspecified Supplier',
    };
    return draftItem;
  });

  const nextAuditLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: user.id,
    actor_role: user.role,
    action_category: 'DRAFT_CREATED',
    action_name: 'prepare_reorder_draft',
    entity_type: 'reorder_drafts',
    entity_id: draftCode,
    details: `Created staging ${input.draftType} ${draftCode} (${newDraftItems.length} line items). No live inventory mutated.`,
  });

  const nextState: OperationsState = {
    ...state,
    reorderDrafts: [newDraft, ...state.reorderDrafts],
    reorderDraftItems: [...state.reorderDraftItems, ...newDraftItems],
    auditLogs: nextAuditLogs,
  };

  return {
    nextState,
    draft: newDraft,
    draftItems: newDraftItems,
  };
}

// ----------------------------------------------------------------------------
// Tool 5: verify_draft (Deterministic Validation & Version Gate)
// ----------------------------------------------------------------------------

export function verifyDraft(
  state: OperationsState,
  input: VerifyDraftInput,
): VerifyDraftResult {
  const existingDraft = state.reorderDrafts.find((d) => d.id === input.draftId);
  if (!existingDraft) {
    throw new Error(`Draft ID ${input.draftId} not found.`);
  }

  const actor =
    state.users.find((u) => u.id === (input.actorUserId ?? existingDraft.created_by_user_id)) ??
    state.users[0];

  const productMap = new Map(state.products.map((p) => [p.id, p]));
  const locationMap = new Map(state.locations.map((l) => [l.id, l]));
  const balanceMap = new Map(
    state.inventoryBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  const draftItems = state.reorderDraftItems.filter((item) => item.draft_id === existingDraft.id);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (draftItems.length === 0) {
    errors.push('Draft contains zero line items.');
  }

  if (!locationMap.has(existingDraft.target_location_id)) {
    errors.push(`Target location #${existingDraft.target_location_id} does not exist.`);
  }

  if (existingDraft.draft_type === 'STOCK_TRANSFER_DRAFT') {
    if (existingDraft.source_location_id == null) {
      errors.push('Stock transfer draft requires a valid source_location_id.');
    } else if (existingDraft.source_location_id === existingDraft.target_location_id) {
      errors.push('Transfer source and destination locations must differ.');
    } else if (!locationMap.has(existingDraft.source_location_id)) {
      errors.push(`Source location #${existingDraft.source_location_id} does not exist.`);
    }
  }

  let hasVersionConflict = false;

  for (const item of draftItems) {
    const product = productMap.get(item.product_id);
    if (!product) {
      errors.push(`Product #${item.product_id} does not exist in catalog.`);
      continue;
    }

    if (!Number.isFinite(item.suggested_reorder_qty) || item.suggested_reorder_qty <= 0) {
      errors.push(`${product.sku}: quantity must be greater than 0.`);
    }

    const balance = balanceMap.get(balanceKey(item.location_id, item.product_id));
    if (!balance) {
      errors.push(`${product.sku}: inventory balance record missing at location #${item.location_id}.`);
      continue;
    }

    if (balance.version !== item.expected_inventory_version) {
      hasVersionConflict = true;
      errors.push(
        `${product.sku}: optimistic lock version drift (expected v${item.expected_inventory_version}, live v${balance.version}).`,
      );
    }

    if (
      existingDraft.draft_type === 'STOCK_TRANSFER_DRAFT' &&
      existingDraft.source_location_id != null
    ) {
      const sourceBalance = balanceMap.get(
        balanceKey(existingDraft.source_location_id, item.product_id),
      );
      const sourceAvail = computeAvailableQty(sourceBalance);
      if (sourceAvail < item.suggested_reorder_qty) {
        errors.push(
          `${product.sku}: source location only has ${sourceAvail} ${product.unit} available (requested ${item.suggested_reorder_qty}).`,
        );
      }
    }

    if (existingDraft.draft_type === 'REORDER_DRAFT') {
      const targetAvail = computeAvailableQty(balance);
      if (targetAvail >= product.reorder_threshold && item.shortage_qty === 0) {
        warnings.push(
          `${product.sku}: live available stock (${targetAvail}) is already at or above reorder threshold (${product.reorder_threshold}).`,
        );
      }
      // Inform reviewer if another internal warehouse holds transferable surplus
      for (const loc of state.locations) {
        if (loc.id === item.location_id || loc.location_type !== 'WAREHOUSE') continue;
        const whAvail = computeAvailableQty(balanceMap.get(balanceKey(loc.id, item.product_id)));
        const surplus = whAvail - product.reorder_threshold;
        if (surplus >= Math.max(1, item.shortage_qty)) {
          warnings.push(
            `${loc.name} holds ${surplus} surplus ${product.unit} of ${product.sku}; internal stock transfer is viable.`,
          );
        }
      }
    }
  }

  const passed = errors.length === 0;
  const nextStatus: ReorderDraft['status'] = hasVersionConflict
    ? 'STALE_CONFLICT'
    : passed
      ? 'VERIFIED_PENDING_APPROVAL'
      : 'DRAFT';

  const updatedDraft: ReorderDraft = {
    ...existingDraft,
    status: nextStatus,
    verification_passed: passed,
    verification_warnings: passed ? warnings : [...errors, ...warnings],
  };

  const nextDrafts = state.reorderDrafts.map((d) =>
    d.id === updatedDraft.id ? updatedDraft : d,
  );

  const nextAuditLogs = appendAuditLog(state.auditLogs, {
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: hasVersionConflict ? 'CONFLICT_BLOCKED' : 'AGENT_TOOL_CALL',
    action_name: 'verify_draft',
    entity_type: 'reorder_drafts',
    entity_id: updatedDraft.draft_code,
    details: passed
      ? `Verification passed for ${updatedDraft.draft_code}. Status -> VERIFIED_PENDING_APPROVAL.`
      : `Verification failed for ${updatedDraft.draft_code}: ${errors.join(' ')}`,
  });

  return {
    nextState: {
      ...state,
      reorderDrafts: nextDrafts,
      auditLogs: nextAuditLogs,
    },
    draft: updatedDraft,
    passed,
    warnings,
    errors,
  };
}

// ----------------------------------------------------------------------------
// Human-Only Action: submit_approved_change (NEVER exposed to LLM tool schema)
// ----------------------------------------------------------------------------

export function submitApprovedChange(
  state: OperationsState,
  input: SubmitApprovedChangeInput,
): SubmitApprovedChangeResult {
  const actor = state.users.find((u) => u.id === input.actorUserId);
  const existingDraft = state.reorderDrafts.find((d) => d.id === input.draftId);

  if (!existingDraft) {
    return {
      nextState: state,
      draft: state.reorderDrafts[0],
      statusCode: 404,
      message: `Draft #${input.draftId} not found.`,
    };
  }

  // Strict RBAC Enforcement: EMPLOYEE cannot approve/commit or reject sensitive writes
  if (!actor || actor.role !== 'MANAGER') {
    const blockedLogs = appendAuditLog(state.auditLogs, {
      actor_user_id: actor?.id ?? input.actorUserId,
      actor_role: actor?.role ?? 'EMPLOYEE',
      action_category: 'CONFLICT_BLOCKED',
      action_name: 'submit_approved_change',
      entity_type: 'reorder_drafts',
      entity_id: existingDraft.draft_code,
      details: `403 RBAC Denial: Role ${actor?.role ?? 'UNKNOWN'} attempted Manager-only action submit_approved_change on ${existingDraft.draft_code}.`,
    });

    return {
      nextState: {
        ...state,
        auditLogs: blockedLogs,
      },
      draft: existingDraft,
      statusCode: 403,
      message:
        'Permission denied (403): Only an authenticated MANAGER can approve or commit operational changes.',
    };
  }

  const timestamp = nowIso();

  if (input.decision === 'REJECT') {
    const rejectedDraft: ReorderDraft = {
      ...existingDraft,
      status: 'REJECTED',
      reviewed_by_user_id: actor.id,
      reviewed_at: timestamp,
      verification_warnings: input.rejectionReason
        ? [...existingDraft.verification_warnings, `Rejected: ${input.rejectionReason}`]
        : existingDraft.verification_warnings,
    };

    const nextAuditLogs = appendAuditLog(state.auditLogs, {
      timestamp,
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'APPROVAL_REJECTED',
      action_name: 'submit_approved_change',
      entity_type: 'reorder_drafts',
      entity_id: rejectedDraft.draft_code,
      details: `Manager ${actor.full_name} rejected ${rejectedDraft.draft_code}${input.rejectionReason ? `: ${input.rejectionReason}` : '.'}`,
    });

    return {
      nextState: {
        ...state,
        reorderDrafts: state.reorderDrafts.map((d) =>
          d.id === rejectedDraft.id ? rejectedDraft : d,
        ),
        auditLogs: nextAuditLogs,
      },
      draft: rejectedDraft,
      statusCode: 200,
      message: `Draft ${rejectedDraft.draft_code} marked as REJECTED.`,
    };
  }

  // Approval requires verified draft
  if (
    existingDraft.status !== 'VERIFIED_PENDING_APPROVAL' &&
    existingDraft.status !== 'STALE_CONFLICT'
  ) {
    return {
      nextState: state,
      draft: existingDraft,
      statusCode: 422,
      message: `Draft ${existingDraft.draft_code} is in status ${existingDraft.status} and must pass verify_draft before approval commit.`,
    };
  }

  // Re-verify optimistic lock versions (TOCTOU Guard)
  const draftItems = state.reorderDraftItems.filter((item) => item.draft_id === existingDraft.id);
  const productMap = new Map(state.products.map((p) => [p.id, p]));
  const balanceMap = new Map(
    state.inventoryBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  const conflicts: NonNullable<SubmitApprovedChangeResult['conflictDetails']> = [];
  for (const item of draftItems) {
    const liveBalance = balanceMap.get(balanceKey(item.location_id, item.product_id));
    const actualVersion = liveBalance?.version ?? -1;
    if (actualVersion !== item.expected_inventory_version) {
      conflicts.push({
        productId: item.product_id,
        sku: productMap.get(item.product_id)?.sku ?? `SKU-${item.product_id}`,
        locationId: item.location_id,
        expectedVersion: item.expected_inventory_version,
        actualVersion,
      });
    }
  }

  if (conflicts.length > 0) {
    const conflictSummary = conflicts
      .map((c) => `${c.sku} (expected v${c.expectedVersion}, live v${c.actualVersion})`)
      .join('; ');

    const staleDraft: ReorderDraft = {
      ...existingDraft,
      status: 'STALE_CONFLICT',
      verification_passed: false,
      verification_warnings: [
        ...existingDraft.verification_warnings,
        `409 STALE_CONFLICT blocked commit at ${timestamp}: ${conflictSummary}`,
      ],
    };

    const nextAuditLogs = appendAuditLog(state.auditLogs, {
      timestamp,
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'CONFLICT_BLOCKED',
      action_name: 'submit_approved_change',
      entity_type: 'reorder_drafts',
      entity_id: staleDraft.draft_code,
      details: `409 STALE_CONFLICT: Inventory changed concurrently since draft creation (${conflictSummary}). Commit aborted safely.`,
    });

    return {
      nextState: {
        ...state,
        reorderDrafts: state.reorderDrafts.map((d) =>
          d.id === staleDraft.id ? staleDraft : d,
        ),
        auditLogs: nextAuditLogs,
      },
      draft: staleDraft,
      statusCode: 409,
      message: `409 STALE_CONFLICT: Concurrent stock update detected on ${conflictSummary}. Re-run feasibility or refresh draft snapshots before approving.`,
      conflictDetails: conflicts,
    };
  }

  // Commit state changes deterministically
  let nextBalances = state.inventoryBalances.map((b) => ({ ...b }));
  const updatedBalanceMap = new Map(
    nextBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  let nextMovementId = nextNumericId(state.stockMovements);
  const createdMovements: StockMovement[] = [];
  let nextTransfers = state.stockTransfers;
  let nextTransferItems = state.stockTransferItems;

  if (existingDraft.draft_type === 'REORDER_DRAFT') {
    for (const item of draftItems) {
      const balance = updatedBalanceMap.get(balanceKey(item.location_id, item.product_id));
      if (balance) {
        balance.quantity = Number((balance.quantity + item.suggested_reorder_qty).toFixed(3));
        balance.version += 1;
        balance.updated_at = timestamp;
      }

      createdMovements.push({
        id: nextMovementId++,
        location_id: item.location_id,
        product_id: item.product_id,
        movement_type: 'IN',
        quantity: item.suggested_reorder_qty,
        reference_type: 'REORDER_RECEIPT',
        reference_id: existingDraft.id,
        created_at: timestamp,
      });
    }
  } else if (
    existingDraft.draft_type === 'STOCK_TRANSFER_DRAFT' &&
    existingDraft.source_location_id != null
  ) {
    const nextTransferId = nextNumericId(state.stockTransfers);
    const transferNumber = formatCode('TRF-2026', 40 + nextTransferId, 4);

    const newTransfer: StockTransfer = {
      id: nextTransferId,
      transfer_number: transferNumber,
      source_location_id: existingDraft.source_location_id,
      destination_location_id: existingDraft.target_location_id,
      status: 'COMPLETED',
      transfer_date: timestamp.slice(0, 10),
      notes: `Committed via ${existingDraft.draft_code}: ${existingDraft.title}`,
      created_by_user_id: existingDraft.created_by_user_id,
      approved_by_user_id: actor.id,
      created_at: timestamp,
      completed_at: timestamp,
    };

    let nextTransferItemId = nextNumericId(state.stockTransferItems);
    const createdTransferItems: StockTransferItem[] = [];

    for (const item of draftItems) {
      const srcBalance = updatedBalanceMap.get(
        balanceKey(existingDraft.source_location_id, item.product_id),
      );
      const dstBalance = updatedBalanceMap.get(
        balanceKey(existingDraft.target_location_id, item.product_id),
      );

      if (srcBalance) {
        srcBalance.quantity = Math.max(
          0,
          Number((srcBalance.quantity - item.suggested_reorder_qty).toFixed(3)),
        );
        srcBalance.version += 1;
        srcBalance.updated_at = timestamp;
      }

      if (dstBalance) {
        dstBalance.quantity = Number(
          (dstBalance.quantity + item.suggested_reorder_qty).toFixed(3),
        );
        dstBalance.version += 1;
        dstBalance.updated_at = timestamp;
      }

      createdTransferItems.push({
        id: nextTransferItemId++,
        transfer_id: nextTransferId,
        product_id: item.product_id,
        quantity: item.suggested_reorder_qty,
      });

      createdMovements.push(
        {
          id: nextMovementId++,
          location_id: existingDraft.source_location_id,
          product_id: item.product_id,
          movement_type: 'OUT',
          quantity: item.suggested_reorder_qty,
          reference_type: 'STOCK_TRANSFER',
          reference_id: nextTransferId,
          created_at: timestamp,
        },
        {
          id: nextMovementId++,
          location_id: existingDraft.target_location_id,
          product_id: item.product_id,
          movement_type: 'IN',
          quantity: item.suggested_reorder_qty,
          reference_type: 'STOCK_TRANSFER',
          reference_id: nextTransferId,
          created_at: timestamp,
        },
      );
    }

    nextTransfers = [newTransfer, ...state.stockTransfers];
    nextTransferItems = [...state.stockTransferItems, ...createdTransferItems];
  } else if (existingDraft.draft_type === 'ORDER_FULFILLMENT_APPROVAL') {
    for (const item of draftItems) {
      const balance = updatedBalanceMap.get(balanceKey(item.location_id, item.product_id));
      if (balance) {
        balance.reserved_quantity = Number(
          (balance.reserved_quantity + item.suggested_reorder_qty).toFixed(3),
        );
        balance.version += 1;
        balance.updated_at = timestamp;
      }
    }
  }

  const approvedDraft: ReorderDraft = {
    ...existingDraft,
    status: 'APPROVED_COMMITTED',
    reviewed_by_user_id: actor.id,
    reviewed_at: timestamp,
  };

  const nextAuditLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'APPROVAL_COMMITTED',
    action_name: 'submit_approved_change',
    entity_type: 'reorder_drafts',
    entity_id: approvedDraft.draft_code,
    details: `Manager ${actor.full_name} approved & committed ${approvedDraft.draft_code} (${draftItems.length} items, ${createdMovements.length} stock movements recorded).`,
  });

  const nextAgentRuns =
    approvedDraft.created_by_agent_run_id != null
      ? state.agentRuns.map((run) =>
          run.id === approvedDraft.created_by_agent_run_id
            ? { ...run, status: 'COMPLETED' as const }
            : run,
        )
      : state.agentRuns;

  return {
    nextState: {
      ...state,
      inventoryBalances: nextBalances,
      stockMovements: [...createdMovements, ...state.stockMovements],
      stockTransfers: nextTransfers,
      stockTransferItems: nextTransferItems,
      reorderDrafts: state.reorderDrafts.map((d) =>
        d.id === approvedDraft.id ? approvedDraft : d,
      ),
      agentRuns: nextAgentRuns,
      auditLogs: nextAuditLogs,
    },
    draft: approvedDraft,
    statusCode: 200,
    message: `Approved & committed ${approvedDraft.draft_code}. Inventory balances and immutable audit log updated.`,
  };
}

// ----------------------------------------------------------------------------
// Human Review Helper: Edit Suggested Reorder Quantity Before Approval
// ----------------------------------------------------------------------------

export function updateDraftItemQuantity(
  state: OperationsState,
  draftId: number,
  draftItemId: number,
  newQuantity: number,
  actorUserId: number,
): OperationsState {
  const actor = state.users.find((u) => u.id === actorUserId) ?? state.users[0];
  const draft = state.reorderDrafts.find((d) => d.id === draftId);
  const item = state.reorderDraftItems.find(
    (i) => i.id === draftItemId && i.draft_id === draftId,
  );
  if (!draft || !item || !Number.isFinite(newQuantity) || newQuantity <= 0) {
    return state;
  }

  const product = state.products.find((p) => p.id === item.product_id);
  const nextItems = state.reorderDraftItems.map((i) =>
    i.id === draftItemId ? { ...i, suggested_reorder_qty: newQuantity } : i,
  );

  const nextLogs = appendAuditLog(state.auditLogs, {
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'DRAFT_EDITED',
    action_name: 'edit_draft_quantity',
    entity_type: 'reorder_drafts',
    entity_id: draft.draft_code,
    details: `Updated ${product?.sku ?? `Product #${item.product_id}`} quantity in ${draft.draft_code} from ${item.suggested_reorder_qty} to ${newQuantity}.`,
  });

  const editedState: OperationsState = {
    ...state,
    reorderDraftItems: nextItems,
    auditLogs: nextLogs,
  };

  return verifyDraft(editedState, { draftId, actorUserId: actor.id }).nextState;
}

// ----------------------------------------------------------------------------
// Concurrency / TOCTOU Simulator & Manual Stock Adjustment
// ----------------------------------------------------------------------------

export function simulateConcurrentStockUpdate(
  state: OperationsState,
  input: SimulateConcurrentStockUpdateInput,
): SimulateConcurrentStockUpdateResult {
  const actor = state.users.find((u) => u.id === input.actorUserId) ?? state.users[0];
  const product = state.products.find((p) => p.id === input.productId);
  const location = state.locations.find((l) => l.id === input.locationId);
  const timestamp = nowIso();

  let updatedBalance: InventoryBalance | undefined;
  const nextBalances = state.inventoryBalances.map((balance) => {
    if (balance.location_id === input.locationId && balance.product_id === input.productId) {
      const nextQty = Math.max(0, Number((balance.quantity + input.quantityDelta).toFixed(3)));
      const nextReserved = Math.min(balance.reserved_quantity, nextQty);
      updatedBalance = {
        ...balance,
        quantity: nextQty,
        reserved_quantity: nextReserved,
        version: balance.version + 1,
        updated_at: timestamp,
      };
      return updatedBalance;
    }
    return balance;
  });

  if (!updatedBalance) {
    throw new Error(
      `Inventory balance not found for location #${input.locationId}, product #${input.productId}.`,
    );
  }

  const nextMovement: StockMovement = {
    id: nextNumericId(state.stockMovements),
    location_id: input.locationId,
    product_id: input.productId,
    movement_type: 'ADJUSTMENT',
    quantity: input.quantityDelta,
    reference_type: 'MANUAL_ADJUSTMENT',
    reference_id: updatedBalance.version,
    created_at: timestamp,
  };

  const pendingDraftIds = new Set(
    state.reorderDrafts
      .filter((d) => d.status === 'VERIFIED_PENDING_APPROVAL' || d.status === 'DRAFT')
      .map((d) => d.id),
  );

  const affectedDraftIdSet = new Set(
    state.reorderDraftItems
      .filter(
        (item) =>
          pendingDraftIds.has(item.draft_id) &&
          item.location_id === input.locationId &&
          item.product_id === input.productId,
      )
      .map((item) => item.draft_id),
  );

  const affectedPendingDraftCodes = state.reorderDrafts
    .filter((d) => affectedDraftIdSet.has(d.id))
    .map((d) => d.draft_code);

  const reasonText =
    input.reason ?? 'Simulated concurrent POS / warehouse stock movement (TOCTOU test)';

  const nextLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'STOCK_TRANSFER',
    action_name: 'concurrent_stock_mutation',
    entity_type: 'inventory_balances',
    entity_id: `${location?.code ?? input.locationId}:${product?.sku ?? input.productId}`,
    details: `${reasonText}: ${input.quantityDelta >= 0 ? '+' : ''}${input.quantityDelta} units at ${location?.name ?? input.locationId}; version incremented to v${updatedBalance.version}.${affectedPendingDraftCodes.length > 0 ? ` Invalidated snapshot on ${affectedPendingDraftCodes.join(', ')}.` : ''}`,
  });

  return {
    nextState: {
      ...state,
      inventoryBalances: nextBalances,
      stockMovements: [nextMovement, ...state.stockMovements],
      auditLogs: nextLogs,
    },
    updatedBalance,
    affectedPendingDraftCodes,
  };
}

// ----------------------------------------------------------------------------
// Stock Transfer Lifecycle Progression (Phase 4 Support)
// ----------------------------------------------------------------------------

export function advanceStockTransferStatus(
  state: OperationsState,
  transferId: number,
  nextStatus: TransferStatus,
  actorUserId: number,
): { nextState: OperationsState; statusCode: 200 | 403 | 404 | 422; message: string } {
  const actor = state.users.find((u) => u.id === actorUserId);
  const transfer = state.stockTransfers.find((t) => t.id === transferId);

  if (!transfer) {
    return { nextState: state, statusCode: 404, message: `Transfer #${transferId} not found.` };
  }

  if (
    (nextStatus === 'APPROVED' || nextStatus === 'CANCELLED') &&
    (!actor || actor.role !== 'MANAGER')
  ) {
    const blockedLogs = appendAuditLog(state.auditLogs, {
      actor_user_id: actor?.id ?? actorUserId,
      actor_role: actor?.role ?? 'EMPLOYEE',
      action_category: 'CONFLICT_BLOCKED',
      action_name: 'advance_stock_transfer',
      entity_type: 'stock_transfers',
      entity_id: transfer.transfer_number,
      details: `403 RBAC Denial: ${actor?.role ?? 'UNKNOWN'} attempted to set transfer ${transfer.transfer_number} to ${nextStatus}.`,
    });
    return {
      nextState: { ...state, auditLogs: blockedLogs },
      statusCode: 403,
      message: 'Permission denied (403): Manager approval required for transfer authorization.',
    };
  }

  const timestamp = nowIso();
  const items = state.stockTransferItems.filter((i) => i.transfer_id === transfer.id);
  let nextBalances = state.inventoryBalances.map((b) => ({ ...b }));
  const balanceMap = new Map(
    nextBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  let nextMovementId = nextNumericId(state.stockMovements);
  const newMovements: StockMovement[] = [];

  if (nextStatus === 'IN_TRANSIT' && transfer.status === 'APPROVED') {
    for (const item of items) {
      const src = balanceMap.get(balanceKey(transfer.source_location_id, item.product_id));
      if (!src || computeAvailableQty(src) < item.quantity) {
        return {
          nextState: state,
          statusCode: 422,
          message: `Insufficient available stock at source location to dispatch ${transfer.transfer_number}.`,
        };
      }
      src.quantity = Number((src.quantity - item.quantity).toFixed(3));
      src.version += 1;
      src.updated_at = timestamp;
      newMovements.push({
        id: nextMovementId++,
        location_id: transfer.source_location_id,
        product_id: item.product_id,
        movement_type: 'OUT',
        quantity: item.quantity,
        reference_type: 'STOCK_TRANSFER',
        reference_id: transfer.id,
        created_at: timestamp,
      });
    }
  } else if (nextStatus === 'COMPLETED' && transfer.status === 'IN_TRANSIT') {
    for (const item of items) {
      const dst = balanceMap.get(balanceKey(transfer.destination_location_id, item.product_id));
      if (dst) {
        dst.quantity = Number((dst.quantity + item.quantity).toFixed(3));
        dst.version += 1;
        dst.updated_at = timestamp;
      }
      newMovements.push({
        id: nextMovementId++,
        location_id: transfer.destination_location_id,
        product_id: item.product_id,
        movement_type: 'IN',
        quantity: item.quantity,
        reference_type: 'STOCK_TRANSFER',
        reference_id: transfer.id,
        created_at: timestamp,
      });
    }
  }

  const updatedTransfer: StockTransfer = {
    ...transfer,
    status: nextStatus,
    approved_by_user_id:
      nextStatus === 'APPROVED' ? (actor?.id ?? transfer.approved_by_user_id) : transfer.approved_by_user_id,
    completed_at: nextStatus === 'COMPLETED' ? timestamp : transfer.completed_at,
  };

  const nextLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: actor?.id ?? actorUserId,
    actor_role: actor?.role ?? 'EMPLOYEE',
    action_category: 'STOCK_TRANSFER',
    action_name: 'advance_stock_transfer',
    entity_type: 'stock_transfers',
    entity_id: transfer.transfer_number,
    details: `Transitioned transfer ${transfer.transfer_number} from ${transfer.status} to ${nextStatus}.`,
  });

  return {
    nextState: {
      ...state,
      inventoryBalances: nextBalances,
      stockMovements: [...newMovements, ...state.stockMovements],
      stockTransfers: state.stockTransfers.map((t) =>
        t.id === transfer.id ? updatedTransfer : t,
      ),
      auditLogs: nextLogs,
    },
    statusCode: 200,
    message: `Transfer ${transfer.transfer_number} updated to ${nextStatus}.`,
  };
}

// ----------------------------------------------------------------------------
// Product Catalog Upsert & New Stock Transfer Creation (Phase 4 Support)
// ----------------------------------------------------------------------------

export function upsertProduct(
  state: OperationsState,
  input: UpsertProductInput,
): UpsertProductResult {
  const actor = state.users.find((u) => u.id === input.actorUserId) ?? state.users[0];
  const trimmedSku = input.sku.trim().toUpperCase();
  const trimmedName = input.name.trim();

  if (!trimmedSku || !trimmedName) {
    return {
      nextState: state,
      product: state.products[0],
      isNew: input.id == null,
      error: 'SKU and Product Name are required.',
    };
  }

  const duplicateSku = state.products.find(
    (p) => p.sku.toLowerCase() === trimmedSku.toLowerCase() && p.id !== input.id,
  );
  if (duplicateSku) {
    return {
      nextState: state,
      product: duplicateSku,
      isNew: input.id == null,
      error: `SKU "${trimmedSku}" already exists in catalog.`,
    };
  }

  const timestamp = nowIso();

  if (input.id != null) {
    const existing = state.products.find((p) => p.id === input.id);
    if (!existing) {
      return {
        nextState: state,
        product: state.products[0],
        isNew: false,
        error: `Product #${input.id} not found.`,
      };
    }

    const updatedProduct: Product = {
      ...existing,
      category_id: input.category_id,
      sku: trimmedSku,
      name: trimmedName,
      description: input.description.trim(),
      unit: input.unit.trim() || 'pcs',
      reorder_threshold: Math.max(0, input.reorder_threshold),
      default_reorder_qty: Math.max(1, input.default_reorder_qty),
      unit_cost_jod: Math.max(0, input.unit_cost_jod),
      supplier_name: input.supplier_name.trim() || 'Unspecified Supplier',
    };

    const nextLogs = appendAuditLog(state.auditLogs, {
      timestamp,
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'DRAFT_EDITED',
      action_name: 'update_product',
      entity_type: 'products',
      entity_id: updatedProduct.sku,
      details: `Updated product ${updatedProduct.sku} (${updatedProduct.name}), threshold=${updatedProduct.reorder_threshold}, cost=${updatedProduct.unit_cost_jod} JOD.`,
    });

    return {
      nextState: {
        ...state,
        products: state.products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
        auditLogs: nextLogs,
      },
      product: updatedProduct,
      isNew: false,
    };
  }

  const newProductId = nextNumericId(state.products);
  const createdProduct: Product = {
    id: newProductId,
    category_id: input.category_id,
    sku: trimmedSku,
    name: trimmedName,
    description: input.description.trim(),
    unit: input.unit.trim() || 'pcs',
    reorder_threshold: Math.max(0, input.reorder_threshold),
    default_reorder_qty: Math.max(1, input.default_reorder_qty),
    unit_cost_jod: Math.max(0, input.unit_cost_jod),
    supplier_name: input.supplier_name.trim() || 'Unspecified Supplier',
    created_at: timestamp,
  };

  const newBalances: InventoryBalance[] = state.locations.map((loc) => ({
    location_id: loc.id,
    product_id: newProductId,
    quantity: Math.max(0, input.initialQuantitiesByLocationId?.[loc.id] ?? 0),
    reserved_quantity: 0,
    version: 1,
    updated_at: timestamp,
  }));

  const nextLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'DRAFT_CREATED',
    action_name: 'create_product',
    entity_type: 'products',
    entity_id: createdProduct.sku,
    details: `Added catalog SKU ${createdProduct.sku} (${createdProduct.name}) across ${state.locations.length} locations.`,
  });

  return {
    nextState: {
      ...state,
      products: [...state.products, createdProduct],
      inventoryBalances: [...state.inventoryBalances, ...newBalances],
      auditLogs: nextLogs,
    },
    product: createdProduct,
    isNew: true,
  };
}

export function createStockTransferDraft(
  state: OperationsState,
  input: CreateStockTransferInput,
): CreateStockTransferResult {
  const actor = state.users.find((u) => u.id === input.actorUserId) ?? state.users[0];

  if (input.sourceLocationId === input.destinationLocationId) {
    return {
      nextState: state,
      transfer: null,
      error: 'Source and destination locations must be different.',
    };
  }

  const validItems = input.items.filter((i) => Number.isFinite(i.quantity) && i.quantity > 0);
  if (validItems.length === 0) {
    return {
      nextState: state,
      transfer: null,
      error: 'At least one item with a positive transfer quantity is required.',
    };
  }

  const timestamp = nowIso();
  const nextTransferId = nextNumericId(state.stockTransfers);
  const transferNumber = formatCode('TRF-2026', 40 + nextTransferId, 4);

  const newTransfer: StockTransfer = {
    id: nextTransferId,
    transfer_number: transferNumber,
    source_location_id: input.sourceLocationId,
    destination_location_id: input.destinationLocationId,
    status: 'DRAFT',
    transfer_date: input.transferDate || timestamp.slice(0, 10),
    notes: input.notes.trim() || 'Inter-location stock transfer request.',
    created_by_user_id: actor.id,
    approved_by_user_id: null,
    created_at: timestamp,
    completed_at: null,
  };

  let nextItemId = nextNumericId(state.stockTransferItems);
  const newItems: StockTransferItem[] = validItems.map((item) => ({
    id: nextItemId++,
    transfer_id: nextTransferId,
    product_id: item.productId,
    quantity: item.quantity,
  }));

  const srcName =
    state.locations.find((l) => l.id === input.sourceLocationId)?.name ??
    `Location #${input.sourceLocationId}`;
  const dstName =
    state.locations.find((l) => l.id === input.destinationLocationId)?.name ??
    `Location #${input.destinationLocationId}`;

  const nextLogs = appendAuditLog(state.auditLogs, {
    timestamp,
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'STOCK_TRANSFER',
    action_name: 'create_stock_transfer',
    entity_type: 'stock_transfers',
    entity_id: transferNumber,
    details: `Created DRAFT transfer ${transferNumber} (${srcName} → ${dstName}, ${newItems.length} item${newItems.length === 1 ? '' : 's'}).`,
  });

  return {
    nextState: {
      ...state,
      stockTransfers: [newTransfer, ...state.stockTransfers],
      stockTransferItems: [...state.stockTransferItems, ...newItems],
      auditLogs: nextLogs,
    },
    transfer: newTransfer,
  };
}

// ----------------------------------------------------------------------------
// Phase 5: Bounded AI Operations Orchestrator (MAX_STEPS = 5) & Snapshot Refresh
// ----------------------------------------------------------------------------

const MAX_AGENT_STEPS = 5;

const PRODUCT_PHRASE_TRIGGERS: Array<{ keyword: string; query: string }> = [
  { keyword: 'thermal paper', query: 'thermal paper' },
  { keyword: 'thermal roll', query: 'thermal rolls' },
  { keyword: 'thermal printer', query: 'printer' },
  { keyword: 'thermal', query: 'thermal' },
  { keyword: 'cat6 utp', query: 'Cat6 UTP Patch Cable 5m' },
  { keyword: 'cat6 sftp', query: 'Cat6 SFTP Shielded Cable 5m' },
  { keyword: 'cat6', query: 'cat6' },
  { keyword: 'barcode scanner', query: 'scanner' },
  { keyword: 'scanner', query: 'scanner' },
  { keyword: 'printer', query: 'printer' },
  { keyword: 'switch', query: 'switch' },
  { keyword: 'nvme', query: 'ssd' },
  { keyword: 'ssd', query: 'ssd' },
  { keyword: 'carton', query: 'carton' },
  { keyword: 'tape', query: 'tape' },
  { keyword: 'keyboard', query: 'keyboard' },
  { keyword: 'mouse', query: 'mouse' },
  { keyword: 'flash drive', query: 'flash' },
];

function inferLocationFromPrompt(
  prompt: string,
  explicitLocationId: number | null | undefined,
): number | null {
  if (explicitLocationId != null) return explicitLocationId;
  const lower = prompt.toLowerCase();
  if (lower.includes('abdali')) return 2;
  if (lower.includes('irbid')) return 3;
  if (lower.includes('amman') && !lower.includes('transfer') && !lower.includes('covered by')) {
    return 1;
  }
  return null;
}

function detectExplicitProductSearch(
  prompt: string,
  products: Product[],
): string | null {
  const lower = prompt.toLowerCase();
  const skuMatch = products.find((p) => lower.includes(p.sku.toLowerCase()));
  if (skuMatch) return skuMatch.sku;

  const exactNameMatch = products.find((p) => lower.includes(p.name.toLowerCase()));
  if (exactNameMatch) return exactNameMatch.name;

  // Batch order/shortage prompts should not trigger single-SKU ambiguity
  const isBatchPrompt =
    lower.includes('pending order') ||
    lower.includes('high-priority') ||
    lower.includes('high priority') ||
    lower.includes('order shortage') ||
    lower.includes('cumulative');
  if (isBatchPrompt && !lower.includes('thermal') && !lower.includes('cat6')) {
    return null;
  }

  for (const trigger of PRODUCT_PHRASE_TRIGGERS) {
    if (lower.includes(trigger.keyword)) {
      return trigger.query;
    }
  }
  return null;
}

function extractRequestedQuantity(prompt: string): number | null {
  const stripped = prompt
    .replace(/\b\d+\s*(?:mm|cm|m|tb|gb|port|pack)\b/gi, ' ')
    .replace(/\bcat\d+[a-z]*\b/gi, ' ')
    .replace(/\busb\s*\d+(?:\.\d+)?\b/gi, ' ')
    .replace(/\bORD-\d{4}-\d+\b/gi, ' ');

  const unitMatch = stripped.match(
    /\b(\d+)\s*(?:units?|pcs|rolls?|packs?|boxes?|of\b)/i,
  );
  if (unitMatch) {
    const val = Number(unitMatch[1]);
    return Number.isFinite(val) && val > 0 ? val : null;
  }

  const plainNumberMatch = stripped.match(/\b(\d+)\b/);
  if (plainNumberMatch) {
    const val = Number(plainNumberMatch[1]);
    return Number.isFinite(val) && val > 0 ? val : null;
  }

  return null;
}

function toCandidateSummary(
  state: OperationsState,
  product: Product,
  locationId: number,
): AmbiguityCandidate {
  const balance = state.inventoryBalances.find(
    (b) => b.location_id === locationId && b.product_id === product.id,
  );
  return {
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    availableQty: computeAvailableQty(balance),
    reorderThreshold: product.reorder_threshold,
    defaultReorderQty: product.default_reorder_qty,
  };
}

export function executeBoundedAgentRun(
  state: OperationsState,
  input: ExecuteBoundedAgentRunInput,
): ExecuteBoundedAgentRunResult {
  const actor = state.users.find((u) => u.id === input.actorUserId) ?? state.users[0];
  const prompt = input.prompt.trim() || "Review today's pending orders and prepare a reorder draft.";
  const lower = prompt.toLowerCase();

  const nextRunId = nextNumericId(state.agentRuns);
  const runCode = formatCode('RUN-2026', 311 + nextRunId, 4);
  const locationId = inferLocationFromPrompt(prompt, input.locationId);
  const priorityFilter: OrderPriority | 'ALL' =
    lower.includes('high-priority') || lower.includes('high priority') ? 'HIGH' : 'ALL';
  const preferTransfer =
    input.preferTransfer === true ||
    lower.includes('transfer') ||
    lower.includes('warehouse stock') ||
    lower.includes('covered by');

  let workingState = state;
  let nextStepId = nextNumericId(state.agentSteps);
  const steps: AgentStep[] = [];
  let totalLatencyMs = 0;

  const pushStep = (
    stageLabel: AgentStep['stage_label'],
    toolName: AgentStep['tool_name'],
    toolInput: unknown,
    outputSummary: string,
    verificationStatus: AgentStep['verification_status'],
    latencyMs: number,
  ) => {
    totalLatencyMs += latencyMs;
    steps.push({
      id: nextStepId++,
      run_id: nextRunId,
      step_number: steps.length + 1,
      stage_label: stageLabel,
      tool_name: toolName,
      tool_input_json: JSON.stringify(toolInput),
      tool_output_summary: outputSummary,
      verification_status: verificationStatus,
      latency_ms: latencyMs,
      timestamp: nowIso(),
    });
  };

  // Step 1: list_pending_orders
  const pendingRes = listPendingOrders(workingState, {
    locationId,
    priority: priorityFilter,
  });
  pushStep(
    'INTERPRET_REQUEST',
    'list_pending_orders',
    { locationId, priority: priorityFilter },
    `Retrieved ${pendingRes.totalCount} pending order${pendingRes.totalCount === 1 ? '' : 's'}${locationId != null ? ` at location #${locationId}` : ' across all locations'}.`,
    'VERIFIED',
    112,
  );
  workingState = {
    ...workingState,
    auditLogs: appendAuditLog(workingState.auditLogs, {
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'AGENT_TOOL_CALL',
      action_name: 'list_pending_orders',
      entity_type: 'agent_runs',
      entity_id: runCode,
      details: `Step 1/5 (${runCode}): Read ${pendingRes.totalCount} pending orders.`,
    }),
  };

  // Step 2: get_inventory_status (with Ambiguity & Missing Quantity Clarification Gates)
  const detectedQuery =
    input.selectedProductId != null
      ? null
      : detectExplicitProductSearch(prompt, workingState.products);
  const effectiveLocationForLookup = locationId ?? 2;

  const invRes =
    input.selectedProductId != null
      ? getInventoryStatus(workingState, {
          locationId: effectiveLocationForLookup,
          productIds: [input.selectedProductId],
        })
      : detectedQuery != null
        ? getInventoryStatus(workingState, {
            locationId: effectiveLocationForLookup,
            searchQuery: detectedQuery,
          })
        : getInventoryStatus(workingState, {
            locationId,
            lowStockOnly: true,
          });

  if (invRes.ambiguousMatch && input.selectedProductId == null) {
    const candidates = invRes.matchedProducts.map((p) =>
      toCandidateSummary(workingState, p, effectiveLocationForLookup),
    );
    const question =
      invRes.ambiguityReason ??
      `Multiple SKUs matched "${detectedQuery ?? prompt}". Select the exact SKU to proceed.`;

    pushStep(
      'RETRIEVE_DATA',
      'get_inventory_status',
      { locationId: effectiveLocationForLookup, searchQuery: detectedQuery },
      `AMBIGUOUS_MATCH: ${candidates.map((c) => c.sku).join(', ')} matched "${detectedQuery}". Halted for human clarification.`,
      'WARNING',
      138,
    );

    const pausedRun: AgentRun = {
      id: nextRunId,
      run_code: runCode,
      user_id: actor.id,
      user_prompt: prompt,
      status: 'AWAITING_CLARIFICATION',
      step_count: steps.length,
      max_steps: MAX_AGENT_STEPS,
      generated_draft_id: null,
      clarification_question: question,
      final_summary: `Paused at Step ${steps.length}/${MAX_AGENT_STEPS}: ${question}`,
      total_latency_ms: totalLatencyMs,
      created_at: nowIso(),
    };

    const nextLogs = appendAuditLog(workingState.auditLogs, {
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'AGENT_TOOL_CALL',
      action_name: 'get_inventory_status',
      entity_type: 'agent_runs',
      entity_id: runCode,
      details: `Step 2/5 (${runCode}): AMBIGUOUS_MATCH detected (${candidates.map((c) => c.sku).join(', ')}); awaiting human clarification.`,
    });

    return {
      nextState: {
        ...workingState,
        agentRuns: [pausedRun, ...workingState.agentRuns],
        agentSteps: [...workingState.agentSteps, ...steps],
        auditLogs: nextLogs,
      },
      run: pausedRun,
      steps,
      draft: null,
      draftItems: [],
      ambiguityCandidates: candidates,
      missingQuantityProduct: null,
    };
  }

  const resolvedProduct =
    input.selectedProductId != null
      ? workingState.products.find((p) => p.id === input.selectedProductId) ?? null
      : detectedQuery != null && invRes.matchedProducts.length === 1
        ? invRes.matchedProducts[0]
        : null;

  const extractedQty = input.overrideQuantity ?? extractRequestedQuantity(prompt);
  if (
    resolvedProduct != null &&
    extractedQty == null &&
    (lower.includes('draft') || lower.includes('reorder') || lower.includes('urgent'))
  ) {
    const candidate = toCandidateSummary(
      workingState,
      resolvedProduct,
      effectiveLocationForLookup,
    );
    const question = `No reorder quantity specified for ${resolvedProduct.sku} (${resolvedProduct.name}). Confirm whether to use the default supplier lot (${resolvedProduct.default_reorder_qty} ${resolvedProduct.unit}) or specify an amount.`;

    pushStep(
      'RETRIEVE_DATA',
      'get_inventory_status',
      { locationId: effectiveLocationForLookup, productIds: [resolvedProduct.id] },
      `Matched ${resolvedProduct.sku} (avail ${candidate.availableQty} ${resolvedProduct.unit}), but reorder quantity is unspecified. Requesting confirmation.`,
      'WARNING',
      129,
    );

    const pausedRun: AgentRun = {
      id: nextRunId,
      run_code: runCode,
      user_id: actor.id,
      user_prompt: prompt,
      status: 'AWAITING_CLARIFICATION',
      step_count: steps.length,
      max_steps: MAX_AGENT_STEPS,
      generated_draft_id: null,
      clarification_question: question,
      final_summary: `Paused at Step ${steps.length}/${MAX_AGENT_STEPS}: ${question}`,
      total_latency_ms: totalLatencyMs,
      created_at: nowIso(),
    };

    const nextLogs = appendAuditLog(workingState.auditLogs, {
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'AGENT_TOOL_CALL',
      action_name: 'get_inventory_status',
      entity_type: 'agent_runs',
      entity_id: runCode,
      details: `Step 2/5 (${runCode}): Missing reorder quantity for ${resolvedProduct.sku}; awaiting human confirmation.`,
    });

    return {
      nextState: {
        ...workingState,
        agentRuns: [pausedRun, ...workingState.agentRuns],
        agentSteps: [...workingState.agentSteps, ...steps],
        auditLogs: nextLogs,
      },
      run: pausedRun,
      steps,
      draft: null,
      draftItems: [],
      ambiguityCandidates: [],
      missingQuantityProduct: candidate,
    };
  }

  pushStep(
    'RETRIEVE_DATA',
    'get_inventory_status',
    resolvedProduct
      ? { locationId: effectiveLocationForLookup, productIds: [resolvedProduct.id] }
      : { locationId, lowStockOnly: true },
    resolvedProduct
      ? `Resolved ${resolvedProduct.sku} (${resolvedProduct.name}) across ${invRes.balances.length} location row.`
      : `Inspected ${invRes.balances.length} low/out-of-stock inventory rows.`,
    'VERIFIED',
    134,
  );

  // Step 3: check_order_feasibility (Cumulative FIFO)
  const feasibilityRes = checkOrderFeasibility(workingState, {
    locationId,
    priorityFilter,
    mode: 'CUMULATIVE',
  });
  const shortedSummaries = feasibilityRes.skuSummaries.filter(
    (s) => s.totalShortageQty > 0,
  );
  pushStep(
    'ASSESS_FEASIBILITY',
    'check_order_feasibility',
    { locationId, priorityFilter, mode: 'CUMULATIVE' },
    `Evaluated ${feasibilityRes.evaluatedOrders.length} orders: ${feasibilityRes.fullCount} FULL, ${feasibilityRes.partialCount} PARTIAL, ${feasibilityRes.unavailableCount} UNAVAILABLE (${shortedSummaries.length} shorted SKU entries).`,
    shortedSummaries.length > 0 ? 'WARNING' : 'VERIFIED',
    194,
  );
  workingState = {
    ...workingState,
    auditLogs: appendAuditLog(workingState.auditLogs, {
      actor_user_id: actor.id,
      actor_role: actor.role,
      action_category: 'AGENT_TOOL_CALL',
      action_name: 'check_order_feasibility',
      entity_type: 'agent_runs',
      entity_id: runCode,
      details: `Step 3/5 (${runCode}): Cumulative FIFO check found ${shortedSummaries.length} shorted SKU entries across ${feasibilityRes.evaluatedOrders.length} orders.`,
    }),
  };

  // Step 4: prepare_reorder_draft (either REORDER_DRAFT or STOCK_TRANSFER_DRAFT)
  const draftTargetLocationId =
    locationId ?? shortedSummaries[0]?.locationId ?? effectiveLocationForLookup;

  let draftInput: PrepareReorderDraftInput;

  if (resolvedProduct != null) {
    const qty = extractedQty ?? resolvedProduct.default_reorder_qty;
    draftInput = {
      draftType: 'REORDER_DRAFT',
      title: `${resolvedProduct.sku} Replenishment (${workingState.locations.find((l) => l.id === effectiveLocationForLookup)?.name ?? `Location #${effectiveLocationForLookup}`})`,
      targetLocationId: effectiveLocationForLookup,
      items: [
        {
          productId: resolvedProduct.id,
          locationId: effectiveLocationForLookup,
          suggestedReorderQty: qty,
          shortageQty:
            shortedSummaries.find(
              (s) =>
                s.productId === resolvedProduct.id &&
                s.locationId === effectiveLocationForLookup,
            )?.totalShortageQty ?? 0,
        },
      ],
      rationale: `Targeted replenishment for ${resolvedProduct.sku} (${resolvedProduct.name}) requested by ${actor.full_name}.`,
      createdByUserId: actor.id,
      createdByAgentRunId: nextRunId,
    };
  } else if (preferTransfer) {
    const transferEligible = shortedSummaries.filter(
      (s) => s.locationId === draftTargetLocationId && s.transferCoverageOptions.length > 0,
    );
    const primarySourceId =
      transferEligible[0]?.transferCoverageOptions[0]?.sourceLocationId ?? 1;

    const transferItems: PrepareReorderDraftItemInput[] = transferEligible
      .filter((s) =>
        s.transferCoverageOptions.some((opt) => opt.sourceLocationId === primarySourceId),
      )
      .map((s) => {
        const opt = s.transferCoverageOptions.find(
          (o) => o.sourceLocationId === primarySourceId,
        )!;
        return {
          productId: s.productId,
          locationId: s.locationId,
          shortageQty: s.totalShortageQty,
          suggestedReorderQty: Math.max(
            1,
            Math.min(s.totalShortageQty, opt.transferableSurplusQty),
          ),
        };
      });

    if (transferItems.length > 0) {
      const srcName =
        workingState.locations.find((l) => l.id === primarySourceId)?.name ??
        `Location #${primarySourceId}`;
      const dstName =
        workingState.locations.find((l) => l.id === draftTargetLocationId)?.name ??
        `Location #${draftTargetLocationId}`;
      draftInput = {
        draftType: 'STOCK_TRANSFER_DRAFT',
        title: `Internal Stock Transfer: ${srcName} → ${dstName}`,
        targetLocationId: draftTargetLocationId,
        sourceLocationId: primarySourceId,
        relatedOrderIds: feasibilityRes.evaluatedOrders
          .filter((o) => o.feasibility !== 'FULL')
          .map((o) => o.order.id),
        items: transferItems,
        rationale: `Covers ${transferItems.length} shorted SKU${transferItems.length === 1 ? '' : 's'} at ${dstName} using transferable surplus from ${srcName}.`,
        createdByUserId: actor.id,
        createdByAgentRunId: nextRunId,
      };
    } else {
      const fallbackItems: PrepareReorderDraftItemInput[] = shortedSummaries
        .slice(0, 4)
        .map((s) => ({
          productId: s.productId,
          locationId: s.locationId,
          shortageQty: s.totalShortageQty,
          suggestedReorderQty: s.recommendedReorderQty,
        }));
      draftInput = {
        draftType: 'REORDER_DRAFT',
        title: 'Shortage Supplier Reorder Draft (No Surplus Transfer Available)',
        targetLocationId: draftTargetLocationId,
        relatedOrderIds: feasibilityRes.evaluatedOrders
          .filter((o) => o.feasibility !== 'FULL')
          .map((o) => o.order.id),
        items: fallbackItems,
        rationale: 'No internal warehouse surplus met shortage criteria; staged supplier reorder draft instead.',
        createdByUserId: actor.id,
        createdByAgentRunId: nextRunId,
      };
    }
  } else {
    const scopedShortages = shortedSummaries.filter(
      (s) => locationId == null || s.locationId === locationId,
    );
    const itemsToStage: PrepareReorderDraftItemInput[] = (
      scopedShortages.length > 0
        ? scopedShortages.slice(0, 5).map((s) => ({
            productId: s.productId,
            locationId: s.locationId,
            shortageQty: s.totalShortageQty,
            suggestedReorderQty: s.recommendedReorderQty,
          }))
        : invRes.balances.slice(0, 3).map((b) => ({
            productId: b.productId,
            locationId: b.locationId,
            shortageQty: 0,
            suggestedReorderQty: b.default_reorder_qty,
          }))
    );

    const locName =
      locationId != null
        ? (workingState.locations.find((l) => l.id === locationId)?.name ??
          `Location #${locationId}`)
        : 'Multi-Location Priority Queue';

    draftInput = {
      draftType: 'REORDER_DRAFT',
      title: `${locName} Cumulative Shortage Replenishment`,
      targetLocationId: draftTargetLocationId,
      relatedOrderIds: feasibilityRes.evaluatedOrders
        .filter((o) => o.feasibility !== 'FULL')
        .map((o) => o.order.id),
      items: itemsToStage,
      rationale: `Cumulative FIFO evaluation identified ${scopedShortages.length} shorted SKU entries requiring supplier replenishment.`,
      createdByUserId: actor.id,
      createdByAgentRunId: nextRunId,
    };
  }

  const preparedRes = prepareReorderDraft(workingState, draftInput);
  workingState = preparedRes.nextState;

  pushStep(
    'PREPARE_DRAFT',
    'prepare_reorder_draft',
    {
      draftType: draftInput.draftType,
      targetLocationId: draftInput.targetLocationId,
      sourceLocationId: draftInput.sourceLocationId ?? null,
      itemCount: draftInput.items.length,
    },
    `Created staging ${draftInput.draftType} ${preparedRes.draft.draft_code} with ${preparedRes.draftItems.length} item${preparedRes.draftItems.length === 1 ? '' : 's'} and version snapshots.`,
    'VERIFIED',
    182,
  );

  // Step 5: verify_draft
  const verifyRes = verifyDraft(workingState, {
    draftId: preparedRes.draft.id,
    actorUserId: actor.id,
  });
  workingState = verifyRes.nextState;

  pushStep(
    'VERIFY_AND_REPORT',
    'verify_draft',
    { draftId: verifyRes.draft.id },
    verifyRes.passed
      ? `Deterministic checks passed for ${verifyRes.draft.draft_code}. Status -> VERIFIED_PENDING_APPROVAL.`
      : `Verification flagged errors on ${verifyRes.draft.draft_code}: ${verifyRes.errors.join(' ')}`,
    verifyRes.passed ? 'VERIFIED' : 'ERROR',
    154,
  );

  const completedRun: AgentRun = {
    id: nextRunId,
    run_code: runCode,
    user_id: actor.id,
    user_prompt: prompt,
    status: 'AWAITING_APPROVAL',
    step_count: steps.length,
    max_steps: MAX_AGENT_STEPS,
    generated_draft_id: verifyRes.draft.id,
    clarification_question: null,
    final_summary: `Completed ${steps.length}/${MAX_AGENT_STEPS} bounded steps. Generated ${verifyRes.draft.draft_type} ${verifyRes.draft.draft_code} (${preparedRes.draftItems.length} items) — ${verifyRes.draft.status}.`,
    total_latency_ms: totalLatencyMs,
    created_at: nowIso(),
  };

  return {
    nextState: {
      ...workingState,
      agentRuns: [completedRun, ...workingState.agentRuns],
      agentSteps: [...workingState.agentSteps, ...steps],
    },
    run: completedRun,
    steps,
    draft: verifyRes.draft,
    draftItems: preparedRes.draftItems,
    ambiguityCandidates: [],
    missingQuantityProduct: null,
  };
}

export function refreshDraftVersionSnapshots(
  state: OperationsState,
  draftId: number,
  actorUserId: number,
): VerifyDraftResult {
  const actor = state.users.find((u) => u.id === actorUserId) ?? state.users[0];
  const draft = state.reorderDrafts.find((d) => d.id === draftId);
  if (!draft) {
    throw new Error(`Draft ID ${draftId} not found.`);
  }

  const balanceMap = new Map(
    state.inventoryBalances.map((b) => [balanceKey(b.location_id, b.product_id), b]),
  );

  const nextDraftItems = state.reorderDraftItems.map((item) => {
    if (item.draft_id !== draftId) return item;
    const liveBalance = balanceMap.get(balanceKey(item.location_id, item.product_id));
    return {
      ...item,
      current_available_qty: computeAvailableQty(liveBalance),
      expected_inventory_version: liveBalance?.version ?? item.expected_inventory_version,
    };
  });

  const nextLogs = appendAuditLog(state.auditLogs, {
    actor_user_id: actor.id,
    actor_role: actor.role,
    action_category: 'DRAFT_EDITED',
    action_name: 'refresh_draft_snapshot',
    entity_type: 'reorder_drafts',
    entity_id: draft.draft_code,
    details: `Refreshed optimistic lock version snapshots on ${draft.draft_code} to match live inventory_balances before re-verification.`,
  });

  return verifyDraft(
    {
      ...state,
      reorderDraftItems: nextDraftItems,
      auditLogs: nextLogs,
    },
    { draftId, actorUserId: actor.id },
  );
}
