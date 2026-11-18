import {
  ArrowRight,
  CheckCircle2,
  Lock,
  PackageCheck,
  Truck,
  XCircle,
} from 'lucide-react';
import { memo } from 'react';
import type {
  Product,
  StockTransfer,
  StockTransferItem,
  TransferStatus,
  UserRole,
} from '../../../types/domain.ts';
import { StatusBadge, type BadgeTone } from '../../common/StatusBadge.tsx';

interface StockTransferCardProps {
  transfer: StockTransfer;
  items: StockTransferItem[];
  sourceName: string;
  destinationName: string;
  creatorName: string;
  approverName: string | null;
  productMap: Map<number, Product>;
  activeRole: UserRole;
  onAdvanceStatus: (transferId: number, nextStatus: TransferStatus) => void;
}

function transferStatusTone(status: TransferStatus): BadgeTone {
  switch (status) {
    case 'COMPLETED':
      return 'emerald';
    case 'APPROVED':
      return 'blue';
    case 'IN_TRANSIT':
      return 'amber';
    case 'DRAFT':
      return 'slate';
    case 'CANCELLED':
      return 'rose';
  }
}

export const StockTransferCard = memo(function StockTransferCard({
  transfer,
  items,
  sourceName,
  destinationName,
  creatorName,
  approverName,
  productMap,
  activeRole,
  onAdvanceStatus,
}: StockTransferCardProps) {
  const isManager = activeRole === 'MANAGER';

  return (
    <article className="rounded-lg border border-hairline bg-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-ink">
              {transfer.transfer_number}
            </span>
            <StatusBadge tone={transferStatusTone(transfer.status)}>
              {transfer.status}
            </StatusBadge>
            <span className="font-mono text-[11px] text-ink-muted tabular-nums">
              {transfer.transfer_date}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium text-ink">
            <span>{sourceName}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
            <span>{destinationName}</span>
          </div>

          <p className="mt-1 text-xs text-ink-secondary">{transfer.notes}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transfer.status === 'DRAFT' ? (
            <>
              <button
                type="button"
                onClick={() => onAdvanceStatus(transfer.id, 'APPROVED')}
                title={
                  isManager
                    ? 'Approve transfer for dispatch'
                    : 'Manager role required — click to verify RBAC enforcement'
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
              >
                {isManager ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>Approve Transfer</span>
              </button>
              <button
                type="button"
                onClick={() => onAdvanceStatus(transfer.id, 'CANCELLED')}
                className="inline-flex items-center gap-1 rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
              >
                <XCircle
                  className="h-3.5 w-3.5 text-status-rose-text"
                  aria-hidden="true"
                />
                <span>Cancel</span>
              </button>
            </>
          ) : null}

          {transfer.status === 'APPROVED' ? (
            <button
              type="button"
              onClick={() => onAdvanceStatus(transfer.id, 'IN_TRANSIT')}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dispatch (IN_TRANSIT)</span>
            </button>
          ) : null}

          {transfer.status === 'IN_TRANSIT' ? (
            <button
              type="button"
              onClick={() => onAdvanceStatus(transfer.id, 'COMPLETED')}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
            >
              <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Confirm Receipt (COMPLETED)</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-md border border-hairline bg-subtle/70">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-1.5">SKU</th>
              <th className="px-3 py-1.5">Product</th>
              <th className="px-3 py-1.5 text-right">Transfer Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-xs">
            {items.map((item) => {
              const product = productMap.get(item.product_id);
              return (
                <tr key={item.id}>
                  <td className="px-3 py-1.5 font-mono text-[11px] font-semibold text-ink">
                    {product?.sku ?? `SKU-${item.product_id}`}
                  </td>
                  <td className="px-3 py-1.5 text-ink-secondary">
                    {product?.name ?? `Product #${item.product_id}`}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-medium tabular-nums text-ink">
                    {item.quantity} {product?.unit ?? 'pcs'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
        <span>
          Prepared by <strong className="text-ink-secondary">{creatorName}</strong>
          {approverName ? (
            <>
              {' '}
              · Approved by <strong className="text-ink-secondary">{approverName}</strong>
            </>
          ) : null}
        </span>
        {transfer.completed_at ? (
          <span className="font-mono tabular-nums">
            Completed {new Date(transfer.completed_at).toLocaleString('en-GB')}
          </span>
        ) : null}
      </div>
    </article>
  );
});
