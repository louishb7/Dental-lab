import {
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  Wrench,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import { formatServiceItemCount, getServiceCount } from "../utils/cases.js";
import { formatCurrency, formatDate, parseCurrencyToNumber } from "../utils/formatters.js";

export default function FinancePage({ dashboard, cases, loading }) {
  if (loading) {
    return <LoadingState message="Carregando financeiro..." />;
  }

  const totalMes = parseCurrencyToNumber(dashboard?.delivered_total_month) ?? 0;
  const countMes = dashboard?.delivered_count_month ?? 0;
  const deliveredCases = dashboard?.delivered_cases_month ?? [];
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

  const totalServices = cases.reduce((sum, caseItem) => sum + getServiceCount(caseItem), 0);

  const deliveredColumns = [
    {
      key: "case",
      header: "Caso",
      render: (caseItem) => (
        <span className="grid min-w-0 gap-1">
          <strong className="truncate text-sm font-bold text-[#f3f4f6]">{caseItem.patient_ref}</strong>
          <small className="truncate text-xs text-[#aeb7c2]">{caseItem.doctor_name}</small>
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
        <div className="grid grid-cols-3 gap-4 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1">
          <StatCard
            title="Valor entregue no mês"
            value={formatCurrency(totalMes)}
            icon={CircleDollarSign}
            tone="success"
          />
          <StatCard title="Casos entregues" value={countMes} icon={PackageCheck} tone="info" />
          <StatCard
            title="Itens de serviço lançados"
            value={totalServices}
            icon={Wrench}
            tone="info"
            description="Linhas de serviço somadas em todos os casos"
          />
        </div>

        <div className="grid grid-cols-[minmax(320px,420px)_minmax(0,1fr)] gap-4 max-[1120px]:grid-cols-1">
          <section className="rounded-md border border-[rgba(255,138,42,0.3)] bg-[rgba(25,30,38,0.96)] text-[#f3f4f6] shadow-sm">
            <div className="border-b border-[rgba(229,235,241,0.13)] px-4 py-3">
              <div className="grid gap-1">
                <h3 className="text-base font-bold leading-tight">Ranking de receita no mês atual.</h3>
                <p className="text-sm leading-snug text-[#aeb7c2]">Dentistas com maior valor entregue no período.</p>
              </div>
            </div>
            <div className="p-4">
              {topDoctors.length ? (
                <div className="grid">
                  {topDoctors.map((doctor, index) => (
                    <div key={doctor.name} className="flex items-center gap-3 border-b border-[rgba(229,235,241,0.13)] py-3 last:border-b-0">
                      <span className="min-w-7 text-sm font-extrabold text-[#ff8a2a]">#{index + 1}</span>
                      <div className="grid min-w-0 gap-1">
                        <strong className="truncate text-sm font-bold text-[#f3f4f6]">{doctor.name}</strong>
                        <small className="text-xs text-[#aeb7c2]">
                          {doctor.count} {doctor.count === 1 ? "entrega" : "entregas"}
                        </small>
                      </div>
                      <strong className="ml-auto whitespace-nowrap text-sm font-bold text-[#f3f4f6]">{formatCurrency(doctor.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Nenhuma entrega no mês." />
              )}
            </div>
          </section>

          <section className="rounded-md border border-[rgba(255,138,42,0.3)] bg-[rgba(25,30,38,0.96)] text-[#f3f4f6] shadow-sm">
            <div className="border-b border-[rgba(229,235,241,0.13)] px-4 py-3">
              <div className="grid gap-1">
                <h3 className="text-base font-bold leading-tight">Entregas do mês</h3>
                <p className="text-sm leading-snug text-[#aeb7c2]">Casos concluídos com valor registrado neste mês.</p>
              </div>
            </div>
            <div className="p-4">
              <div className="max-h-[520px] overflow-auto">
                <DataTable
                  columns={deliveredColumns}
                  data={deliveredCases}
                  emptyIcon={CheckCircle2}
                  emptyTitle="Nenhuma entrega registrada."
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
