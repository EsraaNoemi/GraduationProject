import { AlertTriangle, ArrowRightLeft, Terminal } from 'lucide-react';
import { memo } from 'react';
import type { SkuCumulativeDemandSummary } from '../../../types/domain.ts';
import { StatusBadge } from '../../common/StatusBadge.tsx';

interface SkuContentionSummaryStripProps {
  contendedSkus: SkuCumulativeDemandSummary[];
  onAnalyzeSkuShortage: (skuSummary: SkuCumulativeDemandSummary) => void;
}

export const SkuContentionSummaryStrip = memo(function SkuContentionSummaryStrip({
  contendedSkus,
  onAnalyzeSkuShortage,
}: SkuContentionSummaryStripProps) {
  if (contendedSkus.length === 0) return null;

  return (
    <section
      aria-label="Contended and shorted SKUs summary"
      className="rounded-lg border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 text-status-amber-text"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">
              Cumulative SKU Contention &amp; Shortfall Breakdown
            </h2>
            <p className="text-xs text-ink-muted">
              SKUs where combined batch demand exceeds location available stock
            </p>
          </div>
        </div>
        <span className="font-mono text-xs font-semibold text-ink-secondary tabular-nums">
          {contendedSkus.length} shorted {contendedSkus.length === 1 ? 'SKU' : 'SKUs'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {contendedSkus.map((sku) => {
          const transferOpt = sku.transferCoverageOptions[0];
          const canTransferCover =
            transferOpt != null &&
            transferOpt.transferableSurplusQty >= sku.totalShortageQty;

          return (
            <div
              key={`${sku.locationId}:${sku.productId}`}
              className="flex flex-col justify-between rounded-md border border-hairline bg-subtle/70 p-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-ink">
                    {sku.sku}
                  </span>
                  <StatusBadge tone="rose">
                    Short -{sku.totalShortageQty} {sku.unit}
                  </StatusBadge>
                </div>
                <p className="mt-0.5 truncate text-xs font-medium text-ink-secondary">
                  {sku.productName}
                </p>
                <p className="mt-1 text-[11px] text-ink-muted tabular-nums">
                  {sku.locationName} · {sku.competingOrderCount} competing{' '}
                  {sku.competingOrderCount === 1 ? 'order' : 'orders'} · Avail{' '}
                  <strong className="font-mono text-ink">
                    {sku.startingAvailableQty}
                  </strong>{' '}
                  vs Req{' '}
                  <strong className="font-mono text-ink">{sku.totalRequestedQty}</strong>
                </p>
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline pt-2">
                {canTransferCover ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent-ink">
                    <ArrowRightLeft className="h-3 w-3" aria-hidden="true" />
                    <span>
                      +{transferOpt.transferableSurplusQty} surplus at{' '}
                      {transferOpt.sourceLocationName.split(' ')[0]}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-ink-secondary tabular-nums">
                    Reorder {sku.recommendedReorderQty} {sku.unit}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => onAnalyzeSkuShortage(sku)}
                  className="inline-flex items-center gap-1 rounded border border-hairline-strong bg-surface px-2 py-1 text-[11px] font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
                >
                  <Terminal className="h-3 w-3 text-accent-ink" aria-hidden="true" />
                  <span>Draft Fix</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
