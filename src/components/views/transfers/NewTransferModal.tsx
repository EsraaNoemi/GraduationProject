import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type {
  CreateStockTransferInput,
  InventoryBalance,
  InventoryLocation,
  Product,
} from '../../../types/domain.ts';

interface NewTransferModalProps {
  locations: InventoryLocation[];
  products: Product[];
  balances: InventoryBalance[];
  actorUserId: number;
  errorMessage: string | null;
  onSubmit: (input: CreateStockTransferInput) => void;
  onClose: () => void;
}

export function NewTransferModal({
  locations,
  products,
  balances,
  actorUserId,
  errorMessage,
  onSubmit,
  onClose,
}: NewTransferModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [sourceLocationId, setSourceLocationId] = useState<number>(
    locations[0]?.id ?? 1,
  );
  const [destinationLocationId, setDestinationLocationId] = useState<number>(
    locations[1]?.id ?? 2,
  );
  const [productId, setProductId] = useState<number>(products[7]?.id ?? products[0]?.id ?? 1);
  const [quantity, setQuantity] = useState('10');
  const [transferDate, setTransferDate] = useState('2026-11-18');
  const [notes, setNotes] = useState('Inter-location replenishment transfer');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const sourceAvailable = useMemo(() => {
    const balance = balances.find(
      (b) => b.location_id === sourceLocationId && b.product_id === productId,
    );
    return balance ? Math.max(0, balance.quantity - balance.reserved_quantity) : 0;
  }, [balances, sourceLocationId, productId]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      sourceLocationId,
      destinationLocationId,
      transferDate,
      notes,
      items: [{ productId, quantity: Number(quantity) || 0 }],
      actorUserId,
    });
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="new-transfer-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-full max-w-lg rounded-lg border border-hairline bg-surface p-0 text-ink shadow-sm backdrop:bg-slate-950/60"
    >
      <header className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
        <div>
          <h2 id="new-transfer-modal-title" className="text-sm font-semibold text-ink">
            New Inter-Location Stock Transfer Draft
          </h2>
          <p className="text-xs text-ink-muted">
            Creates a DRAFT transfer requiring Manager approval before dispatch.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close new transfer modal"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="trf-source"
              className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
            >
              Source Location
            </label>
            <select
              id="trf-source"
              value={String(sourceLocationId)}
              onChange={(e) => setSourceLocationId(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="trf-dest"
              className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
            >
              Destination Location
            </label>
            <select
              id="trf-dest"
              value={String(destinationLocationId)}
              onChange={(e) => setDestinationLocationId(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.code} — {loc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="trf-product"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Product SKU
          </label>
          <select
            id="trf-product"
            value={String(productId)}
            onChange={(e) => setProductId(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            {products.map((prod) => (
              <option key={prod.id} value={String(prod.id)}>
                {prod.sku} — {prod.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink-muted tabular-nums">
            Available at source:{' '}
            <strong className="font-mono text-ink">
              {sourceAvailable} {selectedProduct?.unit ?? 'pcs'}
            </strong>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="trf-qty"
              className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
            >
              Transfer Quantity
            </label>
            <input
              id="trf-qty"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs tabular-nums text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="trf-date"
              className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
            >
              Transfer Date
            </label>
            <input
              id="trf-date"
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="trf-notes"
            className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Operational Notes
          </label>
          <textarea
            id="trf-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          />
        </div>

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
            Create Transfer Draft
          </button>
        </footer>
      </form>
    </dialog>
  );
}
