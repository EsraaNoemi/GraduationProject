import {
  ArrowRightLeft,
  Boxes,
  ClipboardCheck,
  LayoutDashboard,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { memo } from 'react';
import { cn } from '../../lib/cn.ts';
import type { User } from '../../types/domain.ts';
import type { NavTabId } from '../views/OverviewDashboard.tsx';
import type { NavBadgeCounts } from './AppShell.tsx';

interface NavItemConfig {
  id: NavTabId;
  label: string;
  icon: typeof LayoutDashboard;
  countKey?: keyof NavBadgeCounts;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  {
    id: 'orders',
    label: 'Orders & Feasibility',
    icon: PackageCheck,
    countKey: 'pendingOrders',
  },
  {
    id: 'inventory',
    label: 'Inventory & Locations',
    icon: Boxes,
    countKey: 'lowStockRows',
  },
  {
    id: 'transfers',
    label: 'Stock Transfers',
    icon: ArrowRightLeft,
    countKey: 'activeTransfers',
  },
  {
    id: 'approvals',
    label: 'Approvals & Audit',
    icon: ClipboardCheck,
    countKey: 'pendingApprovals',
  },
];

interface SidebarNavProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeUser: User;
  navCounts: NavBadgeCounts;
}

export const SidebarNav = memo(function SidebarNav({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  activeUser,
  navCounts,
}: SidebarNavProps) {
  const isManager = activeUser.role === 'MANAGER';

  return (
    <aside
      aria-label="Primary operational navigation"
      className={cn(
        'sticky top-0 flex h-screen shrink-0 flex-col border-r border-hairline bg-surface transition-[width] duration-150',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div
        className={cn(
          'flex h-14 items-center border-b border-hairline',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="rounded-md p-1.5 text-ink-secondary hover:bg-subtle hover:text-ink"
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-ink">
                AI Operations Agent
              </p>
              <p className="truncate font-mono text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                v2.0 CIS Workbench
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="rounded-md p-1.5 text-ink-muted hover:bg-subtle hover:text-ink"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const count = item.countKey ? navCounts[item.countKey] : null;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors',
                collapsed ? 'justify-center' : 'justify-between gap-2',
                isActive
                  ? 'border border-accent-border bg-accent-subtle text-accent-ink'
                  : 'border border-transparent text-ink-secondary hover:bg-subtle hover:text-ink',
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive ? 'text-accent-ink' : 'text-ink-muted',
                  )}
                  aria-hidden="true"
                />
                {collapsed ? null : <span className="truncate">{item.label}</span>}
              </span>

              {!collapsed && count != null ? (
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                    isActive
                      ? 'border border-accent-border bg-surface text-accent-ink'
                      : 'bg-subtle text-ink-secondary',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-hairline p-3">
        {collapsed ? (
          <div
            title={`${activeUser.full_name} (${activeUser.role})`}
            className="flex justify-center"
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border font-mono text-xs font-semibold',
                isManager
                  ? 'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text'
                  : 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
              )}
            >
              {isManager ? 'M' : 'E'}
            </span>
          </div>
        ) : (
          <div className="rounded-md border border-hairline bg-subtle p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-ink">
                {activeUser.full_name}
              </span>
              <span
                className={cn(
                  'rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                  isManager
                    ? 'border-status-emerald-border bg-status-emerald-bg text-status-emerald-text'
                    : 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
                )}
              >
                {activeUser.role}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-ink-muted">
              {activeUser.email}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
});
