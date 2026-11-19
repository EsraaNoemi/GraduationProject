import { memo } from 'react';
import { THEME_OPTIONS, type ThemeId } from '../../hooks/useTheme.ts';
import { cn } from '../../lib/cn.ts';

interface ThemeSwitcherProps {
  theme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
}

export const ThemeSwitcher = memo(function ThemeSwitcher({
  theme,
  onChangeTheme,
}: ThemeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Workspace color theme"
      className="inline-flex items-center rounded-md border border-hairline bg-subtle p-0.5"
    >
      {THEME_OPTIONS.map((opt) => {
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeTheme(opt.id)}
            aria-pressed={isActive}
            title={`${opt.label} theme`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors',
              isActive
                ? 'bg-surface text-ink shadow-xs'
                : 'text-ink-secondary hover:text-ink',
            )}
          >
            <span
              aria-hidden="true"
              className="relative flex h-3 w-3 shrink-0 overflow-hidden rounded-sm border border-hairline-strong"
              style={{ backgroundColor: opt.canvasHex }}
            >
              <span
                className="ml-auto h-full w-1.5"
                style={{ backgroundColor: opt.accentHex }}
              />
            </span>
            <span className="hidden xl:inline">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
});
