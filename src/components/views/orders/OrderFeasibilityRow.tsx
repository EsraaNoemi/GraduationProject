import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { memo } from 'react';
import type {
  FeasibilityStatus,
  OrderFeasibilityDetail,
  OrderPriority,
} from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';

interface OrderFeasibilityRowProps {
  detail: OrderFeasibilityDetail;
  isolatedFeasibility: FeasibilityStatus | undefined;
  expanded: boolean;
  onToggleExpand: (orderId: number) => void;
  onAnalyzeOrder: (detail: OrderFeasibilityDetail) => void;
  mode: 'CUMULATIVE' | 'ISOLATED';
}

function priorityTone(priority: OrderPriority): BadgeTone {
  switch (priority) {
    case 'HIGH':
      return 'rose';
    case 'NORMAL':
      return 'blue';
    case 'LOW':
      return 'slate';
  }
}

function feasibilityTone(status: FeasibilityStatus): BadgeTone {
  switch (status) {
    case 'FULL':
      return 'emerald';
    case 'PARTIAL':
      return 'amber';
    case 'UNAVAILABLE':
      return 'rose';
  }
}

function formatOrderTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const OrderFeasibilityRow = memo(function OrderFeasibilityRow({
  detail,
  isolatedFeasibility,
  expanded,
  onToggleExpand,
  onAnalyzeOrder,
  mode,
}: OrderFeasibilityRowProps) {
  const { order } = detail;
  const downgradedByContention =
    mode === 'CUMULATIVE' &&
    isolatedFeasibility === 'FULL' &&
    detail.feasibility !== 'FULL';

  return (
    <>
      <tr className={expanded ? 'bg-accent-subtle/40' : 'hover:bg-subtle/60'}>
        <td className="px-3 py-3 align-top">
          <button
            type="button"
            onClick={() => onToggleExpand(order.id)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} line items for ${order.order_number}`}
            className="rounded border border-hairline-strong bg-surface p-1 text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="font-mono text-xs font-semibold text-ink">
            {order.order_number}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-muted tabular-nums">
            {order.requested_delivery_date} · {formatOrderTime(order.created_at)}
          </div>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="text-xs font-medium text-ink">{order.customer_name}</div>
          <div className="mt-0.5 max-w-[240px] truncate text-[11px] text-ink-muted">
            {order.notes}
          </div>
        </td>

        <td className="px-3 py-3 align-top text-xs text-ink-secondary">
          {detail.locationName}
        </td>

        <td className="px-3 py-3 align-top">
          <StatusBadge tone={priorityTone(order.priority)}>{order.priority}</StatusBadge>
        </td>

        <td className="px-3 py-3 align-top">
          <div className="flex flex-col items-start gap-1">
            <StatusBadge tone={feasibilityTone(detail.feasibility)}>
              {detail.feasibility}
            </StatusBadge>
            {downgradedByContention ? (
              <span className="rounded border border-status-amber-border bg-status-amber-bg px-1.5 py-0.5 font-mono text-[10px] font-medium text-status-amber-text">
                FIFO Contention (Isolated: FULL)
              </span>
            ) : null}
          </div>
        </td>

        <td className="px-3 py-3 text-right align-top font-mono text-xs tabular-nums text-ink">
          {detail.totalRequestedQty}
        </td>

        <td className="px-3 py-3 text-right align-top font-mono text-xs tabular-nums text-status-emerald-text">
          {detail.totalAllocatedQty}
        </td>

        <td className="px-3 py-3 text-right align-top font-mono text-xs tabular-nums">
          {detail.totalShortageQty > 0 ? (
            <span className="font-semibold text-status-rose-text">
              -{detail.totalShortageQty}
            </span>
          ) : (
            <span className="text-ink-muted">0</span>
          )}
        </td>

        <td className="px-4 py-3 text-right align-top">
          <button
            type="button"
            onClick={() => onAnalyzeOrder(detail)}
            className="inline-flex items-center gap-1 rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            <Terminal className="h-3 w-3 text-accent-ink" aria-hidden="true" />
            <span>Analyze</span>
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="bg-subtle/50">
          <td colSpan={10} className="border-t border-hairline px-6 py-3">
            <div className="rounded-md border border-hairline bg-surface">
              <div className="flex items-center justify-between border-b border-hairline bg-subtle px-3.5 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                  Line-Item Stock Breakdown — {order.order_number}
                </span>
                <span className="font-mono text-[11px] text-ink-muted tabular-nums">
                  {detail.items.length} {detail.items.length === 1 ? 'SKU' : 'SKUs'} ·{' '}
                  {detail.derivedOrderStatus}
                </span>
              </div>

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-hairline text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="px-3 py-2">SKU / Product</th>
                    <th className="px-3 py-2 text-right">Physical</th>
                    <th className="px-3 py-2 text-right">Reserved</th>
                    <th className="px-3 py-2 text-right">Start Avail</th>
                    <th className="px-3 py-2 text-right">Prior Queue</th>
                    <th className="px-3 py-2 text-right">Avail Now</th>
                    <th className="px-3 py-2 text-right">Requested</th>
                    <th className="px-3 py-2 text-right">Allocated</th>
                    <th className="px-3 py-2 text-right">Shortage</th>
                    <th className="px-3 py-2">Inter-Location Surplus Hint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-xs">
                  {detail.items.map((item) => {
                    const topSurplus = item.surplusLocations[0];
                    return (
                      <tr key={item.orderItemId}>
                        <td className="px-3 py-2">
                          <div className="font-mono text-[11px] font-semibold text-ink">
                            {item.sku}{' '}
                            <span className="font-normal text-ink-muted">
                              v{item.inventoryVersion}
                            </span>
                          </div>
                          <div className="text-ink-secondary">{item.productName}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-secondary">
                          {item.physicalOnHandQty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">
                          {item.reservedQty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                          {item.startingAvailableQty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {item.priorAllocatedByQueueQty > 0 ? (
                            <span className="text-status-amber-text">
                              -{item.priorAllocatedByQueueQty}
                            </span>
                          ) : (
                            <span className="text-ink-muted">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-medium tabular-nums text-ink">
                          {item.availableBeforeOrder}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                          {item.requestedQty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-status-emerald-text">
                          {item.allocatedQty}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {item.shortageQty > 0 ? (
                            <span className="font-semibold text-status-rose-text">
                              -{item.shortageQty} {item.unit}
                            </span>
                          ) : (
                            <span className="text-ink-muted">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {item.shortageQty === 0 ? (
                            <span className="text-[11px] text-status-emerald-text">
                              Covered locally
                            </span>
                          ) : topSurplus ? (
                            <StatusBadge tone="blue">
                              <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />
                              <span>
                                +{topSurplus.transferableSurplusQty} at{' '}
                                {topSurplus.locationName} ({topSurplus.availableQty} avail)
                              </span>
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="amber">
                              No warehouse surplus — Supplier Reorder
                            </StatusBadge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
});
