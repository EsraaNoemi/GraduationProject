import type { Category, InventoryLocation } from '../../../types/domain.ts';

export interface ProductFormValues {
  sku: string;
  name: string;
  categoryId: number;
  unit: string;
  reorderThreshold: string;
  defaultReorderQty: string;
  unitCostJod: string;
  supplierName: string;
  description: string;
}

interface ProductFormFieldsProps {
  form: ProductFormValues;
  categories: Category[];
  locations: InventoryLocation[];
  isEditing: boolean;
  openingQtyByLoc: Record<number, string>;
  onUpdateField: <K extends keyof ProductFormValues>(
    field: K,
    value: ProductFormValues[K],
  ) => void;
  onUpdateOpeningQty: (locationId: number, value: string) => void;
}

export function ProductFormFields({
  form,
  categories,
  locations,
  isEditing,
  openingQtyByLoc,
  onUpdateField,
  onUpdateOpeningQty,
}: ProductFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="prod-sku"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            SKU Code
          </label>
          <input
            id="prod-sku"
            type="text"
            required
            value={form.sku}
            onChange={(e) => onUpdateField('sku', e.target.value)}
            placeholder="e.g. NET-CAT6A-10M"
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="prod-category"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Category
          </label>
          <select
            id="prod-category"
            value={String(form.categoryId)}
            onChange={(e) => onUpdateField('categoryId', Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="prod-name"
          className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
        >
          Product Name
        </label>
        <input
          id="prod-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => onUpdateField('name', e.target.value)}
          placeholder="e.g. Cat6A Shielded Patch Cable 10m"
          className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label
            htmlFor="prod-unit"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Unit
          </label>
          <input
            id="prod-unit"
            type="text"
            required
            value={form.unit}
            onChange={(e) => onUpdateField('unit', e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="prod-threshold"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Reorder Min
          </label>
          <input
            id="prod-threshold"
            type="number"
            min={0}
            required
            value={form.reorderThreshold}
            onChange={(e) => onUpdateField('reorderThreshold', e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="prod-lot"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Default Lot
          </label>
          <input
            id="prod-lot"
            type="number"
            min={1}
            required
            value={form.defaultReorderQty}
            onChange={(e) => onUpdateField('defaultReorderQty', e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="prod-cost"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Cost (JOD)
          </label>
          <input
            id="prod-cost"
            type="number"
            min={0}
            step="0.01"
            required
            value={form.unitCostJod}
            onChange={(e) => onUpdateField('unitCostJod', e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="prod-supplier"
          className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
        >
          Primary Supplier
        </label>
        <input
          id="prod-supplier"
          type="text"
          required
          value={form.supplierName}
          onChange={(e) => onUpdateField('supplierName', e.target.value)}
          className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="prod-desc"
          className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
        >
          Description
        </label>
        <textarea
          id="prod-desc"
          rows={2}
          value={form.description}
          onChange={(e) => onUpdateField('description', e.target.value)}
          className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {!isEditing ? (
        <div className="rounded-md border border-hairline bg-subtle p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
            Opening Physical Stock by Location
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {locations.map((loc) => (
              <div key={loc.id}>
                <label
                  htmlFor={`open-qty-${loc.id}`}
                  className="block truncate text-[11px] text-ink-secondary"
                >
                  {loc.code} ({loc.location_type})
                </label>
                <input
                  id={`open-qty-${loc.id}`}
                  type="number"
                  min={0}
                  value={openingQtyByLoc[loc.id] ?? '0'}
                  onChange={(e) => onUpdateOpeningQty(loc.id, e.target.value)}
                  className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2 py-1 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
