import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  Category,
  InventoryLocation,
  Product,
  UpsertProductInput,
} from '../../../types/domain.ts';
import { ProductFormFields, type ProductFormValues } from './ProductFormFields.tsx';

function buildInitialFormValues(
  product: Product | null,
  categories: Category[],
): ProductFormValues {
  return {
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    categoryId: product?.category_id ?? categories[0]?.id ?? 1,
    unit: product?.unit ?? 'pcs',
    reorderThreshold: String(product?.reorder_threshold ?? 10),
    defaultReorderQty: String(product?.default_reorder_qty ?? 25),
    unitCostJod: String(product?.unit_cost_jod ?? 5.0),
    supplierName: product?.supplier_name ?? 'Levant Network Systems',
    description: product?.description ?? '',
  };
}

function buildInitialOpeningStock(
  locations: InventoryLocation[],
): Record<number, string> {
  const initial: Record<number, string> = {};
  for (const loc of locations) {
    initial[loc.id] = loc.location_type === 'WAREHOUSE' ? '25' : '10';
  }
  return initial;
}

interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  locations: InventoryLocation[];
  actorUserId: number;
  errorMessage: string | null;
  onSubmit: (input: UpsertProductInput) => void;
  onClose: () => void;
}

export function ProductFormModal({
  product,
  categories,
  locations,
  actorUserId,
  errorMessage,
  onSubmit,
  onClose,
}: ProductFormModalProps) {
  const isEditing = product != null;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [form, setForm] = useState<ProductFormValues>(() =>
    buildInitialFormValues(product, categories),
  );
  const [openingQtyByLoc, setOpeningQtyByLoc] = useState<Record<number, string>>(() =>
    buildInitialOpeningStock(locations),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateOpeningQty = useCallback((locationId: number, value: string) => {
    setOpeningQtyByLoc((prev) => ({ ...prev, [locationId]: value }));
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const initialQuantitiesByLocationId: Record<number, number> = {};
    if (!isEditing) {
      for (const loc of locations) {
        const parsed = Number(openingQtyByLoc[loc.id] ?? 0);
        initialQuantitiesByLocationId[loc.id] = Number.isFinite(parsed)
          ? Math.max(0, parsed)
          : 0;
      }
    }

    onSubmit({
      id: product?.id,
      category_id: form.categoryId,
      sku: form.sku,
      name: form.name,
      description: form.description,
      unit: form.unit,
      reorder_threshold: Number(form.reorderThreshold) || 0,
      default_reorder_qty: Math.max(1, Number(form.defaultReorderQty) || 1),
      unit_cost_jod: Number(form.unitCostJod) || 0,
      supplier_name: form.supplierName,
      initialQuantitiesByLocationId: isEditing ? undefined : initialQuantitiesByLocationId,
      actorUserId,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="product-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-xl rounded-lg border border-hairline bg-surface p-0 text-ink shadow-sm backdrop:bg-slate-950/60"
    >
      <header className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div>
          <h2 id="product-modal-title" className="text-sm font-semibold text-ink">
            {isEditing ? `Edit Product — ${product.sku}` : 'Add New Catalog Product'}
          </h2>
          <p className="text-xs text-ink-muted">
            {isEditing
              ? 'Update SKU metadata, safety thresholds, and supplier reference.'
              : 'Creates product record and initializes location balances at v1.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product modal"
          className="rounded-md p-1 text-ink-muted hover:bg-subtle hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-status-rose-border bg-status-rose-bg px-3 py-2 text-xs text-status-rose-text"
          >
            {errorMessage}
          </div>
        ) : null}

        <ProductFormFields
          form={form}
          categories={categories}
          locations={locations}
          isEditing={isEditing}
          openingQtyByLoc={openingQtyByLoc}
          onUpdateField={updateField}
          onUpdateOpeningQty={updateOpeningQty}
        />

        <footer className="flex items-center justify-end gap-2 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-accent px-3.5 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            {isEditing ? 'Save Changes' : 'Create Product'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
