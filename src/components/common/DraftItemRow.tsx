import { useState } from 'react';
import type { InventoryBalance, Product, ReorderDraftItem } from '../../types/domain.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface DraftItemRowProps {
  item: ReorderDraftItem;
  product: Product | undefined;
  liveBalance: InventoryBalance | undefined;
  editable: boolean;
  onSaveQty: (itemId: number, newQty: number) => void;
}

export function DraftItemRow({
  item,
  product,
  liveBalance,
  editable,
  onSaveQty,
}: DraftItemRowProps) {
  const [qtyText, setQtyText] = useState(String(item.suggested_reorder_qty));
  const liveVersion = liveBalance?.version ?? item.expected_inventory_version;
  const hasDrift = liveVersion !== item.expected_inventory_version;
  const parsedQty = Number(qtyText);
  const isDirty =
    Number.isFinite(parsedQty) &&
    parsedQty > 0 &&
    parsedQty !== item.suggested_reorder_qty;

  return (
    <tr className="hover:bg-subtle/60">
      <td className="px-3 py-2">
        <div className="font-mono text-[11px] font-semibold text-ink">
          {product?.sku ?? `SKU-${item.product_id}`}
        </div>
        <div className="max-w-[175px] truncate text-xs text-ink-secondary">
          {product?.name ?? `Product #${item.product_id}`}
        </div>
        <div className="text-[10px] text-ink-muted">{item.supplier_name}</div>
      </td>

      <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {item.current_available_qty}
      </td>

      <td className="px-2.5 py-2">
        <div className="flex flex-col items-start gap-0.5 font-mono text-[11px] tabular-nums">
          <span className="text-ink-secondary">
            Snap v{item.expected_inventory_version} · Live v{liveVersion}
          </span>
          {hasDrift ? <StatusBadge tone="rose">DRIFT</StatusBadge> : null}
        </div>
      </td>

      <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums">
        {item.shortage_qty > 0 ? (
          <span className="font-semibold text-status-rose-text">
            -{item.shortage_qty}
          </span>
        ) : (
          <span className="text-ink-muted">0</span>
        )}
      </td>

      <td className="px-3 py-2 text-right">
        {editable ? (
          <div className="inline-flex items-center gap-1">
            <label htmlFor={`draft-qty-${item.id}`} className="sr-only">
              Suggested quantity for {product?.sku ?? item.product_id}
            </label>
            <input
              id={`draft-qty-${item.id}`}
              type="number"
              min={1}
              value={qtyText}
              onChange={(e) => setQtyText(e.target.value)}
              className="w-16 rounded border border-hairline-strong bg-surface px-2 py-1 text-right font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
            />
            {isDirty ? (
              <button
                type="button"
                onClick={() => onSaveQty(item.id, parsedQty)}
                className="rounded border border-accent-border bg-accent-subtle px-2 py-1 text-[11px] font-medium text-accent-ink hover:bg-subtle"
              >
                Save
              </button>
            ) : null}
          </div>
        ) : (
          <span className="font-mono text-xs font-semibold tabular-nums text-ink">
            {item.suggested_reorder_qty} {product?.unit ?? 'pcs'}
          </span>
        )}
      </td>
    </tr>
  );
}
