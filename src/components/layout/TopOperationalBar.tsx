import {
  AlertTriangle,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { memo } from 'react';
import type { ThemeId } from '../../hooks/useTheme.ts';
import { cn } from '../../lib/cn.ts';
import type { InventoryLocation, User, UserRole } from '../../types/domain.ts';
import { ThemeSwitcher } from './ThemeSwitcher.tsx';

interface TopOperationalBarProps {
  locations: InventoryLocation[];
  selectedLocationId: number | null;
  onSelectLocation: (locationId: number | null) => void;
  users: User[];
  activeRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  pendingApprovalsCount: number;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
  onSimulateStockDrift: () => void;
  onResetDemoState: () => void;
}

export const TopOperationalBar = memo(function TopOperationalBar({
  locations,
  selectedLocationId,
  onSelectLocation,
  users,
  activeRole,
  onSwitchRole,
  theme,
  onChangeTheme,
  pendingApprovalsCount,
  assistantOpen,
  onToggleAssistant,
  onSimulateStockDrift,
  onResetDemoState,
}: TopOperationalBarProps) {
  const employeeUser = users.find((u) => u.role === 'EMPLOYEE');
  const managerUser = users.find((u) => u.role === 'MANAGER');

  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center justify-between gap-2.5 border-b border-hairline bg-surface px-5 py-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <label
            htmlFor="location-context-select"
            className="text-xs font-medium text-ink-secondary"
          >
            Location
          </label>
          <select
            id="location-context-select"
            value={selectedLocationId == null ? 'ALL' : String(selectedLocationId)}
            onChange={(e) => {
              const val = e.target.value;
              onSelectLocation(val === 'ALL' ? null : Number(val));
            }}
            className="rounded-md border border-hairline-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink focus:border-accent focus:outline-none"
          >
            <option value="ALL">All Locations ({locations.length})</option>
            {locations.map((loc) => (
              <option key={loc.id} value={String(loc.id)}>
                {loc.code} — {loc.name} ({loc.location_type})
              </option>
            ))}
          </select>
        </div>

        <ThemeSwitcher theme={theme} onChangeTheme={onChangeTheme} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="RBAC Role Switcher"
          className="inline-flex items-center rounded-md border border-hairline bg-subtle p-0.5"
        >
          <button
            type="button"
            onClick={() => onSwitchRole('EMPLOYEE')}
            aria-pressed={activeRole === 'EMPLOYEE'}
            title={
              employeeUser ? `${employeeUser.full_name} — Read & Draft Only` : 'EMPLOYEE'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              activeRole === 'EMPLOYEE'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink',
            )}
          >
            <Lock className="h-3 w-3 text-status-amber-text" aria-hidden="true" />
            <span>Employee</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchRole('MANAGER')}
            aria-pressed={activeRole === 'MANAGER'}
            title={
              managerUser
                ? `${managerUser.full_name} — Full Approval & Commit Authority`
                : 'MANAGER'
            }
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              activeRole === 'MANAGER'
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink',
            )}
          >
            <ShieldCheck
              className="h-3 w-3 text-status-emerald-text"
              aria-hidden="true"
            />
            <span>Manager</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSimulateStockDrift}
          title="Simulate a concurrent POS/warehouse stock update to increment inventory version and test 409 STALE_CONFLICT guard"
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          <AlertTriangle
            className="h-3.5 w-3.5 text-status-amber-text"
            aria-hidden="true"
          />
          <span className="hidden md:inline">Simulate Stock Drift</span>
        </button>

        <button
          type="button"
          onClick={onResetDemoState}
          aria-label="Reset demo dataset"
          title="Reset demo dataset to initial seed state"
          className="inline-flex items-center justify-center rounded-md border border-hairline-strong bg-surface p-1.5 text-ink-secondary hover:bg-subtle hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleAssistant}
          aria-expanded={assistantOpen}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            assistantOpen
              ? 'border-accent bg-accent text-white'
              : 'border-hairline-strong bg-surface text-ink hover:bg-subtle',
          )}
        >
          <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Assistant</span>
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
              assistantOpen
                ? 'border-white/25 bg-black/20 text-white'
                : 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
            )}
          >
            {pendingApprovalsCount}
          </span>
        </button>
      </div>
    </header>
  );
});
