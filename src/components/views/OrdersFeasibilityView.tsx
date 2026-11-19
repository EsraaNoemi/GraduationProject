import { CheckCircle2 } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { checkOrderFeasibility } from '../../services/operationsEngine.ts';
import type {
  FeasibilityStatus,
  OperationsState,
  OrderFeasibilityDetail,
  OrderPriority,
  SkuCumulativeDemandSummary,
} from '../../types/domain.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { OrderFeasibilityRow } from './orders/OrderFeasibilityRow.tsx';
import { OrdersFilterBar, type FeasibilityMode } from './orders/OrdersFilterBar.tsx';
import { SkuContentionSummaryStrip } from './orders/SkuContentionSummaryStrip.tsx';

export interface AssistantAnalysisRequest {
  title: string;
  prompt: string;
  locationId: number | null;
  orderNumber?: string;
  sku?: string;
}

interface OrdersFeasibilityViewProps {
  state: OperationsState;
  selectedLocationId: number | null;
  onAnalyzeWithAssistant: (request: AssistantAnalysisRequest) => void;
}

export const OrdersFeasibilityView = memo(function OrdersFeasibilityView({
  state,
  selectedLocationId,
  onAnalyzeWithAssistant,
}: OrdersFeasibilityViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<OrderPriority | 'ALL'>('ALL');
  const [feasibilityFilter, setFeasibilityFilter] = useState<FeasibilityStatus | 'ALL'>(
    'ALL',
  );
  const [mode, setMode] = useState<FeasibilityMode>('CUMULATIVE');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<number>>(() => new Set([2]));

  const cumulativeResult = useMemo(
    () =>
      checkOrderFeasibility(state, {
        locationId: selectedLocationId,
        mode: 'CUMULATIVE',
      }),
    [state, selectedLocationId],
  );

  const isolatedResult = useMemo(
    () =>
      checkOrderFeasibility(state, {
        locationId: selectedLocationId,
        mode: 'ISOLATED',
      }),
    [state, selectedLocationId],
  );

  const isolatedStatusByOrderId = useMemo(() => {
    const map = new Map<number, FeasibilityStatus>();
    for (const entry of isolatedResult.evaluatedOrders) {
      map.set(entry.order.id, entry.feasibility);
    }
    return map;
  }, [isolatedResult.evaluatedOrders]);

  const activeResult = mode === 'CUMULATIVE' ? cumulativeResult : isolatedResult;

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeResult.evaluatedOrders.filter((detail) => {
      if (priorityFilter !== 'ALL' && detail.order.priority !== priorityFilter) {
        return false;
      }
      if (feasibilityFilter !== 'ALL' && detail.feasibility !== feasibilityFilter) {
        return false;
      }
      if (query.length > 0) {
        const orderHit =
          detail.order.order_number.toLowerCase().includes(query) ||
          detail.order.customer_name.toLowerCase().includes(query) ||
          detail.locationName.toLowerCase().includes(query);
        const itemHit = detail.items.some(
          (item) =>
            item.sku.toLowerCase().includes(query) ||
            item.productName.toLowerCase().includes(query),
        );
        if (!orderHit && !itemHit) return false;
      }
      return true;
    });
  }, [activeResult.evaluatedOrders, priorityFilter, feasibilityFilter, searchQuery]);

  const downgradedByContentionCount = useMemo(() => {
    if (mode !== 'CUMULATIVE') return 0;
    let count = 0;
    for (const detail of filteredOrders) {
      if (
        isolatedStatusByOrderId.get(detail.order.id) === 'FULL' &&
        detail.feasibility !== 'FULL'
      ) {
        count += 1;
      }
    }
    return count;
  }, [mode, filteredOrders, isolatedStatusByOrderId]);

  const contendedSkus = useMemo(
    () => cumulativeResult.skuSummaries.filter((s) => s.totalShortageQty > 0),
    [cumulativeResult.skuSummaries],
  );

  const handleToggleExpand = useCallback((orderId: number) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const handleAnalyzeBatch = useCallback(() => {
    const scopeLabel =
      selectedLocationId == null
        ? 'all locations'
        : (state.locations.find((l) => l.id === selectedLocationId)?.name ??
          `Location #${selectedLocationId}`);
    onAnalyzeWithAssistant({
      title: `Batch Feasibility & Replenishment (${scopeLabel})`,
      prompt: `Review pending orders at ${scopeLabel} using cumulative FIFO feasibility, identify shorted SKUs, and prepare a verified reorder or stock transfer draft.`,
      locationId: selectedLocationId,
    });
  }, [onAnalyzeWithAssistant, selectedLocationId, state.locations]);

  const handleAnalyzeOrder = useCallback(
    (detail: OrderFeasibilityDetail) => {
      const shortedSkus = detail.items
        .filter((i) => i.shortageQty > 0)
        .map((i) => `${i.sku} (-${i.shortageQty} ${i.unit})`)
        .join(', ');

      onAnalyzeWithAssistant({
        title: `Order Analysis: ${detail.order.order_number}`,
        prompt:
          shortedSkus.length > 0
            ? `Evaluate ${detail.order.order_number} at ${detail.locationName}. Address cumulative shortages (${shortedSkus}) by checking internal warehouse surplus or preparing a supplier reorder draft.`
            : `Verify stock availability and prepare fulfillment approval for ${detail.order.order_number} at ${detail.locationName}.`,
        locationId: detail.order.fulfillment_location_id,
        orderNumber: detail.order.order_number,
      });
    },
    [onAnalyzeWithAssistant],
  );

  const handleAnalyzeSkuShortage = useCallback(
    (skuSummary: SkuCumulativeDemandSummary) => {
      const hasTransfer =
        skuSummary.transferCoverageOptions[0] != null &&
        skuSummary.transferCoverageOptions[0].transferableSurplusQty >=
          skuSummary.totalShortageQty;

      onAnalyzeWithAssistant({
        title: `SKU Shortfall: ${skuSummary.sku}`,
        prompt: hasTransfer
          ? `Check inter-warehouse transfer options from ${skuSummary.transferCoverageOptions[0].sourceLocationName} to cover the -${skuSummary.totalShortageQty} ${skuSummary.unit} cumulative shortage of ${skuSummary.sku} at ${skuSummary.locationName}.`
          : `Prepare a verified reorder draft for ${skuSummary.recommendedReorderQty} ${skuSummary.unit} of ${skuSummary.sku} (${skuSummary.productName}) at ${skuSummary.locationName}.`,
        locationId: skuSummary.locationId,
        sku: skuSummary.sku,
      });
    },
    [onAnalyzeWithAssistant],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Orders Queue &amp; Cumulative Feasibility Analyzer
          </h1>
          <p className="text-xs text-ink-muted">
            Deterministic FIFO &amp; priority stock allocation across competing customer orders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="emerald">{activeResult.fullCount} Full</StatusBadge>
          <StatusBadge tone="amber">{activeResult.partialCount} Partial</StatusBadge>
          <StatusBadge tone="rose">{activeResult.unavailableCount} Blocked</StatusBadge>
        </div>
      </div>

      <OrdersFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        feasibilityFilter={feasibilityFilter}
        onFeasibilityChange={setFeasibilityFilter}
        mode={mode}
        onModeChange={setMode}
        totalFilteredCount={filteredOrders.length}
        downgradedByContentionCount={downgradedByContentionCount}
        onAnalyzeBatch={handleAnalyzeBatch}
      />

      <SkuContentionSummaryStrip
        contendedSkus={contendedSkus}
        onAnalyzeSkuShortage={handleAnalyzeSkuShortage}
      />

      <section
        aria-label="Orders feasibility table"
        className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-xs"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline bg-subtle">
                <th className="w-10 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  <span className="sr-only">Expand</span>
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Order #
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Customer &amp; Notes
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Location
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Priority
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Feasibility
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Req
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Alloc
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Short
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Assistant
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-xs text-ink-muted">
                    <CheckCircle2
                      className="mx-auto mb-1.5 h-5 w-5 text-ink-muted"
                      aria-hidden="true"
                    />
                    No pending orders match the active location and feasibility filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((detail) => (
                  <OrderFeasibilityRow
                    key={detail.order.id}
                    detail={detail}
                    isolatedFeasibility={isolatedStatusByOrderId.get(detail.order.id)}
                    expanded={expandedOrderIds.has(detail.order.id)}
                    onToggleExpand={handleToggleExpand}
                    onAnalyzeOrder={handleAnalyzeOrder}
                    mode={mode}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
});
