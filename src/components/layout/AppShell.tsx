import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemeId } from '../../hooks/useTheme.ts';
import { cn } from '../../lib/cn.ts';
import type { InventoryLocation, User, UserRole } from '../../types/domain.ts';
import type { NavTabId } from '../views/OverviewDashboard.tsx';
import { SidebarNav } from './SidebarNav.tsx';
import { TopOperationalBar } from './TopOperationalBar.tsx';

export interface NavBadgeCounts {
  pendingOrders: number;
  lowStockRows: number;
  activeTransfers: number;
  pendingApprovals: number;
}

export interface DriftBannerNotice {
  message: string;
  tone: 'amber' | 'slate';
}

interface AppShellProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  locations: InventoryLocation[];
  selectedLocationId: number | null;
  onSelectLocation: (locationId: number | null) => void;
  users: User[];
  activeUser: User;
  onSwitchRole: (role: UserRole) => void;
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  navCounts: NavBadgeCounts;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
  onSimulateStockDrift: () => void;
  onResetDemoState: () => void;
  driftNotice: DriftBannerNotice | null;
  onDismissDriftNotice: () => void;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  sidebarCollapsed,
  onToggleSidebar,
  locations,
  selectedLocationId,
  onSelectLocation,
  users,
  activeUser,
  onSwitchRole,
  theme,
  onChangeTheme,
  navCounts,
  assistantOpen,
  onToggleAssistant,
  onSimulateStockDrift,
  onResetDemoState,
  driftNotice,
  onDismissDriftNotice,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
        activeUser={activeUser}
        navCounts={navCounts}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopOperationalBar
          locations={locations}
          selectedLocationId={selectedLocationId}
          onSelectLocation={onSelectLocation}
          users={users}
          activeRole={activeUser.role}
          onSwitchRole={onSwitchRole}
          theme={theme}
          onChangeTheme={onChangeTheme}
          pendingApprovalsCount={navCounts.pendingApprovals}
          assistantOpen={assistantOpen}
          onToggleAssistant={onToggleAssistant}
          onSimulateStockDrift={onSimulateStockDrift}
          onResetDemoState={onResetDemoState}
        />

        {driftNotice ? (
          <div
            role="status"
            className={cn(
              'flex items-center justify-between gap-3 border-b px-5 py-2 text-xs',
              driftNotice.tone === 'amber'
                ? 'border-status-amber-border bg-status-amber-bg text-status-amber-text'
                : 'border-hairline bg-subtle text-ink-secondary',
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{driftNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={onDismissDriftNotice}
              aria-label="Dismiss notification"
              className="rounded p-0.5 hover:bg-subtle"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <main className="flex-1 p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
