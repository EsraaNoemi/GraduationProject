// ============================================================================
// AI Operations Agent — Unified Domain Model (ERD-v1.dbml + v2 Extensions)
// Reference: documentation/01-ARCHITECTURE-AND-SCHEMA.md
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Enumerations
// ----------------------------------------------------------------------------

export type LocationType = 'BRANCH' | 'WAREHOUSE';

export type TransferStatus =
  | 'DRAFT'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type ReferenceType =
  | 'ORDER_FULFILLMENT'
  | 'STOCK_TRANSFER'
  | 'REORDER_RECEIPT'
  | 'MANUAL_ADJUSTMENT';

export type UserRole = 'EMPLOYEE' | 'MANAGER';

export type OrderStatus =
  | 'PENDING'
  | 'READY_TO_FULFILL'
  | 'PARTIAL_SHORTAGE'
  | 'BLOCKED_SHORTAGE'
  | 'APPROVED_FOR_FULFILLMENT'
  | 'FULFILLED'
  | 'CANCELLED';

export type OrderPriority = 'HIGH' | 'NORMAL' | 'LOW';

export type FeasibilityStatus = 'FULL' | 'PARTIAL' | 'UNAVAILABLE';

export type DraftType =
  | 'REORDER_DRAFT'
  | 'ORDER_FULFILLMENT_APPROVAL'
  | 'STOCK_TRANSFER_DRAFT';

export type DraftStatus =
  | 'DRAFT'
  | 'VERIFIED_PENDING_APPROVAL'
  | 'APPROVED_COMMITTED'
  | 'REJECTED'
  | 'STALE_CONFLICT';

export type AgentRunStatus =
  | 'RUNNING'
  | 'AWAITING_CLARIFICATION'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED';

export type AgentStageLabel =
  | 'INTERPRET_REQUEST'
  | 'RETRIEVE_DATA'
  | 'ASSESS_FEASIBILITY'
  | 'PREPARE_DRAFT'
  | 'VERIFY_AND_REPORT';

export type AgentToolName =
  | 'list_pending_orders'
  | 'get_inventory_status'
  | 'check_order_feasibility'
  | 'prepare_reorder_draft'
  | 'verify_draft';

export type VerificationStatus = 'VERIFIED' | 'WARNING' | 'ERROR';

export type AuditActionCategory =
  | 'AGENT_TOOL_CALL'
  | 'DRAFT_CREATED'
  | 'DRAFT_EDITED'
  | 'APPROVAL_COMMITTED'
  | 'APPROVAL_REJECTED'
  | 'CONFLICT_BLOCKED'
  | 'STOCK_TRANSFER';

// ----------------------------------------------------------------------------
// 2. Core Inventory & Multi-Location Entities (ERD-v1.dbml Baseline)
// ----------------------------------------------------------------------------

export interface Branch {
  id: number;
  name: string;
  address: string;
  created_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  address: string;
  created_at: string;
}

export interface InventoryLocation {
  id: number;
  code: string; // e.g., "LOC-1"
  name: string;
  location_type: LocationType;
  branch_id: number | null;
  warehouse_id: number | null;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description: string;
  unit: string;
  reorder_threshold: number;
  default_reorder_qty: number;
  unit_cost_jod: number;
  supplier_name: string;
  created_at: string;
}

export interface InventoryBalance {
  location_id: number;
  product_id: number;
  quantity: number;
  reserved_quantity: number;
  version: number;
  updated_at: string;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  source_location_id: number;
  destination_location_id: number;
  status: TransferStatus;
  transfer_date: string;
  notes: string;
  created_by_user_id: number;
  approved_by_user_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface StockTransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  quantity: number;
}

export interface StockMovement {
  id: number;
  location_id: number;
  product_id: number;
  movement_type: MovementType;
  quantity: number;
  reference_type: ReferenceType;
  reference_id: number;
  created_at: string;
}

// ----------------------------------------------------------------------------
// 3. v2 Operational, Order, Draft & Agent Entities
// ----------------------------------------------------------------------------

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  assigned_location_id: number;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  fulfillment_location_id: number;
  status: OrderStatus;
  priority: OrderPriority;
  requested_delivery_date: string;
  notes: string;
  version: number;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  requested_quantity: number;
  allocated_quantity: number;
  shortage_quantity: number;
}

