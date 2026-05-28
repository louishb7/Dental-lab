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
import { formatCurrency, formatDate } from "../utils/formatters.js";

function getServiceCount(caseItem) {
  return caseItem.items_count ?? caseItem.items?.length ?? 0;
}

export default function FinancePage({ dashboard, cases, loading }) {
  if (loading) {
    return <LoadingState message="Carregando financeiro..." />;
  }

  const totalMes = Number(dashboard?.delivered_total_month ?? 0);
  const countMes = dashboard?.delivered_count_month ?? 0;
  const deliveredCases = dashboard?.delivered_cases_month ?? [];
  const topDoctorsMap = {};

  deliveredCases.forEach((caseItem) => {
    const key = caseItem.doctor_name;
    if (!topDoctorsMap[key]) topDoctorsMap[key] = { name: key, total: 0, count: 0 };
    topDoctorsMap[key].total += Number(caseItem.total_value ?? 0);
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
        <span className="cell-main">
          <strong>{caseItem.patient_ref}</strong>
          <small>{caseItem.doctor_name}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Serviços",
      render: (caseItem) => `${getServiceCount(caseItem)} ${getServiceCount(caseItem) === 1 ? "item" : "itens"}`,
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
      <div className="content-grid">
        <div className="stat-grid">
          <StatCard
            title="Valor entregue no mês"
            value={formatCurrency(totalMes)}
            icon={CircleDollarSign}
            tone="success"
          />
          <StatCard title="Casos entregues" value={countMes} icon={PackageCheck} tone="info" />
          <StatCard
            title="Itens lançados"
            value={totalServices}
            icon={Wrench}
            tone="info"
            description="Itens somados em todos os casos"
          />
        </div>

        <div className="split-grid">
          <section className="panel panel-strong">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Ranking de receita no mês atual.</h3>
                <p>Dentistas com maior valor entregue no período.</p>
              </div>
            </div>
            <div className="panel-body">
              {topDoctors.length ? (
                <div className="doctor-ranking">
                  {topDoctors.map((doctor, index) => (
                    <div key={doctor.name} className="ranking-item">
                      <span className="ranking-pos">#{index + 1}</span>
                      <div className="cell-main">
                        <strong>{doctor.name}</strong>
                        <small>
                          {doctor.count} {doctor.count === 1 ? "entrega" : "entregas"}
                        </small>
                      </div>
                      <strong>{formatCurrency(doctor.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Nenhuma entrega no mês." />
              )}
            </div>
          </section>

          <section className="panel panel-strong">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Entregas do mês</h3>
                <p>Casos concluídos com valor registrado neste mês.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="table-scroll-compact">
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
