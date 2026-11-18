import { Pencil } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../../lib/cn.ts';
import type {
  InventoryBalance,
  InventoryLocation,
  Product,
} from '../../../types/domain.ts';

interface InventoryMatrixRowProps {
  product: Product;
  categoryName: string;
  locations: InventoryLocation[];
  balanceByLocationId: Map<number, InventoryBalance>;
  onEditProduct: (product: Product) => void;
}

export const InventoryMatrixRow = memo(function InventoryMatrixRow({
  product,
  categoryName,
  locations,
  balanceByLocationId,
  onEditProduct,
}: InventoryMatrixRowProps) {
  let totalAvailable = 0;

  return (
    <tr className="hover:bg-subtle/60">
      <td className="px-4 py-2.5">
        <div className="font-mono text-xs font-semibold text-ink">{product.sku}</div>
        <div className="max-w-[230px] truncate text-xs text-ink-secondary">
          {product.name}
        </div>
        <div className="text-[11px] text-ink-muted">
          {categoryName} · {product.supplier_name}
        </div>
      </td>

      {locations.map((loc) => {
        const balance = balanceByLocationId.get(loc.id);
        const physical = balance?.quantity ?? 0;
        const reserved = balance?.reserved_quantity ?? 0;
        const available = Math.max(0, Number((physical - reserved).toFixed(3)));
        totalAvailable += available;

        const isOut = available <= 0;
        const isLow = !isOut && available < product.reorder_threshold;

        return (
          <td key={loc.id} className="px-3 py-2.5 text-right">
            <div className="inline-flex flex-col items-end">
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums',
                  isOut
                    ? 'border-status-rose-border bg-status-rose-bg text-status-rose-text'
                    : isLow
                      ? 'border-status-amber-border bg-status-amber-bg text-status-amber-text'
                      : 'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text',
                )}
              >
                {available} avail
              </span>
              <span className="mt-0.5 font-mono text-[10px] text-ink-muted tabular-nums">
                {physical} phys · {reserved} res · v{balance?.version ?? 1}
              </span>
            </div>
          </td>
        );
      })}

      <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-ink">
        {totalAvailable} {product.unit}
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {product.reorder_threshold} / +{product.default_reorder_qty}
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-secondary">
        {product.unit_cost_jod.toFixed(2)} JOD
      </td>

      <td className="px-4 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onEditProduct(product)}
          className="inline-flex items-center gap-1 rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          <span>Edit</span>
        </button>
      </td>
    </tr>
  );
});
