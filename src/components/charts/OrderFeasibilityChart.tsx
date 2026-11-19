import { lazy, memo, Suspense } from 'react';

export interface FeasibilityBreakdownDatum {
  statusLabel: string;
  orderCount: number;
  requestedUnits: number;
  allocatedUnits: number;
  shortageUnits: number;
  fillColor: string;
}

interface OrderFeasibilityChartProps {
  data: FeasibilityBreakdownDatum[];
  totalOrders: number;
  feasibilityRatePct: number;
}

const LazyOrderFeasibilityBarChart = lazy(async () => {
  const {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
  } = await import('recharts');

  function OrderFeasibilityBarChartInner({
    data,
  }: {
    data: FeasibilityBreakdownDatum[];
  }) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 12, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: 'var(--chart-tick-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="statusLabel"
            width={118}
            tick={{ fill: 'var(--chart-tick)', fontSize: 12, fontWeight: 500 }}
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
          <Bar dataKey="orderCount" name="Orders" radius={[0, 4, 4, 0]} barSize={22}>
            {data.map((entry) => (
              <Cell key={entry.statusLabel} fill={entry.fillColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return { default: OrderFeasibilityBarChartInner };
});

export const OrderFeasibilityChart = memo(function OrderFeasibilityChart({
  data,
  totalOrders,
  feasibilityRatePct,
}: OrderFeasibilityChartProps) {
  const totalRequested = data.reduce((sum, d) => sum + d.requestedUnits, 0);
  const totalAllocated = data.reduce((sum, d) => sum + d.allocatedUnits, 0);
  const unitCoveragePct =
    totalRequested > 0 ? Math.round((totalAllocated / totalRequested) * 100) : 100;

  return (
    <section
      aria-label="Order fulfillment feasibility breakdown"
      className="rounded-lg border border-hairline bg-surface p-5 shadow-xs"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Order Fulfillment Feasibility Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Cumulative FIFO &amp; priority allocation across active pending orders
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-ink tabular-nums">
            {feasibilityRatePct}% Full
          </span>
          <p className="text-[11px] text-ink-muted tabular-nums">
            {unitCoveragePct}% unit coverage ({totalAllocated}/{totalRequested})
          </p>
        </div>
      </div>

      <div className="h-44 w-full">
        <Suspense fallback={<div className="h-full w-full rounded bg-subtle" />}>
          <LazyOrderFeasibilityBarChart data={data} />
        </Suspense>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
        {data.map((row) => {
          const sharePct = totalOrders > 0 ? Math.round((row.orderCount / totalOrders) * 100) : 0;
          return (
            <div key={row.statusLabel} className="rounded-md bg-subtle px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-secondary">
                  {row.statusLabel}
                </span>
                <span className="font-mono text-xs font-semibold text-ink tabular-nums">
                  {row.orderCount} ({sharePct}%)
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink-muted tabular-nums">
                Alloc {row.allocatedUnits} · Short {row.shortageUnits}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
});
