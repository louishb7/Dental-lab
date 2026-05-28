import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  PackageCheck,
  Plus,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, getLocalDateKey } from "../utils/formatters.js";

function enrichCase(caseItem, doctorById) {
  return {
    ...caseItem,
    doctor_name: doctorById.get(caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`,
  };
}

function sortByPriorityAndDeadline(a, b) {
  if (a.priority !== b.priority) {
    return a.priority === "urgent" ? -1 : 1;
  }

  return String(a.deadline || "").localeCompare(String(b.deadline || ""));
}

function CaseLane({ title, description, cases, emptyTitle }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="panel-body">
        {cases.length ? (
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
            icon={PackageCheck}
            title={emptyTitle}
            description="Cadastre um caso ou siga para a lista completa."
          />
        )}
      </div>
    </section>
  );
}

export default function DashboardPage({
  dashboard,
  cases = [],
  doctors = [],
  loading,
  onOpenNewCase,
  onOpenCasesPage,
}) {
  if (loading) {
    return (
      <PageContainer title="Bancada" description="Carregando visão geral dos casos.">
        <section className="panel">
          <LoadingState message="Carregando bancada..." />
        </section>
      </PageContainer>
    );
  }

  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayKey = getLocalDateKey(today);
  const tomorrowKey = getLocalDateKey(tomorrow);

  const openCases = cases
    .filter((caseItem) => caseItem.status !== "delivered")
    .map((caseItem) => enrichCase(caseItem, doctorById));

  const todayCases = openCases
    .filter((caseItem) => caseItem.deadline && getLocalDateKey(caseItem.deadline) === todayKey)
    .sort(sortByPriorityAndDeadline);

  const overdueCases = openCases
    .filter((caseItem) => {
      if (!caseItem.deadline) return false;
      return getLocalDateKey(caseItem.deadline) < todayKey;
    })
    .sort(sortByPriorityAndDeadline);

  const readyCases = openCases
    .filter((caseItem) => caseItem.status === "completed")
    .sort(sortByPriorityAndDeadline);

  const tomorrowCases = openCases
    .filter((caseItem) => caseItem.deadline && getLocalDateKey(caseItem.deadline) === tomorrowKey)
    .sort(sortByPriorityAndDeadline);

  return (
    <PageContainer
      kicker="Bancada"
      title="Bancada"
      description="Veja rapidamente o que precisa ser feito, o que está atrasado e o que já está pronto."
      action={
        <div className="page-actions-inline">
          <Button variant="primary" onClick={onOpenNewCase}>
            <Plus size={16} />
            Novo caso
          </Button>
          <Button variant="secondary" onClick={onOpenCasesPage}>
            Ver casos
            <ArrowRight size={16} />
          </Button>
        </div>
      }
    >
      <div className="content-grid">
        <div className="stat-grid compact">
          <StatCard
            title="Casos de hoje"
            value={todayCases.length}
            description="Prazos para hoje"
            icon={CalendarDays}
            tone="warning"
          />
          <StatCard
            title="Atrasados"
            value={overdueCases.length}
            description="Casos fora do prazo"
            icon={AlertTriangle}
            tone="danger"
          />
          <StatCard
            title="Prontos"
            value={readyCases.length}
            description="Aguardando entrega"
            icon={PackageCheck}
            tone="success"
          />
          <StatCard
            title="Valor entregue no mês"
            value={formatCurrency(dashboard?.delivered_total_month)}
            description={`${dashboard?.delivered_count_month ?? 0} casos entregues`}
            icon={CircleDollarSign}
            tone="info"
          />
        </div>

        <div className="dashboard-main-grid">
          <div className="dashboard-content-stack">
            <CaseLane
              title="Casos de hoje"
              description="O que merece atenção imediata na bancada."
              cases={todayCases}
              emptyTitle="Nenhum caso para hoje."
            />

            <CaseLane
              title="Atrasados"
              description="Casos vencidos que ainda precisam ser finalizados."
              cases={overdueCases}
              emptyTitle="Nenhum caso atrasado."
            />
          </div>

          <div className="dashboard-side-stack">
            <CaseLane
              title="Prontos para entrega"
              description="Casos concluídos aguardando saída."
              cases={readyCases}
              emptyTitle="Nenhum caso pronto agora."
            />

            <section className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <h3>Resumo rápido</h3>
                  <p>Uma visão simples para acompanhar produção e próxima carga.</p>
                </div>
              </div>
              <div className="panel-body simple-summary-list">
                <div className="simple-summary-row">
                  <span>Amanhã</span>
                  <strong>{tomorrowCases.length} casos</strong>
                </div>
                <div className="simple-summary-row">
                  <span>Em aberto</span>
                  <strong>{openCases.length} casos</strong>
                </div>
                <div className="simple-summary-row">
                  <span>Entregue no mês</span>
                  <strong>{formatCurrency(dashboard?.delivered_total_month)}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
