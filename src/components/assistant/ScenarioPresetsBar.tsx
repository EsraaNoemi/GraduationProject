import { Play, Terminal } from 'lucide-react';
import { memo, useState, type FormEvent } from 'react';

interface ScenarioPreset {
  id: string;
  label: string;
  prompt: string;
  locationId: number | null;
  preferTransfer?: boolean;
  isStaleConflictTest?: boolean;
}

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'standard-orders',
    label: '1. Pending Orders & Reorder',
    prompt: "Review today's pending orders, flag shortages, and prepare a supplier reorder draft.",
    locationId: null,
  },
  {
    id: 'abdali-contention',
    label: '2. Abdali High-Priority Contention',
    prompt: 'Check feasibility for all high-priority orders at Abdali Branch and calculate cumulative shortages.',
    locationId: 2,
  },
  {
    id: 'ambiguous-thermal',
    label: '3. Ambiguous: "thermal paper"',
    prompt: 'Check thermal paper stock and prepare a reorder draft for 50 rolls.',
    locationId: 2,
  },
  {
    id: 'missing-qty',
    label: '4. Missing Qty: Cat6 UTP',
    prompt: 'Prepare an urgent reorder draft for Cat6 UTP Patch Cable 5m.',
    locationId: 2,
  },
  {
    id: 'warehouse-transfer',
    label: '5. Warehouse Transfer Option',
    prompt: 'Check if Abdali Branch order shortages can be covered by Amman Main Warehouse stock transfer.',
    locationId: 2,
    preferTransfer: true,
  },
  {
    id: 'stale-conflict',
    label: '6. TOCTOU Stale Conflict Test',
    prompt: 'Stage Abdali draft and simulate concurrent stock mutation to trigger 409 STALE_CONFLICT.',
    locationId: 2,
    isStaleConflictTest: true,
  },
];

interface ScenarioPresetsBarProps {
  selectedLocationId: number | null;
  onExecuteCommand: (params: {
    prompt: string;
    locationId: number | null;
    preferTransfer?: boolean;
  }) => void;
  onRunStaleConflictTest: () => void;
}

export const ScenarioPresetsBar = memo(function ScenarioPresetsBar({
  selectedLocationId,
  onExecuteCommand,
  onRunStaleConflictTest,
}: ScenarioPresetsBarProps) {
  const [commandText, setCommandText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = commandText.trim();
    if (!trimmed) return;
    onExecuteCommand({
      prompt: trimmed,
      locationId: selectedLocationId,
    });
    setCommandText('');
  };

  return (
    <section
      aria-label="Operations command input and evaluation presets"
      className="space-y-3 rounded-lg border border-hairline bg-subtle p-3.5"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <label
          htmlFor="assistant-command-input"
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary"
        >
          <Terminal className="h-3.5 w-3.5 text-accent-ink" aria-hidden="true" />
          <span>Natural-Language Operations Command</span>
        </label>
        <div className="flex gap-2">
          <input
            id="assistant-command-input"
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            placeholder="e.g. Check thermal paper stock or review Abdali orders..."
            className="min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={commandText.trim().length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3 w-3" aria-hidden="true" />
            <span>Execute</span>
          </button>
        </div>
      </form>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Proposal Section 7 Evaluation Scenarios
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                if (preset.isStaleConflictTest) {
                  onRunStaleConflictTest();
                  return;
                }
                onExecuteCommand({
                  prompt: preset.prompt,
                  locationId: preset.locationId,
                  preferTransfer: preset.preferTransfer,
                });
              }}
              className="rounded-md border border-hairline-strong bg-surface px-2 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:border-accent-border hover:bg-accent-subtle hover:text-accent-ink"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
});
