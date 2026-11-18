import { memo } from 'react';
import type { SkuCumulativeDemandSummary } from '../../types/domain.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface AssistantFeasibilitySnapshotProps {
  shortedSkus: SkuCumulativeDemandSummary[];
}

export const AssistantFeasibilitySnapshot = memo(function AssistantFeasibilitySnapshot({
  shortedSkus,
}: AssistantFeasibilitySnapshotProps) {
  if (shortedSkus.length === 0) return null;

  return (
    <section
      aria-label="Cumulative feasibility shortage snapshot"
      className="rounded-lg border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Cumulative Feasibility Breakdown
        </h3>
        <StatusBadge tone="amber">{shortedSkus.length} Shorted SKUs</StatusBadge>
      </div>

      <div className="overflow-x-auto rounded-md border border-hairline">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-subtle text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              <th className="px-2.5 py-1.5">SKU</th>
              <th className="px-2 py-1.5 text-right">Avail</th>
              <th className="px-2 py-1.5 text-right">Req</th>
              <th className="px-2 py-1.5 text-right">Short</th>
              <th className="px-2.5 py-1.5 text-right">Rec Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-[11px]">
            {shortedSkus.slice(0, 5).map((sku) => (
              <tr key={`${sku.locationId}:${sku.productId}`}>
                <td className="px-2.5 py-1.5">
                  <div className="font-mono font-semibold text-ink">{sku.sku}</div>
                  <div className="max-w-[140px] truncate text-[10px] text-ink-muted">
                    {sku.locationName}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-secondary">
                  {sku.startingAvailableQty}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-secondary">
                  {sku.totalRequestedQty}
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums text-status-rose-text">
                  -{sku.totalShortageQty}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono font-medium tabular-nums text-accent-ink">
                  {sku.recommendedReorderQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
