import { checkOrderFeasibility, getInventoryStatus } from '../../../services/operationsEngine.ts';
import type {
  OperationsState,
  SkuCumulativeDemandSummary,
} from '../../../types/domain.ts';
import type { LocationHealthDatum } from '../../charts/LocationStockHealthChart.tsx';
import type { FeasibilityBreakdownDatum } from '../../charts/OrderFeasibilityChart.tsx';

export interface OverviewMetrics {
  totalPendingOrders: number;
  feasibilityRatePct: number;
  fullOrdersCount: number;
  partialOrdersCount: number;
  unavailableOrdersCount: number;
  shortedSkuCount: number;
  lowOrOutCount: number;
  zeroStockCount: number;
  totalInventoryRows: number;
  pendingApprovalsCount: number;
  staleConflictCount: number;
  activeTransfersCount: number;
  inTransitTransfersCount: number;
  totalMovementsCount: number;
  locationHealthData: LocationHealthDatum[];
  feasibilityBreakdownData: FeasibilityBreakdownDatum[];
  topShortedSkus: SkuCumulativeDemandSummary[];
}

export function deriveOverviewMetrics(
  state: OperationsState,
  selectedLocationId: number | null,
): OverviewMetrics {
  const feasibility = checkOrderFeasibility(state, {
    locationId: selectedLocationId,
    mode: 'CUMULATIVE',
  });

  const inventory = getInventoryStatus(state, {
    locationId: selectedLocationId,
  });

  let lowOrOutCount = 0;
  let zeroStockCount = 0;
  for (const row of inventory.balances) {
    if (row.stockHealth !== 'HEALTHY') lowOrOutCount += 1;
    if (row.stockHealth === 'OUT_OF_STOCK') zeroStockCount += 1;
  }

  let pendingApprovalsCount = 0;
  let staleConflictCount = 0;
  for (const draft of state.reorderDrafts) {
    if (draft.status !== 'VERIFIED_PENDING_APPROVAL' && draft.status !== 'STALE_CONFLICT') {
      continue;
    }
    if (selectedLocationId != null && draft.target_location_id !== selectedLocationId) {
      continue;
    }
    pendingApprovalsCount += 1;
    if (draft.status === 'STALE_CONFLICT') staleConflictCount += 1;
  }

  let activeTransfersCount = 0;
  let inTransitTransfersCount = 0;
  for (const transfer of state.stockTransfers) {
    if (transfer.status === 'COMPLETED' || transfer.status === 'CANCELLED') continue;
    if (
      selectedLocationId != null &&
      transfer.source_location_id !== selectedLocationId &&
      transfer.destination_location_id !== selectedLocationId
    ) {
      continue;
    }
    activeTransfersCount += 1;
    if (transfer.status === 'IN_TRANSIT') inTransitTransfersCount += 1;
  }

  const visibleLocations =
    selectedLocationId == null
      ? state.locations
      : state.locations.filter((loc) => loc.id === selectedLocationId);

  const locationCounters = new Map<number, LocationHealthDatum>();
  for (const loc of visibleLocations) {
    locationCounters.set(loc.id, {
      locationCode: loc.code,
      locationName: loc.name
        .replace(' Warehouse', '')
        .replace(' Retail Branch', ' Branch')
        .replace(' Distribution Hub', ' Hub'),
      healthy: 0,
      lowStock: 0,
      outOfStock: 0,
    });
  }

  for (const row of inventory.balances) {
    const entry = locationCounters.get(row.locationId);
    if (!entry) continue;
    if (row.stockHealth === 'HEALTHY') entry.healthy += 1;
    else if (row.stockHealth === 'LOW_STOCK') entry.lowStock += 1;
    else entry.outOfStock += 1;
  }

  const buckets: Record<'FULL' | 'PARTIAL' | 'UNAVAILABLE', FeasibilityBreakdownDatum> = {
    FULL: {
      statusLabel: 'Full Feasibility',
      orderCount: 0,
      requestedUnits: 0,
      allocatedUnits: 0,
      shortageUnits: 0,
      fillColor: 'var(--chart-emerald)',
    },
    PARTIAL: {
      statusLabel: 'Partial Shortage',
      orderCount: 0,
      requestedUnits: 0,
      allocatedUnits: 0,
      shortageUnits: 0,
      fillColor: 'var(--chart-amber)',
    },
    UNAVAILABLE: {
      statusLabel: 'Blocked (0 Stock)',
      orderCount: 0,
      requestedUnits: 0,
      allocatedUnits: 0,
      shortageUnits: 0,
      fillColor: 'var(--chart-rose)',
    },
  };

  for (const order of feasibility.evaluatedOrders) {
    const bucket = buckets[order.feasibility];
    bucket.orderCount += 1;
    bucket.requestedUnits += order.totalRequestedQty;
    bucket.allocatedUnits += order.totalAllocatedQty;
    bucket.shortageUnits += order.totalShortageQty;
  }

  return {
    totalPendingOrders: feasibility.evaluatedOrders.length,
    feasibilityRatePct: feasibility.feasibilityRatePct,
    fullOrdersCount: feasibility.fullCount,
    partialOrdersCount: feasibility.partialCount,
    unavailableOrdersCount: feasibility.unavailableCount,
    shortedSkuCount: feasibility.shortedSkuCount,
    lowOrOutCount,
    zeroStockCount,
    totalInventoryRows: inventory.balances.length,
    pendingApprovalsCount,
    staleConflictCount,
    activeTransfersCount,
    inTransitTransfersCount,
    totalMovementsCount: state.stockMovements.length,
    locationHealthData: Array.from(locationCounters.values()),
    feasibilityBreakdownData: [buckets.FULL, buckets.PARTIAL, buckets.UNAVAILABLE],
    topShortedSkus: feasibility.skuSummaries
      .filter((s) => s.totalShortageQty > 0)
      .slice(0, 6),
  };
}
