import { ArrowRightLeft, Plus, X } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { cn } from '../../lib/cn.ts';
import type {
  CreateStockTransferInput,
  OperationsState,
  StockTransferItem,
  TransferStatus,
  UserRole,
} from '../../types/domain.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { NewTransferModal } from './transfers/NewTransferModal.tsx';
import { StockMovementLedgerTable } from './transfers/StockMovementLedgerTable.tsx';
import { StockTransferCard } from './transfers/StockTransferCard.tsx';

export interface TransferActionFeedback {
  tone: 'emerald' | 'rose' | 'blue';
  message: string;
}

interface StockTransfersViewProps {
  state: OperationsState;
  selectedLocationId: number | null;
  activeRole: UserRole;
  actorUserId: number;
  feedback: TransferActionFeedback | null;
  onDismissFeedback: () => void;
  onAdvanceStatus: (transferId: number, nextStatus: TransferStatus) => void;
  onCreateTransfer: (input: CreateStockTransferInput) => string | null;
}

const STATUS_TABS: Array<TransferStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'APPROVED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
];

export const StockTransfersView = memo(function StockTransfersView({
  state,
  selectedLocationId,
  activeRole,
  actorUserId,
  feedback,
  onDismissFeedback,
  onAdvanceStatus,
  onCreateTransfer,
}: StockTransfersViewProps) {
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'ALL'>('ALL');
  const [modalState, setModalState] = useState<{ open: boolean; error: string | null }>({
    open: false,
    error: null,
  });

  const locationMap = useMemo(
    () => new Map(state.locations.map((l) => [l.id, l])),
    [state.locations],
  );
  const userMap = useMemo(() => new Map(state.users.map((u) => [u.id, u])), [state.users]);
  const productMap = useMemo(
    () => new Map(state.products.map((p) => [p.id, p])),
    [state.products],
  );

  const itemsByTransferId = useMemo(() => {
    const map = new Map<number, StockTransferItem[]>();
    for (const item of state.stockTransferItems) {
      const list = map.get(item.transfer_id) ?? [];
      list.push(item);
      map.set(item.transfer_id, list);
    }
    return map;
  }, [state.stockTransferItems]);

  const locationFilteredTransfers = useMemo(
    () =>
      state.stockTransfers.filter((t) => {
        if (
          selectedLocationId != null &&
          t.source_location_id !== selectedLocationId &&
          t.destination_location_id !== selectedLocationId
        ) {
          return false;
        }
        return true;
      }),
    [state.stockTransfers, selectedLocationId],
  );

  const visibleTransfers = useMemo(
    () =>
      locationFilteredTransfers.filter(
        (t) => statusFilter === 'ALL' || t.status === statusFilter,
      ),
    [locationFilteredTransfers, statusFilter],
  );

  const visibleMovements = useMemo(
    () =>
      selectedLocationId == null
        ? state.stockMovements
        : state.stockMovements.filter((m) => m.location_id === selectedLocationId),
    [state.stockMovements, selectedLocationId],
  );

  const handleOpenModal = useCallback(() => {
    setModalState({ open: true, error: null });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ open: false, error: null });
  }, []);

  const handleSubmitTransfer = useCallback(
    (input: CreateStockTransferInput) => {
      const error = onCreateTransfer(input);
      if (error) {
        setModalState({ open: true, error });
        return;
      }
      setModalState({ open: false, error: null });
    },
    [onCreateTransfer],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Inter-Location Stock Transfers &amp; Movement Ledger
          </h1>
          <p className="text-xs text-ink-muted">
            Controlled transfer workflow (DRAFT → APPROVED → IN_TRANSIT → COMPLETED) backed by
            `ERD-v1.dbml`
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge tone="slate">
            {locationFilteredTransfers.length} Transfers
          </StatusBadge>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Transfer Draft</span>
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          role="status"
          className={cn(
            'flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-xs',
            feedback.tone === 'emerald'
              ? 'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text'
              : feedback.tone === 'rose'
                ? 'border-status-rose-border bg-status-rose-bg text-status-rose-text'
                : 'border-status-info-border bg-status-info-bg text-status-info-text',
          )}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={onDismissFeedback}
            aria-label="Dismiss transfer feedback"
            className="rounded p-0.5 hover:bg-subtle"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Filter transfers by status"
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-hairline bg-surface p-2.5 shadow-xs"
      >
        {STATUS_TABS.map((status) => {
          const isActive = statusFilter === status;
          const count =
            status === 'ALL'
              ? locationFilteredTransfers.length
              : locationFilteredTransfers.filter((t) => t.status === status).length;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={isActive}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-accent-border bg-accent-subtle text-accent-ink'
                  : 'border-transparent text-ink-secondary hover:bg-subtle hover:text-ink',
              )}
            >
              <span>{status}</span>
              <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {visibleTransfers.length === 0 ? (
          <div className="rounded-lg border border-hairline bg-surface p-8 text-center text-xs text-ink-muted shadow-xs">
            <ArrowRightLeft
              className="mx-auto mb-1.5 h-5 w-5 text-ink-muted"
              aria-hidden="true"
            />
            No stock transfers match the active location and status filter.
          </div>
        ) : (
          visibleTransfers.map((transfer) => (
            <StockTransferCard
              key={transfer.id}
              transfer={transfer}
              items={itemsByTransferId.get(transfer.id) ?? []}
              sourceName={
                locationMap.get(transfer.source_location_id)?.name ??
                `Location #${transfer.source_location_id}`
              }
              destinationName={
                locationMap.get(transfer.destination_location_id)?.name ??
                `Location #${transfer.destination_location_id}`
              }
              creatorName={
                userMap.get(transfer.created_by_user_id)?.full_name ??
                `User #${transfer.created_by_user_id}`
              }
              approverName={
                transfer.approved_by_user_id != null
                  ? (userMap.get(transfer.approved_by_user_id)?.full_name ??
                    `User #${transfer.approved_by_user_id}`)
                  : null
              }
              productMap={productMap}
              activeRole={activeRole}
              onAdvanceStatus={onAdvanceStatus}
            />
          ))
        )}
      </div>

      <StockMovementLedgerTable
        movements={visibleMovements}
        locations={state.locations}
        products={state.products}
      />

      {modalState.open ? (
        <NewTransferModal
          locations={state.locations}
          products={state.products}
          balances={state.inventoryBalances}
          actorUserId={actorUserId}
          errorMessage={modalState.error}
          onSubmit={handleSubmitTransfer}
          onClose={handleCloseModal}
        />
      ) : null}
    </div>
  );
});