export interface ReorderDraft {
  id: number;
  draft_code: string;
  draft_type: DraftType;
  title: string;
  target_location_id: number;
  source_location_id?: number | null;
  related_order_ids?: number[];
  status: DraftStatus;
  created_by_agent_run_id: number | null;
  created_by_user_id: number;
  reviewed_by_user_id: number | null;
  verification_passed: boolean;
  verification_warnings: string[];
  rationale: string;
  created_at: string;
  reviewed_at: string | null;
}

export interface ReorderDraftItem {
  id: number;
  draft_id: number;
  product_id: number;
  location_id: number;
  current_available_qty: number;
  expected_inventory_version: number;
  shortage_qty: number;
  suggested_reorder_qty: number;
  supplier_name: string;
}

export interface AgentRun {
  id: number;
  run_code: string;
  user_id: number;
  user_prompt: string;
  status: AgentRunStatus;
  step_count: number;
  max_steps: number;
  generated_draft_id: number | null;
  clarification_question: string | null;
  final_summary: string;
  total_latency_ms: number;
  created_at: string;
}

export interface AgentStep {
  id: number;
  run_id: number;
  step_number: number;
  stage_label: AgentStageLabel;
  tool_name: AgentToolName | null;
  tool_input_json: string;
  tool_output_summary: string;
  verification_status: VerificationStatus;
  latency_ms: number;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor_user_id: number;
  actor_role: UserRole;
  action_category: AuditActionCategory;
  action_name: string;
  entity_type: string;
  entity_id: string;
  details: string;
}

// ----------------------------------------------------------------------------
// 4. Unified Store Snapshot & Deterministic Engine Tool Contracts
// ----------------------------------------------------------------------------

export interface OperationsState {
  branches: Branch[];
  warehouses: Warehouse[];
  locations: InventoryLocation[];
  categories: Category[];
  products: Product[];
  inventoryBalances: InventoryBalance[];
  stockTransfers: StockTransfer[];
  stockTransferItems: StockTransferItem[];
  stockMovements: StockMovement[];
  users: User[];
  orders: Order[];
  orderItems: OrderItem[];
  reorderDrafts: ReorderDraft[];
  reorderDraftItems: ReorderDraftItem[];
  agentRuns: AgentRun[];
  agentSteps: AgentStep[];
  auditLogs: AuditLog[];
}

export interface ListPendingOrdersInput {
  locationId?: number | null;
  priority?: OrderPriority | 'ALL';
  includeStatuses?: OrderStatus[];
  fromDate?: string;
  toDate?: string;
}

export interface OrderSummaryRecord {
  order: Order;
  locationName: string;
  items: Array<
    OrderItem & {
      sku: string;
      productName: string;
      unit: string;
    }
  >;
  totalRequestedUnits: number;
}

export interface ListPendingOrdersResult {
  orders: OrderSummaryRecord[];
  totalCount: number;
}

export interface GetInventoryStatusInput {
  locationId?: number | null;
  productIds?: number[];
  searchQuery?: string;
  categoryId?: number | null;
  lowStockOnly?: boolean;
}

