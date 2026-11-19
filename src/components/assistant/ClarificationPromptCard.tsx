import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { memo, useState, type FormEvent } from 'react';
import type { AmbiguityCandidate } from '../../types/domain.ts';

interface ClarificationPromptCardProps {
  question: string;
  ambiguityCandidates: AmbiguityCandidate[];
  missingQuantityProduct: AmbiguityCandidate | null;
  onSelectCandidate: (candidate: AmbiguityCandidate) => void;
  onConfirmQuantity: (product: AmbiguityCandidate, quantity: number) => void;
}

export const ClarificationPromptCard = memo(function ClarificationPromptCard({
  question,
  ambiguityCandidates,
  missingQuantityProduct,
  onSelectCandidate,
  onConfirmQuantity,
}: ClarificationPromptCardProps) {
  const [customQty, setCustomQty] = useState(
    String(missingQuantityProduct?.defaultReorderQty ?? 25),
  );

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!missingQuantityProduct) return;
    const parsed = Number(customQty);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onConfirmQuantity(missingQuantityProduct, parsed);
  };

  return (
    <section
      aria-label="Human clarification required"
      className="rounded-lg border border-status-amber-border bg-status-amber-bg p-4"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-status-amber-text"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-status-amber-text">
              AWAITING_CLARIFICATION
            </span>
            <p className="mt-1 text-xs font-medium leading-relaxed text-ink">
              {question}
            </p>
          </div>

          {ambiguityCandidates.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-status-amber-text">
                Select exact SKU to resume bounded workflow:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {ambiguityCandidates.map((candidate) => (
                  <button
                    key={candidate.productId}
                    type="button"
                    onClick={() => onSelectCandidate(candidate)}
                    className="flex items-center justify-between gap-2 rounded-md border border-status-amber-border bg-surface px-3 py-2 text-left text-xs transition-colors hover:border-accent-border hover:bg-accent-subtle"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-semibold text-ink">
                        {candidate.sku}
                      </span>
                      <p className="truncate text-ink-secondary">{candidate.name}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-ink-muted tabular-nums">
                      {candidate.availableQty} {candidate.unit} avail
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {missingQuantityProduct ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onConfirmQuantity(
                      missingQuantityProduct,
                      missingQuantityProduct.defaultReorderQty,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    Use Default Lot ({missingQuantityProduct.defaultReorderQty}{' '}
                    {missingQuantityProduct.unit})
                  </span>
                </button>
              </div>

              <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
                <label
                  htmlFor="clarify-custom-qty"
                  className="text-[11px] text-ink-secondary"
                >
                  Custom Qty:
                </label>
                <input
                  id="clarify-custom-qty"
                  type="number"
                  min={1}
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-24 rounded-md border border-hairline-strong bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-subtle"
                >
                  Apply &amp; Resume
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});
