import type { ReactNode } from 'react';
import { cn } from '../../lib/cn.ts';

export type BadgeTone = 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';

interface StatusBadgeProps {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald:
    'bg-status-emerald-bg border-status-emerald-border text-status-emerald-text',
  amber: 'bg-status-amber-bg border-status-amber-border text-status-amber-text',
  rose: 'bg-status-rose-bg border-status-rose-border text-status-rose-text',
  slate: 'bg-status-slate-bg border-status-slate-border text-status-slate-text',
  blue: 'bg-status-info-bg border-status-info-border text-status-info-text',
};

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