export interface InventoryBalanceView {
  locationId: number;
  locationName: string;
  locationType: LocationType;
  productId: number;
  sku: string;
  productName: string;
  categoryName: string;
  unit: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  reorder_threshold: number;
  default_reorder_qty: number;
  unit_cost_jod: number;
  supplier_name: string;
  version: number;
  updated_at: string;
  stockHealth: 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface GetInventoryStatusResult {
  balances: InventoryBalanceView[];
  matchedProducts: Product[];
  ambiguousMatch: boolean;
  ambiguityReason: string | null;
}

export interface CheckOrderFeasibilityInput {
  orderIds?: number[];
  locationId?: number | null;
  priorityFilter?: OrderPriority | 'ALL';
  mode?: 'CUMULATIVE' | 'ISOLATED';
}

export interface OrderItemFeasibilityDetail {
  orderItemId: number;
  orderId: number;
  productId: number;
  sku: string;
  productName: string;
  unit: string;
  requestedQty: number;
  physicalOnHandQty: number;
  reservedQty: number;
  startingAvailableQty: number;
  priorAllocatedByQueueQty: number;
  availableBeforeOrder: number;
  allocatedQty: number;
  shortageQty: number;
  availableAfterOrder: number;
  inventoryVersion: number;
  surplusLocations: Array<{
    locationId: number;
    locationName: string;
    locationType: LocationType;
    availableQty: number;
    transferableSurplusQty: number;
  }>;
}

export interface OrderFeasibilityDetail {
  order: Order;
  locationName: string;
  feasibility: FeasibilityStatus;
  derivedOrderStatus: OrderStatus;
  items: OrderItemFeasibilityDetail[];
  totalRequestedQty: number;
  totalAllocatedQty: number;
  totalShortageQty: number;
}

export interface SkuCumulativeDemandSummary {
  productId: number;
  sku: string;
  productName: string;
  unit: string;
  locationId: number;
  locationName: string;
  startingAvailableQty: number;
  totalRequestedQty: number;
  totalAllocatedQty: number;
  totalShortageQty: number;
  remainingAvailableQty: number;
  reorderThreshold: number;
  defaultReorderQty: number;
  recommendedReorderQty: number;
  supplierName: string;
  unitCostJod: number;
  currentVersion: number;
  competingOrderCount: number;
  transferCoverageOptions: Array<{
    sourceLocationId: number;
    sourceLocationName: string;
    availableQty: number;
    transferableSurplusQty: number;
  }>;
}

export interface CheckOrderFeasibilityResult {
  mode: 'CUMULATIVE' | 'ISOLATED';
  evaluatedOrders: OrderFeasibilityDetail[];
  skuSummaries: SkuCumulativeDemandSummary[];
  fullCount: number;
  partialCount: number;
  unavailableCount: number;
  shortedSkuCount: number;
  feasibilityRatePct: number;
}

export interface PrepareReorderDraftItemInput {
  productId: number;
  locationId: number;
  suggestedReorderQty?: number;
  shortageQty?: number;
}

export interface PrepareReorderDraftInput {
  draftType: DraftType;
  title: string;
  targetLocationId: number;
  sourceLocationId?: number | null;
  relatedOrderIds?: number[];
  items: PrepareReorderDraftItemInput[];
  rationale: string;
  createdByUserId: number;
  createdByAgentRunId?: number | null;
}

export interface PrepareReorderDraftResult {
  nextState: OperationsState;
  draft: ReorderDraft;
  draftItems: ReorderDraftItem[];
}

export interface VerifyDraftInput {
  draftId: number;
  actorUserId?: number;
}

export interface VerifyDraftResult {
  nextState: OperationsState;
  draft: ReorderDraft;
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export interface SubmitApprovedChangeInput {
  draftId: number;
  actorUserId: number;
  decision: 'APPROVE' | 'REJECT';
  rejectionReason?: string;
}

export interface SubmitApprovedChangeResult {
  nextState: OperationsState;
  draft: ReorderDraft;
  statusCode: 200 | 403 | 404 | 409 | 422;
  message: string;
  conflictDetails?: Array<{
    productId: number;
    sku: string;
    locationId: number;
    expectedVersion: number;
    actualVersion: number;
  }>;
}

export interface SimulateConcurrentStockUpdateInput {
  locationId: number;
  productId: number;
  quantityDelta: number;
  actorUserId: number;
  reason?: string;
}

export interface SimulateConcurrentStockUpdateResult {
  nextState: OperationsState;
  updatedBalance: InventoryBalance;
  affectedPendingDraftCodes: string[];
}

export interface UpsertProductInput {
  id?: number;
  category_id: number;
  sku: string;
  name: string;
  description: string;
  unit: string;
  reorder_threshold: number;
  default_reorder_qty: number;
  unit_cost_jod: number;
  supplier_name: string;
  initialQuantitiesByLocationId?: Record<number, number>;
  actorUserId: number;
}

export interface UpsertProductResult {
  nextState: OperationsState;
  product: Product;
  isNew: boolean;
  error?: string;
}

export interface CreateStockTransferInput {
  sourceLocationId: number;
  destinationLocationId: number;
  transferDate: string;
  notes: string;
  items: Array<{ productId: number; quantity: number }>;
  actorUserId: number;
}

export interface CreateStockTransferResult {
  nextState: OperationsState;
  transfer: StockTransfer | null;
  error?: string;
}

export interface AmbiguityCandidate {
  productId: number;
  sku: string;
  name: string;
  unit: string;
  availableQty: number;
  reorderThreshold: number;
  defaultReorderQty: number;
}

export interface ExecuteBoundedAgentRunInput {
  prompt: string;
  actorUserId: number;
  locationId?: number | null;
  selectedProductId?: number;
  overrideQuantity?: number;
  preferTransfer?: boolean;
}

export interface ExecuteBoundedAgentRunResult {
  nextState: OperationsState;
  run: AgentRun;
  steps: AgentStep[];
  draft: ReorderDraft | null;
  draftItems: ReorderDraftItem[];
  ambiguityCandidates: AmbiguityCandidate[];
  missingQuantityProduct: AmbiguityCandidate | null;
}
