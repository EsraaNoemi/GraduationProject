import { memo, useMemo, useState } from 'react';
import type {
  InventoryLocation,
  MovementType,
  Product,
  StockMovement,
} from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';

interface StockMovementLedgerTableProps {
  movements: StockMovement[];
  locations: InventoryLocation[];
  products: Product[];
}

function movementTone(type: MovementType): BadgeTone {
  switch (type) {
    case 'IN':
      return 'emerald';
    case 'OUT':
      return 'rose';
    case 'ADJUSTMENT':
      return 'amber';
  }
}

export const StockMovementLedgerTable = memo(function StockMovementLedgerTable({
  movements,
  locations,
  products,
}: StockMovementLedgerTableProps) {
  const [typeFilter, setTypeFilter] = useState<MovementType | 'ALL'>('ALL');

  const locationMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );
  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const visibleMovements = useMemo(
    () =>
      movements
        .filter((m) => typeFilter === 'ALL' || m.movement_type === typeFilter)
        .slice(0, 20),
    [movements, typeFilter],
  );

  return (
    <section
      aria-label="Immutable stock movements ledger"
      className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Immutable Stock Movements Ledger (`stock_movements`)
          </h2>
          <p className="text-xs text-ink-muted">
            Append-only audit of IN, OUT, and ADJUSTMENT balance changes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="movement-type-filter" className="text-xs text-ink-muted">
            Type
          </label>
          <select
            id="movement-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MovementType | 'ALL')}
            className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value="ALL">All Types ({movements.length})</option>
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
            <option value="ADJUSTMENT">ADJUSTMENT</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline bg-subtle">
              <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Movement ID
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Type
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Location
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                SKU / Product
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Qty
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Reference
              </th>
              <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-xs">
            {visibleMovements.map((mov) => {
              const loc = locationMap.get(mov.location_id);
              const prod = productMap.get(mov.product_id);
              return (
                <tr key={mov.id} className="hover:bg-subtle/60">
                  <td className="px-4 py-2 font-mono text-[11px] text-ink-muted tabular-nums">
                    MOV-{String(mov.id).padStart(4, '0')}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={movementTone(mov.movement_type)}>
                      {mov.movement_type}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-ink-secondary">
                    {loc?.name ?? `Location #${mov.location_id}`}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px] font-semibold text-ink">
                      {prod?.sku ?? `SKU-${mov.product_id}`}
                    </span>
                    <span className="ml-2 text-ink-secondary">{prod?.name}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium tabular-nums text-ink">
                    {mov.movement_type === 'OUT'
                      ? '-'
                      : mov.quantity > 0 && mov.movement_type === 'IN'
                        ? '+'
                        : ''}
                    {mov.quantity}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">
                    {mov.reference_type} #{mov.reference_id}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-muted tabular-nums">
                    {new Date(mov.created_at).toLocaleString('en-GB', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
});
