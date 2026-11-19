import { memo, useMemo } from 'react';
import type {
  DraftStatus,
  InventoryBalance,
  InventoryLocation,
  Product,
  ReorderDraft,
  ReorderDraftItem,
  UserRole,
} from '../../types/domain.ts';
import { DraftActionFooter, DraftConflictBanner } from './DraftActionControls.tsx';
import { DraftItemRow } from './DraftItemRow.tsx';
import { StatusBadge, type BadgeTone } from './StatusBadge.tsx';

interface DraftApprovalCardProps {
  draft: ReorderDraft;
  items: ReorderDraftItem[];
  locations: InventoryLocation[];
  products: Product[];
  balances: InventoryBalance[];
  activeRole: UserRole;
  onUpdateItemQty: (draftId: number, draftItemId: number, newQty: number) => void;
  onVerifyDraft: (draftId: number) => void;
  onRefreshSnapshot: (draftId: number) => void;
  onSubmitDecision: (draftId: number, decision: 'APPROVE' | 'REJECT') => void;
}

function draftStatusTone(status: DraftStatus): BadgeTone {
  switch (status) {
    case 'APPROVED_COMMITTED':
      return 'emerald';
    case 'VERIFIED_PENDING_APPROVAL':
      return 'amber';
    case 'STALE_CONFLICT':
    case 'REJECTED':
      return 'rose';
    case 'DRAFT':
      return 'slate';
  }
}

export const DraftApprovalCard = memo(function DraftApprovalCard({
  draft,
  items,
  locations,
  products,
  balances,
  activeRole,
  onUpdateItemQty,
  onVerifyDraft,
  onRefreshSnapshot,
  onSubmitDecision,
}: DraftApprovalCardProps) {
  const locationMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const balanceMap = useMemo(
    () => new Map(balances.map((b) => [`${b.location_id}:${b.product_id}`, b])),
    [balances],
  );

  const isTerminal =
    draft.status === 'APPROVED_COMMITTED' || draft.status === 'REJECTED';
  const hasLiveDrift = useMemo(
    () =>
      items.some((item) => {
        const b = balanceMap.get(`${item.location_id}:${item.product_id}`);
        return b != null && b.version !== item.expected_inventory_version;
      }),
    [items, balanceMap],
  );

  const targetName =
    locationMap.get(draft.target_location_id)?.name ??
    `Location #${draft.target_location_id}`;
  const sourceName =
    draft.source_location_id != null
      ? (locationMap.get(draft.source_location_id)?.name ??
        `Location #${draft.source_location_id}`)
      : null;

  const formattedTime = new Date(draft.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <article className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-ink">
              {draft.draft_code}
            </span>
            <StatusBadge tone="blue">{draft.draft_type}</StatusBadge>
            <StatusBadge tone={draftStatusTone(draft.status)}>{draft.status}</StatusBadge>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-ink">{draft.title}</h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {sourceName ? `${sourceName} → ${targetName}` : `Target: ${targetName}`}
          </p>
        </div>

        <span className="font-mono text-[11px] text-ink-muted tabular-nums">
          {formattedTime}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{draft.rationale}</p>

      {!isTerminal && (hasLiveDrift || draft.status === 'STALE_CONFLICT') ? (
        <DraftConflictBanner onRefreshSnapshot={() => onRefreshSnapshot(draft.id)} />
      ) : null}

      {draft.verification_warnings.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {draft.verification_warnings.map((warning) => (
            <li
              key={warning}
              className="rounded border border-status-amber-border bg-status-amber-bg px-2.5 py-1.5 text-[11px] text-status-amber-text"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-md border border-hairline">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-subtle text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-2">SKU / Product</th>
              <th className="px-2.5 py-2 text-right">Snap Avail</th>
              <th className="px-2.5 py-2">Version Check</th>
              <th className="px-2.5 py-2 text-right">Shortage</th>
              <th className="px-3 py-2 text-right">Suggested Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {items.map((item) => (
              <DraftItemRow
                key={`${item.id}-${item.suggested_reorder_qty}-${item.expected_inventory_version}`}
                item={item}
                product={productMap.get(item.product_id)}
                liveBalance={balanceMap.get(`${item.location_id}:${item.product_id}`)}
                editable={!isTerminal}
                onSaveQty={(itemId, qty) => onUpdateItemQty(draft.id, itemId, qty)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!isTerminal ? (
        <DraftActionFooter
          activeRole={activeRole}
          onVerifyDraft={() => onVerifyDraft(draft.id)}
          onApprove={() => onSubmitDecision(draft.id, 'APPROVE')}
          onReject={() => onSubmitDecision(draft.id, 'REJECT')}
        />
      ) : null}
    </article>
  );
});
