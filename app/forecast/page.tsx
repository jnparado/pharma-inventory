import { enhanceForecastSummary } from "@/lib/ai";
import { isAiConfigured } from "@/lib/env";
import {
  getProductsWithStock,
  getTransactions,
  isSupabaseConfigured,
} from "@/lib/data";
import { computeDemandForecasts } from "@/lib/forecast";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SetupNotice,
  StatCard,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statusTone = {
  ok: "success",
  reorder: "warning",
  overstock: "info",
  critical: "danger",
} as const;

export default async function ForecastPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="AI Demand Forecast" />
        <SetupNotice />
      </>
    );
  }

  const [products, transactions] = await Promise.all([
    getProductsWithStock(),
    getTransactions(500),
  ]);

  const forecasts = computeDemandForecasts(products, transactions);
  const needsAction = forecasts.filter((f) => f.status !== "ok");
  const aiSummary = isAiConfigured()
    ? await enhanceForecastSummary(needsAction).catch(
        () => "AI summary unavailable."
      )
    : "Add XAI_API_KEY for AI-powered demand insights.";

  return (
    <>
      <PageHeader
        title="AI Demand Forecast"
        description="Predicts medicine demand from past sales, season, and reorder levels. Recommends reorder quantity and timing."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products tracked" value={forecasts.length} />
        <StatCard
          label="Need reorder"
          value={forecasts.filter((f) => f.status === "reorder" || f.status === "critical").length}
          tone="warning"
        />
        <StatCard
          label="Overstock warnings"
          value={forecasts.filter((f) => f.status === "overstock").length}
          tone="info"
        />
        <StatCard
          label="Critical (out of stock)"
          value={forecasts.filter((f) => f.status === "critical").length}
          tone="danger"
        />
      </div>

      <Card title="AI insights" className="mt-6">
        <p className="text-sm leading-relaxed text-slate-700">{aiSummary}</p>
        <p className="mt-2 text-xs text-slate-400">
          Season factors apply to analgesics, cough/cold, and antibiotics during
          flu and rainy seasons (e.g. higher Paracetamol demand).
        </p>
      </Card>

      <Card title="Reorder recommendations" className="mt-6">
        {needsAction.length === 0 ? (
          <EmptyState message="All products are within healthy stock levels." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">30-day demand</th>
                  <th className="pb-2 font-medium">Reorder qty</th>
                  <th className="pb-2 font-medium">Reorder by</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {needsAction.map((f) => (
                  <tr key={f.product_id}>
                    <td className="py-3">
                      <p className="font-medium text-slate-700">{f.product_name}</p>
                      <p className="text-xs text-slate-400">{f.reason}</p>
                    </td>
                    <td className="py-3">{f.current_stock}</td>
                    <td className="py-3">{f.predicted_30_day_demand}</td>
                    <td className="py-3 font-semibold text-teal-700">
                      {f.recommended_reorder_qty || "—"}
                    </td>
                    <td className="py-3">{f.reorder_by}</td>
                    <td className="py-3">
                      <Badge tone={statusTone[f.status]}>{f.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
