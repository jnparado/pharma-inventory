"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

type MonthlyPoint = { month: string; sales: number };
type TodaySlice = { name: string; value: number; color: string };

function formatAxisCurrency(value: number): string {
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₱${Math.round(value / 1_000)}k`;
  return `₱${value}`;
}

function MonthlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div
      className="rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-lg shadow-slate-200/50"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold text-teal-700">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

export function DashboardCharts({
  monthlyData,
  todayBreakdown,
  todayTotal,
}: {
  monthlyData: MonthlyPoint[];
  todayBreakdown: TodaySlice[];
  todayTotal: number;
}) {
  const currentMonthIndex = new Date().getMonth();

  const { ytdTotal, currentMonthSales, peakMonth } = useMemo(() => {
    let peak = { month: "", sales: 0 };
    let ytd = 0;
    for (const row of monthlyData) {
      ytd += row.sales;
      if (row.sales > peak.sales) peak = row;
    }
    return {
      ytdTotal: ytd,
      currentMonthSales: monthlyData[currentMonthIndex]?.sales ?? 0,
      peakMonth: peak,
    };
  }, [monthlyData, currentMonthIndex]);

  const yMax = useMemo(() => {
    const max = Math.max(...monthlyData.map((d) => d.sales), 0);
    if (max === 0) return 1000;
    const padded = max * 1.15;
    const step =
      padded >= 100_000 ? 50_000 : padded >= 10_000 ? 5_000 : padded >= 1_000 ? 500 : 100;
    return Math.ceil(padded / step) * step;
  }, [monthlyData]);

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-5">
      <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-3">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
              Monthly sales
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Revenue by month this year
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                This month
              </p>
              <p className="text-sm font-semibold text-teal-700">
                {formatCurrency(currentMonthSales)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Year to date
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatCurrency(ytdTotal)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-gradient-to-b from-slate-50 to-white p-2 sm:p-3">
          <div className="h-52 min-h-[13rem] w-full min-w-0 sm:h-56">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={monthlyData}
                margin={{ top: 12, right: 4, left: -8, bottom: 0 }}
                barCategoryGap="18%"
              >
                <defs>
                  <linearGradient id="monthBarActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#2dd4bf" />
                  </linearGradient>
                  <linearGradient id="monthBarMuted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#99f6e4" />
                    <stop offset="100%" stopColor="#ccfbf1" />
                  </linearGradient>
                  <linearGradient id="monthBarEmpty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#f1f5f9" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 6"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, yMax]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickFormatter={formatAxisCurrency}
                  width={52}
                />
                <Tooltip
                  cursor={{ fill: "rgba(13, 148, 136, 0.06)", radius: 6 }}
                  content={<MonthlyTooltip />}
                />
                <Bar dataKey="sales" radius={[8, 8, 4, 4]} maxBarSize={28}>
                  {monthlyData.map((entry, i) => (
                    <Cell
                      key={entry.month}
                      fill={
                        entry.sales === 0
                          ? "url(#monthBarEmpty)"
                          : i === currentMonthIndex
                            ? "url(#monthBarActive)"
                            : "url(#monthBarMuted)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {peakMonth.sales > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Best month so far:{" "}
            <span className="font-medium text-slate-700">
              {peakMonth.month}
            </span>
            {" · "}
            {formatCurrency(peakMonth.sales)}
          </p>
        )}
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
          Today&apos;s sales
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">By payment method</p>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="relative h-36 w-full max-w-[9rem] shrink-0 sm:h-40 sm:w-40">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={todayBreakdown}
                  innerRadius={44}
                  outerRadius={64}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {todayBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase text-slate-400">
                  Total
                </p>
                <p className="text-sm font-bold text-slate-800">
                  ₱{todayTotal.toLocaleString("en-PH", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
          <div className="w-full text-center sm:text-left">
            <p className="text-xs text-slate-500">Total today</p>
            <p className="text-xl font-bold text-slate-800 sm:text-2xl">
              {formatCurrency(todayTotal)}
            </p>
            <ul className="mt-3 space-y-2">
              {todayBreakdown.map((s) => (
                <li
                  key={s.name}
                  className="flex items-center justify-center gap-2 text-xs sm:justify-start"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                    style={{ background: s.color }}
                  />
                  <span className="text-slate-600">{s.name}</span>
                  <span className="ml-auto tabular-nums font-medium text-slate-800">
                    {formatCurrency(s.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
