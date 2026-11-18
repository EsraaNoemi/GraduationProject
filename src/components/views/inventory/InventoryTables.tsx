import { Boxes } from 'lucide-react';
import { memo } from 'react';
import type {
  InventoryBalance,
  InventoryBalanceView,
  InventoryLocation,
  Product,
} from '../../../types/domain.ts';
import { InventoryBalanceRow } from './InventoryBalanceRow.tsx';
import { InventoryMatrixRow } from './InventoryMatrixRow.tsx';

interface InventoryBalanceTableProps {
  rows: InventoryBalanceView[];
  productMap: Map<number, Product>;
  onAdjustStock: (locationId: number, productId: number, delta: number) => void;
  onEditProduct: (product: Product) => void;
}

export const InventoryBalanceTable = memo(function InventoryBalanceTable({
  rows,
  productMap,
  onAdjustStock,
  onEditProduct,
}: InventoryBalanceTableProps) {
  return (
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
            Physical
          </th>
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Reserved
          </th>
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Available
          </th>
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Min Threshold
          </th>
          <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Health
          </th>
          <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Version
          </th>
          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={9} className="px-4 py-10 text-center text-xs text-ink-muted">
              <Boxes className="mx-auto mb-1.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
              No inventory balance rows match your current filters.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <InventoryBalanceRow
              key={`${row.locationId}:${row.productId}`}
              row={row}
              product={productMap.get(row.productId)}
              onAdjustStock={onAdjustStock}
              onEditProduct={onEditProduct}
            />
          ))
        )}
      </tbody>
    </table>
  );
});

interface InventoryMatrixTableProps {
  products: Product[];
  locations: InventoryLocation[];
  categoryMap: Map<number, string>;
  balancesByProductMap: Map<number, Map<number, InventoryBalance>>;
  onEditProduct: (product: Product) => void;
}

export const InventoryMatrixTable = memo(function InventoryMatrixTable({
  products,
  locations,
  categoryMap,
  balancesByProductMap,
  onEditProduct,
}: InventoryMatrixTableProps) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-hairline bg-subtle">
          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            SKU / Product / Supplier
          </th>
          {locations.map((loc) => (
            <th
              key={loc.id}
              className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
            >
              {loc.code} · {loc.name.split(' ')[0]}
            </th>
          ))}
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Network Avail
          </th>
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Min / Lot
          </th>
          <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Unit Cost
          </th>
          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Catalog
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-hairline">
        {products.length === 0 ? (
          <tr>
            <td
              colSpan={locations.length + 5}
              className="px-4 py-10 text-center text-xs text-ink-muted"
            >
              No catalog SKUs match your current filters.
            </td>
          </tr>
        ) : (
          products.map((product) => (
            <InventoryMatrixRow
              key={product.id}
              product={product}
              categoryName={categoryMap.get(product.category_id) ?? 'Uncategorized'}
              locations={locations}
              balanceByLocationId={balancesByProductMap.get(product.id) ?? new Map()}
              onEditProduct={onEditProduct}
            />
          ))
        )}
      </tbody>
    </table>
  );
});
