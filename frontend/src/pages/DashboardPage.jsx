import { AlertTriangle, CheckCircle2, CircleDollarSign, ClipboardList } from "lucide-react";
import PageContainer from "../components/layout/PageContainer.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import {
  formatCurrency,
  getLocalDateKey,
} from "../utils/formatters.js";

function statusCount(dashboard, key) {
  return dashboard?.status_counts?.[key] ?? 0;
}

function DashboardCaseList({ title, description, cases, emptyTitle }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="panel-body">
        {cases?.length ? (
          <div className="case-list">
            {cases.slice(0, 5).map((caseItem) => (
              <article className="case-card" key={caseItem.id}>
                <div className="case-card-top">
                  <div className="cell-main">
                    <strong>#{caseItem.id} · {caseItem.patient_ref}</strong>
                    <small>{caseItem.doctor_name}</small>
                  </div>
                  <PriorityBadge priority={caseItem.priority} />
                </div>
                <div className="case-meta">
                  <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
                  <StatusBadge status={caseItem.status} />
                  <span>{formatCurrency(caseItem.total_value)}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle2}
            title={emptyTitle}
            description="Nenhuma ação imediata para este bloco."
          />
        )}
      </div>
    </section>
  );
}

export default function DashboardPage({ dashboard, cases = [], doctors = [], loading }) {
  if (loading) {
    return (
      <PageContainer title="Visão geral" description="Carregando panorama operacional.">
        <section className="panel">
          <LoadingState message="Carregando dashboard..." />
        </section>
      </PageContainer>
    );
  }

  const openCases = statusCount(dashboard, "pending") + statusCount(dashboard, "completed");
  const urgentCases = dashboard?.urgent_open_cases ?? [];
  const overdueCases = dashboard?.overdue_cases ?? [];
  const deliveredCases = dashboard?.delivered_cases_month ?? [];
  const secondaryCases = overdueCases.length ? overdueCases : deliveredCases;
  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayKey = getLocalDateKey(today);
  const tomorrowKey = getLocalDateKey(tomorrow);
  const nextDeadlineCases = cases
    .filter((caseItem) => {
      if (!caseItem.deadline || caseItem.status === "delivered") return false;
      const deadlineKey = getLocalDateKey(caseItem.deadline);
      return deadlineKey === todayKey || deadlineKey === tomorrowKey;
    })
    .map((caseItem) => ({
      ...caseItem,
      doctor_name: doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`,
    }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
      return String(a.deadline).localeCompare(String(b.deadline));
    });

  return (
    <PageContainer
      kicker="Operação"
      title="Visão geral"
      description="Panorama dos seus casos, prazos e entregas."
    >
      <div className="content-grid">
        <div className="stat-grid">
          <StatCard
            title="Casos abertos"
            value={openCases}
            description="Pendentes ou prontos, ainda não entregues"
            icon={ClipboardList}
          />
          <StatCard
            title="Urgentes"
            value={urgentCases.length}
            description="Casos marcados como prioridade"
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard
            title="Atrasados"
            value={overdueCases.length}
            description="Vencidos e ainda não entregues"
            icon={AlertTriangle}
            tone="danger"
          />
          <StatCard
            title="Entregue no mês"
            value={formatCurrency(dashboard?.delivered_total_month)}
            description={`${dashboard?.delivered_count_month ?? 0} casos entregues`}
            icon={CircleDollarSign}
            tone="success"
          />
        </div>

        <div className="split-grid">
          <DashboardCaseList
            title="Prazos de hoje e amanhã"
            description="Casos próximos, priorizados por urgência."
            cases={nextDeadlineCases}
            emptyTitle="Nenhum prazo para hoje ou amanhã."
          />
          <DashboardCaseList
            title={overdueCases.length ? "Casos atrasados" : "Entregas recentes"}
            description={overdueCases.length ? "Prazos vencidos que precisam de atenção." : "Últimas entregas registradas no mês."}
            cases={secondaryCases}
            emptyTitle={overdueCases.length ? "Nenhum caso atrasado." : "Nenhuma entrega neste mês."}
          />
        </div>
      </div>
    </PageContainer>
  );
}
