import { CheckCircle2 } from 'lucide-react';
import { memo } from 'react';
import type { SkuCumulativeDemandSummary } from '../../../types/domain.ts';
import { StatusBadge } from '../../common/StatusBadge.tsx';
import type { NavTabId } from '../OverviewDashboard.tsx';

interface TopShortedSkusCardProps {
  skus: SkuCumulativeDemandSummary[];
  onNavigate: (tab: NavTabId) => void;
}

export const TopShortedSkusCard = memo(function TopShortedSkusCard({
  skus,
  onNavigate,
}: TopShortedSkusCardProps) {
  return (
    <section
      aria-label="Top shorted SKUs from cumulative feasibility"
      className="rounded-lg border border-hairline bg-surface shadow-xs xl:col-span-7"
    >
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Top Cumulative Shorted SKUs
          </h2>
          <p className="text-xs text-ink-muted">
            Prioritized FIFO allocation deficits &amp; internal warehouse transfer options
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          Analyze Orders
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-subtle">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                SKU / Product
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Location
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Avail
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Req
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Shortfall
              </th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Replenishment Path
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-xs">
            {skus.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  <CheckCircle2
                    className="mx-auto mb-1.5 h-5 w-5 text-status-emerald-text"
                    aria-hidden="true"
                  />
                  All active orders are 100% feasible with zero cumulative shortages.
                </td>
              </tr>
            ) : (
              skus.map((skuRow) => {
                const transferOption = skuRow.transferCoverageOptions[0];
                const canTransferCover =
                  transferOption != null &&
                  transferOption.transferableSurplusQty >= skuRow.totalShortageQty;

                return (
                  <tr
                    key={`${skuRow.locationId}:${skuRow.productId}`}
                    className="hover:bg-subtle/60"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-[11px] font-semibold text-ink">
                        {skuRow.sku}
                        <span className="ml-1.5 font-normal text-ink-muted tabular-nums">
                          v{skuRow.currentVersion}
                        </span>
                      </div>
                      <div className="max-w-[210px] truncate text-ink-secondary">
                        {skuRow.productName}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ink-secondary">
                      {skuRow.locationName
                        .replace(' Warehouse', '')
                        .replace(' Retail Branch', '')
                        .replace(' Distribution Hub', '')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ink-secondary">
                      {skuRow.startingAvailableQty}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ink-secondary">
                      {skuRow.totalRequestedQty}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <StatusBadge tone="rose">
                        -{skuRow.totalShortageQty} {skuRow.unit}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2.5">
                      {canTransferCover ? (
                        <StatusBadge tone="blue">
                          Transfer ({transferOption.transferableSurplusQty} at{' '}
                          {transferOption.sourceLocationName.split(' ')[0]})
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="amber">
                          Reorder {skuRow.recommendedReorderQty} {skuRow.unit}
                        </StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});
