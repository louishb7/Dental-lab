import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  FilePlus2,
  PackageCheck,
} from "lucide-react";
import CaseIntakeForm from "../components/cases/CaseIntakeForm.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import Button from "../components/ui/Button.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, getLocalDateKey } from "../utils/formatters.js";

function statusCount(dashboard, key) {
  return dashboard?.status_counts?.[key] ?? 0;
}

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

function BenchLane({ title, description, cases, emptyTitle }) {
  return (
    <section className="panel bench-lane">
      <div className="panel-header">
        <div className="panel-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="bench-lane-count">{cases.length}</span>
      </div>
      <div className="panel-body">
        {cases.length ? (
          <div className="case-list operational-list">
            {cases.slice(0, 6).map((caseItem) => (
              <article className="case-card operational-card" key={caseItem.id}>
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
            description="Nenhuma movimentação pendente neste bloco."
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
  busy,
  caseForm,
  selectedDoctorId,
  onCaseChange,
  onDoctorChange,
  onCaseSubmit,
  onOpenCasesPage,
}) {
  if (loading) {
    return (
      <PageContainer title="Bancada" description="Carregando panorama operacional.">
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
  const overdueCases = openCases
    .filter((caseItem) => {
      if (!caseItem.deadline) return false;
      const deadlineKey = getLocalDateKey(caseItem.deadline);
      return deadlineKey < todayKey;
    })
    .sort(sortByPriorityAndDeadline);
  const todayCases = openCases
    .filter((caseItem) => caseItem.deadline && getLocalDateKey(caseItem.deadline) === todayKey)
    .sort(sortByPriorityAndDeadline);
  const tomorrowCases = openCases
    .filter((caseItem) => caseItem.deadline && getLocalDateKey(caseItem.deadline) === tomorrowKey)
    .sort(sortByPriorityAndDeadline);
  const readyCases = openCases
    .filter((caseItem) => caseItem.status === "completed")
    .sort(sortByPriorityAndDeadline);

  return (
    <PageContainer
      kicker="Operação"
      title="Bancada"
      description="Hoje, amanhã, atrasados, prontos e nova entrada em um só quadro."
      action={
        <Button variant="secondary" onClick={onOpenCasesPage}>
          Ver fila completa
          <ArrowRight size={16} />
        </Button>
      }
    >
      <div className="content-grid">
        <section className="panel panel-strong command-hero">
          <div className="panel-body command-hero-body">
            <div className="command-copy">
              <span className="page-kicker tactical-kicker">Sala de comando</span>
              <h3>Controle operacional do laboratório</h3>
              <p className="muted">
                Receba rápido, enxergue gargalos e solte a bancada sem pular entre telas.
              </p>
            </div>
            <div className="command-finance">
              <span>Entregue no mês</span>
              <strong>{formatCurrency(dashboard?.delivered_total_month)}</strong>
              <small>{dashboard?.delivered_count_month ?? 0} casos concluídos</small>
            </div>
          </div>
        </section>

        <div className="stat-grid">
          <StatCard
            title="Prazo hoje"
            value={todayCases.length}
            description="Casos para virar o dia"
            icon={CalendarDays}
            tone="warning"
          />
          <StatCard
            title="Prazo amanhã"
            value={tomorrowCases.length}
            description="Próxima janela de entrega"
            icon={Clock3}
            tone="info"
          />
          <StatCard
            title="Atrasados"
            value={overdueCases.length}
            description="Precisam de decisão imediata"
            icon={AlertTriangle}
            tone="danger"
          />
          <StatCard
            title="Prontos"
            value={readyCases.length}
            description="Liberados para saída"
            icon={PackageCheck}
            tone="success"
          />
        </div>

        <div className="bench-grid">
          <section className="panel panel-strong bench-intake">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Novo caso rápido</h3>
                <p>Entrada enxuta para não travar a bancada.</p>
              </div>
              <span className="panel-chip">
                <FilePlus2 size={14} />
                Intake
              </span>
            </div>
            <div className="panel-body">
              <CaseIntakeForm
                doctors={doctors}
                selectedDoctorId={selectedDoctorId}
                caseForm={caseForm}
                busy={busy}
                submitLabel="Lançar caso"
                submitIcon={FilePlus2}
                onDoctorChange={onDoctorChange}
                onCaseChange={onCaseChange}
                onSubmit={onCaseSubmit}
                layout="compact"
              />
            </div>
          </section>

          <BenchLane
            title="Hoje"
            description="Vence hoje ou precisa ser entregue ainda no turno."
            cases={todayCases}
            emptyTitle="Nenhum caso para hoje."
          />

          <BenchLane
            title="Amanhã"
            description="Organize a sequência antes do acúmulo."
            cases={tomorrowCases}
            emptyTitle="Nenhum caso para amanhã."
          />

          <BenchLane
            title="Atrasados"
            description="Fila estourada que precisa de ataque imediato."
            cases={overdueCases}
            emptyTitle="Sem atrasos no quadro."
          />

          <section className="panel bench-summary">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Saída e receita</h3>
                <p>Casos prontos e resultado mensal consolidado.</p>
              </div>
              <span className="panel-chip success">
                <CircleDollarSign size={14} />
                Fechamento
              </span>
            </div>
            <div className="panel-body bench-summary-body">
              <div className="summary-metric">
                <span>Prontos para sair</span>
                <strong>{readyCases.length}</strong>
              </div>
              <div className="summary-metric">
                <span>Casos abertos</span>
                <strong>{statusCount(dashboard, "pending") + statusCount(dashboard, "completed")}</strong>
              </div>
              <div className="summary-metric">
                <span>Entregue no mês</span>
                <strong>{formatCurrency(dashboard?.delivered_total_month)}</strong>
              </div>
              <Button variant="success" onClick={onOpenCasesPage}>
                Abrir fila de saída
                <ArrowRight size={16} />
              </Button>
            </div>
          </section>

          <BenchLane
            title="Prontos"
            description="Casos já concluídos aguardando expedição."
            cases={readyCases}
            emptyTitle="Nenhum caso pronto agora."
          />
        </div>
      </div>
    </PageContainer>
  );
}
