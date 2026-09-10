import { CheckCircle2, CircleDollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import ErrorState from "../components/ui/ErrorState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import { formatServiceItemCount } from "../utils/cases.js";
import { formatCurrency, formatDate, parseCurrencyToNumber } from "../utils/formatters.js";

const chartConfig = {
  receita: {
    label: "Receita",
    color: "var(--color-primary)",
  },
};

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");
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

export default function FinancePage({ dashboard, loading, error, onRetry, onOpenHistory }) {
  if (loading) {
    return (
      <PageContainer width="finance">
        <LoadingState message="Carregando financeiro..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer width="finance">
        <ErrorState message={error} onRetry={onRetry} />
      </PageContainer>
    );
  }

  const totalMes = parseCurrencyToNumber(dashboard?.delivered_total_month) ?? 0;
  const countMes = dashboard?.delivered_count_month ?? 0;
  const deliveredCases = dashboard?.delivered_cases_month ?? [];
  const recentDeliveredCases = deliveredCases.slice(0, 5);
  const averageTicket = countMes > 0 ? totalMes / countMes : 0;
  const revenueTrend =
    Array.isArray(dashboard?.revenue_trend) && dashboard.revenue_trend.length
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
          <strong className="break-words text-sm font-bold text-[var(--color-text)]">
            {caseItem.patient_ref}
          </strong>
          <small className="break-words text-xs text-[var(--color-text-muted)]">{caseItem.doctor_name}</small>
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
    <PageContainer width="finance">
      <div className="grid min-w-0 gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Resultado do mês</h2>
          <span className="text-xs capitalize text-[var(--color-text-muted)]">
            {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date())}
          </span>
        </div>
        <section
          aria-label="Resumo financeiro do mês"
          className="grid grid-cols-2 gap-y-5 border-b border-[var(--color-border)] pb-5 sm:grid-cols-[1.5fr_1fr_1fr]"
        >
          <div className="col-span-2 sm:col-span-1">
            <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <CircleDollarSign size={16} />
              Receita entregue no mês
            </p>
            <strong className="mt-2 block text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(totalMes)}
            </strong>
            {monthComparison && (
              <span className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                {monthComparison.direction === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {monthComparison.label}
              </span>
            )}
          </div>
          <div className="sm:border-l sm:border-[var(--color-border)] sm:pl-6">
            <p className="text-xs text-[var(--color-text-muted)]">Casos entregues</p>
            <strong className="mt-2 block text-2xl font-semibold tabular-nums">{countMes}</strong>
          </div>
          <div className="border-l border-[var(--color-border)] pl-6">
            <p className="text-xs text-[var(--color-text-muted)]">Média por caso</p>
            <strong className="mt-2 block text-xl font-semibold tabular-nums">
              {formatCurrency(averageTicket)}
            </strong>
          </div>
        </section>
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold">Evolução da receita</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Valores entregues nos últimos seis meses
              </p>
            </div>
            <ChartContainer config={chartConfig} className="h-[180px] sm:h-[220px] w-full aspect-auto">
              <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fill: "var(--color-text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  width={76}
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
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
                <Bar dataKey="receita" fill="var(--color-receita)" maxBarSize={44} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </section>
          <section className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Receita por dentista</h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Maiores valores entregues neste mês</p>
            {topDoctors.length ? (
              <ol className="mt-3 divide-y divide-[var(--color-border)]">
                {topDoctors.map((doctor, index) => (
                  <li key={doctor.name} className="flex items-start gap-3 py-3">
                    <span className="pt-0.5 text-xs tabular-nums text-[var(--color-text-muted)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block break-words text-sm font-medium">{doctor.name}</strong>
                      <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                        {doctor.count} {doctor.count === 1 ? "entrega" : "entregas"}
                      </span>
                    </div>
                    <strong className="shrink-0 text-xs font-semibold tabular-nums">
                      {formatCurrency(doctor.total)}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={CheckCircle2} title="Nenhuma entrega no mês." />
            )}
          </section>
        </div>
        <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold">Entregas do mês</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Últimos trabalhos concluídos</p>
            </div>
            {deliveredCases.length > recentDeliveredCases.length && (
              <Button variant="ghost" size="sm" onClick={onOpenHistory}>
                Ver histórico
              </Button>
            )}
          </div>
          <DataTable
            columns={deliveredColumns}
            data={recentDeliveredCases}
            emptyIcon={CheckCircle2}
            emptyTitle="Nenhuma entrega registrada."
            renderMobile={(item) => (
              <article className="grid gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="break-words text-sm font-semibold">{item.patient_ref}</strong>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.doctor_name}</p>
                  </div>
                  <strong className="shrink-0 text-sm tabular-nums">
                    {formatCurrency(item.total_value)}
                  </strong>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-[var(--color-text-muted)]">
                  <span>{formatServiceItemCount(item)}</span>
                  <span>Entregue em {formatDate(item.delivered_at)}</span>
                </div>
              </article>
            )}
          />
        </section>
      </div>
    </PageContainer>
  );
}
