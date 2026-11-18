import { memo, useCallback, useMemo, useState } from 'react';
import { getInventoryStatus } from '../../services/operationsEngine.ts';
import type {
  InventoryBalance,
  OperationsState,
  Product,
  UpsertProductInput,
} from '../../types/domain.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import {
  InventoryFilterBar,
  type InventoryViewMode,
  type StockHealthFilter,
} from './inventory/InventoryFilterBar.tsx';
import {
  InventoryBalanceTable,
  InventoryMatrixTable,
} from './inventory/InventoryTables.tsx';
import { ProductFormModal } from './inventory/ProductFormModal.tsx';

interface InventoryLocationsViewProps {
  state: OperationsState;
  selectedLocationId: number | null;
  actorUserId: number;
  onAdjustStock: (locationId: number, productId: number, delta: number) => void;
  onUpsertProduct: (input: UpsertProductInput) => string | null;
}

export const InventoryLocationsView = memo(function InventoryLocationsView({
  state,
  selectedLocationId,
  actorUserId,
  onAdjustStock,
  onUpsertProduct,
}: InventoryLocationsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [healthFilter, setHealthFilter] = useState<StockHealthFilter>('ALL');
  const [viewMode, setViewMode] = useState<InventoryViewMode>('BALANCES');
  const [modalState, setModalState] = useState<{
    open: boolean;
    product: Product | null;
    error: string | null;
  }>({ open: false, product: null, error: null });

  const productMap = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products],
  );
  const categoryMap = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c.name])),
    [state.categories],
  );

  const inventoryResult = useMemo(
    () =>
      getInventoryStatus(state, {
        locationId: selectedLocationId,
        categoryId,
      }),
    [state, selectedLocationId, categoryId],
  );

  const summaryCounts = useMemo(() => {
    let healthy = 0;
    let low = 0;
    let out = 0;
    for (const row of inventoryResult.balances) {
      if (row.stockHealth === 'HEALTHY') healthy += 1;
      else if (row.stockHealth === 'LOW_STOCK') low += 1;
      else out += 1;
    }
    return { healthy, low, out };
  }, [inventoryResult.balances]);

  const filteredBalances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventoryResult.balances.filter((row) => {
      if (healthFilter !== 'ALL' && row.stockHealth !== healthFilter) return false;
      if (q.length === 0) return true;
      return (
        row.sku.toLowerCase().includes(q) ||
        row.productName.toLowerCase().includes(q) ||
        row.supplier_name.toLowerCase().includes(q) ||
        row.locationName.toLowerCase().includes(q)
      );
    });
  }, [inventoryResult.balances, healthFilter, searchQuery]);

  const balancesByProductMap = useMemo(() => {
    const map = new Map<number, Map<number, InventoryBalance>>();
    for (const b of state.inventoryBalances) {
      let locMap = map.get(b.product_id);
      if (!locMap) {
        locMap = new Map<number, InventoryBalance>();
        map.set(b.product_id, locMap);
      }
      locMap.set(b.location_id, b);
    }
    return map;
  }, [state.inventoryBalances]);

  const filteredMatrixProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetLocs =
      selectedLocationId != null
        ? state.locations.filter((l) => l.id === selectedLocationId)
        : state.locations;

    return state.products.filter((product) => {
      if (categoryId != null && product.category_id !== categoryId) return false;
      if (q.length > 0) {
        const hit =
          product.sku.toLowerCase().includes(q) ||
          product.name.toLowerCase().includes(q) ||
          product.supplier_name.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (healthFilter === 'ALL') return true;
      const locMap = balancesByProductMap.get(product.id);
      return targetLocs.some((loc) => {
        const b = locMap?.get(loc.id);
        const avail = b ? Math.max(0, b.quantity - b.reserved_quantity) : 0;
        const health =
          avail <= 0
            ? 'OUT_OF_STOCK'
            : avail < product.reorder_threshold
              ? 'LOW_STOCK'
              : 'HEALTHY';
        return health === healthFilter;
      });
    });
  }, [
    state.products,
    state.locations,
    categoryId,
    searchQuery,
    healthFilter,
    balancesByProductMap,
    selectedLocationId,
  ]);

  const handleOpenAddModal = useCallback(() => {
    setModalState({ open: true, product: null, error: null });
  }, []);

  const handleOpenEditModal = useCallback((product: Product) => {
    setModalState({ open: true, product, error: null });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ open: false, product: null, error: null });
  }, []);

  const handleSubmitModal = useCallback(
    (input: UpsertProductInput) => {
      const error = onUpsertProduct(input);
      if (error) {
        setModalState((prev) => ({ ...prev, error }));
        return;
      }
      setModalState({ open: false, product: null, error: null });
    },
    [onUpsertProduct],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Multi-Location Inventory &amp; Product Catalog
          </h1>
          <p className="text-xs text-ink-muted">
            Live inventory_balances across branches &amp; warehouse with optimistic lock versions
            and threshold alerts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="emerald">{summaryCounts.healthy} Healthy</StatusBadge>
          <StatusBadge tone="amber">{summaryCounts.low} Low Stock</StatusBadge>
          <StatusBadge tone="rose">{summaryCounts.out} Out of Stock</StatusBadge>
        </div>
      </div>

      <InventoryFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        healthFilter={healthFilter}
        onHealthChange={setHealthFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        categories={state.categories}
        visibleRowCount={
          viewMode === 'BALANCES' ? filteredBalances.length : filteredMatrixProducts.length
        }
        onAddProduct={handleOpenAddModal}
      />

      <section
        aria-label="Inventory data table"
        className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-xs"
      >
        <div className="overflow-x-auto">
          {viewMode === 'BALANCES' ? (
            <InventoryBalanceTable
              rows={filteredBalances}
              productMap={productMap}
              onAdjustStock={onAdjustStock}
              onEditProduct={handleOpenEditModal}
            />
          ) : (
            <InventoryMatrixTable
              products={filteredMatrixProducts}
              locations={state.locations}
              categoryMap={categoryMap}
              balancesByProductMap={balancesByProductMap}
              onEditProduct={handleOpenEditModal}
            />
          )}
        </div>
      </section>

      {modalState.open ? (
        <ProductFormModal
          key={modalState.product?.id ?? 'new'}
          product={modalState.product}
          categories={state.categories}
          locations={state.locations}
          actorUserId={actorUserId}
          errorMessage={modalState.error}
          onSubmit={handleSubmitModal}
          onClose={handleCloseModal}
        />
      ) : null}
    </div>
  );
});
