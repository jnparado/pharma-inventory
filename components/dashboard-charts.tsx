"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

type MonthlyPoint = { month: string; sales: number };
type TodaySlice = { name: string; value: number; color: string };

export function DashboardCharts({
  monthlyData,
  todayBreakdown,
  todayTotal,
}: {
  monthlyData: MonthlyPoint[];
  todayBreakdown: TodaySlice[];
  todayTotal: number;
}) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-5">
      <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 lg:col-span-3">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
            Monthly Progress
          </h3>
          <span className="shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-500">
            Monthly
          </span>
        </div>
        <div className="h-56 min-h-[14rem] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={monthlyData} barSize={14}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, i) => (
                  <Cell
                    key={entry.month}
                    fill={
                      i === new Date().getMonth() ? "#0d9488" : "#86efac"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
        <h3 className="mb-1 text-sm font-semibold text-slate-800 sm:text-base">
          Today&apos;s Report
        </h3>
        <p className="mb-4 text-xs text-slate-400">Sales by payment method</p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <div className="h-36 w-full max-w-[9rem] shrink-0 sm:h-40 sm:w-40">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={todayBreakdown}
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {todayBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full text-center sm:text-left">
            <p className="text-xs text-slate-400">Total earning</p>
            <p className="text-xl font-bold text-slate-800 sm:text-2xl">
              ₱{todayTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
            <ul className="mt-3 space-y-1.5">
              {todayBreakdown.map((s) => (
                <li key={s.name} className="flex items-center justify-center gap-2 text-xs sm:justify-start">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-slate-600">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sparkline({ value, max }: { value: number; max: number }) {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 1].map(
    (f) => Math.max(4, (value / Math.max(max, 1)) * 24 * f)
  );
  return (
    <svg width="56" height="24" className="inline-block shrink-0">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 9 + 1}
          y={24 - h}
          width={6}
          height={h}
          rx={2}
          fill="#86efac"
        />
      ))}
    </svg>
  );
}
