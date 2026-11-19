import { useCallback, useEffect, useState } from 'react';

export type ThemeId = 'daylight' | 'paper' | 'obsidian' | 'nordic';

export interface ThemeOption {
  id: ThemeId;
  label: string;
  shortLabel: string;
  canvasHex: string;
  surfaceHex: string;
  accentHex: string;
  isDark: boolean;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'daylight',
    label: 'Crisp Daylight',
    shortLabel: 'Daylight',
    canvasHex: '#F8FAFC',
    surfaceHex: '#FFFFFF',
    accentHex: '#1D4ED8',
    isDark: false,
  },
  {
    id: 'paper',
    label: 'Warm Paper',
    shortLabel: 'Paper',
    canvasHex: '#FAF9F6',
    surfaceHex: '#FFFFFF',
    accentHex: '#0F766E',
    isDark: false,
  },
  {
    id: 'obsidian',
    label: 'Obsidian Ops',
    shortLabel: 'Obsidian',
    canvasHex: '#0B0F19',
    surfaceHex: '#111827',
    accentHex: '#3B82F6',
    isDark: true,
  },
  {
    id: 'nordic',
    label: 'Nordic Slate',
    shortLabel: 'Nordic',
    canvasHex: '#131722',
    surfaceHex: '#1A202C',
    accentHex: '#0284C7',
    isDark: true,
  },
];

const STORAGE_KEY = 'ops-agent-theme';

function isValidThemeId(value: string | null): value is ThemeId {
  return (
    value === 'daylight' ||
    value === 'paper' ||
    value === 'obsidian' ||
    value === 'nordic'
  );
}

function readInitialTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValidThemeId(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'daylight';
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage access restrictions
    }
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeId) => {
    setThemeState(nextTheme);
  }, []);

  return {
    theme,
    setTheme,
    options: THEME_OPTIONS,
  };
}
