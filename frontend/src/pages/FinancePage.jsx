import {
  CheckCircle2,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../components/ui/chart.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { formatServiceItemCount } from "../utils/cases.js";
import { formatCurrency, formatDate, parseCurrencyToNumber } from "../utils/formatters.js";

const chartConfig = {
  receita: {
    label: "Receita",
    color: "var(--color-success)",
  },
};

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, 1))).replace(".", "");
}

function formatCompactCurrency(value) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })} mil`;
  }

  return formatCurrency(value);
}

function getMonthComparison(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return null;

  const current = parseCurrencyToNumber(trend[trend.length - 1]?.total_value) ?? 0;
  const previous = parseCurrencyToNumber(trend[trend.length - 2]?.total_value) ?? 0;

  if (previous <= 0) return null;

  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? "+" : "";

  return {
    direction: variation >= 0 ? "up" : "down",
    label: `${sign}${variation.toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })}% vs mês passado`,
  };
}

function buildFallbackRevenueTrend(totalMes, countMes) {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const monthOffset = index - 5;
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
    const isCurrentMonth = index === 5;

    return {
      month: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
      total_value: isCurrentMonth ? totalMes : 0,
      delivered_count: isCurrentMonth ? countMes : 0,
    };
  });
}

export default function FinancePage({ dashboard, loading, onOpenHistory }) {
  if (loading) {
    return <LoadingState message="Carregando financeiro..." />;
  }

  const totalMes = parseCurrencyToNumber(dashboard?.delivered_total_month) ?? 0;
  const countMes = dashboard?.delivered_count_month ?? 0;
  const deliveredCases = dashboard?.delivered_cases_month ?? [];
  const recentDeliveredCases = deliveredCases.slice(0, 5);
  const averageTicket = countMes > 0 ? totalMes / countMes : 0;
  const revenueTrend = Array.isArray(dashboard?.revenue_trend) && dashboard.revenue_trend.length
    ? dashboard.revenue_trend
    : buildFallbackRevenueTrend(totalMes, countMes);
  const chartData = revenueTrend.map((item) => ({
    month: item.month,
    monthLabel: formatMonthLabel(item.month),
    receita: parseCurrencyToNumber(item.total_value) ?? 0,
  }));
  const monthComparison = getMonthComparison(revenueTrend);
  const topDoctorsMap = {};

  deliveredCases.forEach((caseItem) => {
    const key = caseItem.doctor_name;
    if (!topDoctorsMap[key]) topDoctorsMap[key] = { name: key, total: 0, count: 0 };
    topDoctorsMap[key].total += parseCurrencyToNumber(caseItem.total_value) ?? 0;
    topDoctorsMap[key].count += 1;
  });

  const topDoctors = Object.values(topDoctorsMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const deliveredColumns = [
    {
      key: "case",
      header: "Caso",
      render: (caseItem) => (
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.patient_ref}</strong>
          <small className="truncate text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Itens de serviço",
      render: (caseItem) => formatServiceItemCount(caseItem),
    },
    { key: "total_value", header: "Valor", render: (caseItem) => formatCurrency(caseItem.total_value) },
    { key: "delivered_at", header: "Entregue em", render: (caseItem) => formatDate(caseItem.delivered_at) },
  ];

  return (
    <PageContainer
      kicker="Financeiro"
      title="Resumo do mês"
      description="Acompanhe o valor entregue e os casos concluídos no período."
    >
      <div className="grid gap-4">
        <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
          <div className="grid gap-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  <CircleDollarSign className="size-4 text-[var(--color-success)]" />
                  Receita entregue no mês
                </div>
                <strong className="text-3xl font-extrabold leading-none text-[var(--color-text)]">
                  {formatCurrency(totalMes)}
                </strong>
                <p className="text-sm font-semibold text-[var(--color-text-muted)]">
                  {countMes} {countMes === 1 ? "caso entregue" : "casos entregues"} • média {formatCurrency(averageTicket)}
                </p>
              </div>
              {monthComparison && (
                <span
                  className={[
                    "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold",
                    monthComparison.direction === "up"
                      ? "border-[color-mix(in_srgb,var(--color-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success-soft)]"
                      : "border-[color-mix(in_srgb,var(--color-warning-soft)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-warning-soft)_10%,transparent)] text-[var(--color-warning-soft)]",
                  ].join(" ")}
                >
                  {monthComparison.direction === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {monthComparison.label}
                </span>
              )}
            </div>
            <div className="grid gap-2 border-t border-[var(--color-border)] pt-4">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Tendência de receita
              </div>
              <ChartContainer config={chartConfig} className="h-[220px] w-full aspect-auto">
                <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="monthLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactCurrency}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono font-bold text-[var(--color-text)]">
                            {formatCurrency(value)}
                          </span>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(280px,0.75fr)_minmax(0,1.35fr)] items-start gap-4 max-[1120px]:grid-cols-1">
          <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="grid gap-1">
                <h3 className="text-base font-bold leading-tight">Ranking de receita no mês atual.</h3>
                <p className="text-sm leading-snug text-[var(--color-text-muted)]">Dentistas com maior valor entregue no período.</p>
              </div>
            </div>
            <div className="p-4">
              {topDoctors.length ? (
                <div className="grid">
                  {topDoctors.map((doctor, index) => (
                    <div key={doctor.name} className="flex items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
                      <span className="min-w-7 text-sm font-extrabold text-primary">#{index + 1}</span>
                      <div className="grid min-w-0 gap-1">
                        <strong className="truncate text-sm font-bold text-[var(--color-text)]">{doctor.name}</strong>
                        <small className="text-xs text-[var(--color-text-muted)]">
                          {doctor.count} {doctor.count === 1 ? "entrega" : "entregas"}
                        </small>
                      </div>
                      <strong className="ml-auto whitespace-nowrap text-sm font-bold text-[var(--color-text)]">{formatCurrency(doctor.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Nenhuma entrega no mês." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-primary/30 bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm">
            <div className="border-b border-[var(--color-border)] px-4 py-3">
              <div className="grid gap-1">
                <h3 className="text-base font-bold leading-tight">Entregas do mês</h3>
                <p className="text-sm leading-snug text-[var(--color-text-muted)]">Casos concluídos com valor registrado neste mês.</p>
              </div>
            </div>
            <div className="p-4">
              <div className="grid gap-3">
                <DataTable
                  columns={deliveredColumns}
                  data={recentDeliveredCases}
                  emptyIcon={CheckCircle2}
                  emptyTitle="Nenhuma entrega registrada."
                  tableClassName="w-full min-w-0"
                />
                {deliveredCases.length > recentDeliveredCases.length && (
                  <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={onOpenHistory}>
                      Ver todas no Histórico
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
