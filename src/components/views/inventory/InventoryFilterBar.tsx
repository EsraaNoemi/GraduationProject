import { Plus, Search } from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../../lib/cn.ts';
import type { Category } from '../../../types/domain.ts';

export type InventoryViewMode = 'BALANCES' | 'MATRIX';
export type StockHealthFilter = 'ALL' | 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';

interface InventoryFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryId: number | null;
  onCategoryChange: (categoryId: number | null) => void;
  healthFilter: StockHealthFilter;
  onHealthChange: (health: StockHealthFilter) => void;
  viewMode: InventoryViewMode;
  onViewModeChange: (mode: InventoryViewMode) => void;
  categories: Category[];
  visibleRowCount: number;
  onAddProduct: () => void;
}

export const InventoryFilterBar = memo(function InventoryFilterBar({
  searchQuery,
  onSearchChange,
  categoryId,
  onCategoryChange,
  healthFilter,
  onHealthChange,
  viewMode,
  onViewModeChange,
  categories,
  visibleRowCount,
  onAddProduct,
}: InventoryFilterBarProps) {
  return (
    <section
      aria-label="Inventory and product catalog filters"
      className="rounded-lg border border-hairline bg-surface p-4 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <label htmlFor="inventory-search-input" className="sr-only">
              Search SKU, product name, or supplier
            </label>
            <input
              id="inventory-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search SKU, product, or supplier..."
              className="w-60 rounded-md border border-hairline-strong bg-surface py-1.5 pr-3 pl-8 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="inventory-category-filter" className="text-xs text-ink-muted">
              Category
            </label>
            <select
              id="inventory-category-filter"
              value={categoryId == null ? 'ALL' : String(categoryId)}
              onChange={(e) =>
                onCategoryChange(e.target.value === 'ALL' ? null : Number(e.target.value))
              }
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="inventory-health-filter" className="text-xs text-ink-muted">
              Stock Health
            </label>
            <select
              id="inventory-health-filter"
              value={healthFilter}
              onChange={(e) => onHealthChange(e.target.value as StockHealthFilter)}
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="HEALTHY">Healthy</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Inventory display mode"
            className="inline-flex rounded-md border border-hairline bg-subtle p-0.5"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('BALANCES')}
              aria-pressed={viewMode === 'BALANCES'}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'BALANCES'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink',
              )}
            >
              Balance Rows
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('MATRIX')}
              aria-pressed={viewMode === 'MATRIX'}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                viewMode === 'MATRIX'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-secondary hover:text-ink',
              )}
            >
              Cross-Location Matrix
            </button>
          </div>

          <button
            type="button"
            onClick={onAddProduct}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5 text-xs text-ink-muted">
        <span>
          {viewMode === 'BALANCES'
            ? 'Showing per-location inventory_balances with optimistic lock versions and inline stock adjustments.'
            : 'Showing unified product catalog matrix across Amman Warehouse, Abdali Branch, and Irbid Hub.'}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-secondary">
          {visibleRowCount} {viewMode === 'BALANCES' ? 'balance rows' : 'SKUs'}
        </span>
      </div>
    </section>
  );
});
