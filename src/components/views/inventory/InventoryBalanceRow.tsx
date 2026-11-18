import { Minus, Pencil, Plus } from 'lucide-react';
import { memo } from 'react';
import type { InventoryBalanceView, Product } from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';

interface InventoryBalanceRowProps {
  row: InventoryBalanceView;
  product: Product | undefined;
  onAdjustStock: (locationId: number, productId: number, delta: number) => void;
  onEditProduct: (product: Product) => void;
}

function healthTone(health: InventoryBalanceView['stockHealth']): BadgeTone {
  switch (health) {
    case 'HEALTHY':
      return 'emerald';
    case 'LOW_STOCK':
      return 'amber';
    case 'OUT_OF_STOCK':
      return 'rose';
  }
}

function healthLabel(health: InventoryBalanceView['stockHealth']): string {
  switch (health) {
    case 'HEALTHY':
      return 'HEALTHY';
    case 'LOW_STOCK':
      return 'LOW STOCK';
    case 'OUT_OF_STOCK':
      return 'OUT OF STOCK';
  }
}

export const InventoryBalanceRow = memo(function InventoryBalanceRow({
  row,
  product,
  onAdjustStock,
  onEditProduct,
}: InventoryBalanceRowProps) {
  return (
    <tr className="hover:bg-subtle/60">
      <td className="px-4 py-2.5">
        <div className="font-mono text-xs font-semibold text-ink">{row.sku}</div>
        <div className="max-w-[230px] truncate text-xs text-ink-secondary">
          {row.productName}
        </div>
        <div className="text-[11px] text-ink-muted">{row.categoryName}</div>
      </td>

      <td className="px-3 py-2.5">
        <div className="text-xs font-medium text-ink">{row.locationName}</div>
        <div className="font-mono text-[10px] uppercase text-ink-muted">
          {row.locationType}
        </div>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {row.quantity}
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-muted">
        {row.reserved_quantity}
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-ink">
        {row.available_quantity}{' '}
        <span className="font-sans text-[11px] font-normal text-ink-muted">
          {row.unit}
        </span>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {row.reorder_threshold}
      </td>

      <td className="px-3 py-2.5">
        <StatusBadge tone={healthTone(row.stockHealth)}>
          {healthLabel(row.stockHealth)}
        </StatusBadge>
      </td>

      <td className="px-3 py-2.5 text-center">
        <span className="rounded border border-hairline bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-secondary tabular-nums">
          v{row.version}
        </span>
      </td>

      <td className="px-4 py-2.5 text-right">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onAdjustStock(row.locationId, row.productId, -1)}
            disabled={row.quantity <= 0}
            aria-label={`Decrement ${row.sku} at ${row.locationName} by 1`}
            title="Simulate -1 unit checkout (increments version)"
            className="rounded border border-hairline-strong bg-surface p-1 text-ink-secondary hover:bg-subtle hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onAdjustStock(row.locationId, row.productId, 5)}
            aria-label={`Increment ${row.sku} at ${row.locationName} by 5`}
            title="Manual +5 unit restock adjustment (increments version)"
            className="rounded border border-hairline-strong bg-surface p-1 text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
          {product ? (
            <button
              type="button"
              onClick={() => onEditProduct(product)}
              aria-label={`Edit ${row.sku}`}
              title="Edit SKU metadata"
              className="ml-1 rounded border border-hairline-strong bg-surface p-1 text-ink-secondary hover:bg-subtle hover:text-ink"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
});
