import { lazy, memo, Suspense } from 'react';

export interface LocationHealthDatum {
  locationCode: string;
  locationName: string;
  healthy: number;
  lowStock: number;
  outOfStock: number;
}

interface LocationStockHealthChartProps {
  data: LocationHealthDatum[];
}

const LazyStockHealthBarChart = lazy(async () => {
  const {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = await import('recharts');

  function StockHealthBarChartInner({ data }: { data: LocationHealthDatum[] }) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="locationName"
            tick={{ fill: 'var(--chart-tick)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--chart-tick-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            contentStyle={{
              backgroundColor: 'var(--chart-tooltip-bg)',
              borderColor: 'var(--chart-tooltip-border)',
              color: 'var(--chart-tooltip-text)',
              borderRadius: '6px',
              fontSize: '12px',
              boxShadow: 'var(--shadow-card)',
            }}
            itemStyle={{ color: 'var(--chart-tooltip-text)' }}
            labelStyle={{ color: 'var(--chart-tooltip-text)', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: 'var(--chart-tick)' }}
            iconType="square"
            iconSize={10}
          />
          <Bar
            dataKey="healthy"
            name="Healthy Stock"
            stackId="health"
            fill="var(--chart-emerald)"
            radius={[0, 0, 0, 0]}
            barSize={36}
          />
          <Bar
            dataKey="lowStock"
            name="Low Stock (< Threshold)"
            stackId="health"
            fill="var(--chart-amber)"
            radius={[0, 0, 0, 0]}
            barSize={36}
          />
          <Bar
            dataKey="outOfStock"
            name="Out of Stock"
            stackId="health"
            fill="var(--chart-rose)"
            radius={[4, 4, 0, 0]}
            barSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return { default: StockHealthBarChartInner };
});

export const LocationStockHealthChart = memo(function LocationStockHealthChart({
  data,
}: LocationStockHealthChartProps) {
  return (
    <section
      aria-label="Stock health distribution by location"
      className="rounded-lg border border-hairline bg-surface p-5 shadow-xs"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Stock Health &amp; Shortage Distribution by Location
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            SKU balance counts evaluated against deterministic safety reorder thresholds
          </p>
        </div>
        <span className="rounded-md border border-hairline bg-subtle px-2 py-0.5 font-mono text-[11px] font-medium text-ink-secondary tabular-nums">
          {data.length} {data.length === 1 ? 'Location' : 'Locations'}
        </span>
      </div>

      <div className="h-64 w-full">
        <Suspense fallback={<div className="h-full w-full rounded bg-subtle" />}>
          <LazyStockHealthBarChart data={data} />
        </Suspense>
      </div>
    </section>
  );
});
