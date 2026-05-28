import { Eye, Plus, Wrench } from "lucide-react";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import PageContainer from "../components/layout/PageContainer.jsx";
import CaseDetailsPage from "./CaseDetailsPage.jsx";
import { formatCurrency } from "../utils/formatters.js";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";

function getServiceCount(caseItem) {
  return caseItem.items_count ?? caseItem.items?.length ?? 0;
}

export default function ServicesPage({
  cases,
  doctors,
  loading,
  busy,
  selectedCase,
  items,
  itemForm,
  onOpenCaseItems,
  onItemChange,
  onItemSubmit,
  onRemoveItem,
  onCloseDetails,
}) {
  const openCases = cases.filter((caseItem) => caseItem.status !== "delivered");

  const columns = [
    {
      key: "case",
      header: "Caso",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>
            #{caseItem.id} · {caseItem.patient_ref}
          </strong>
          <small>{doctors.find((doctor) => doctor.id === caseItem.doctor_id)?.name || `#${caseItem.doctor_id}`}</small>
        </span>
      ),
    },
    {
      key: "services",
      header: "Itens",
      render: (caseItem) => (
        <span className="cell-main">
          <strong>{getServiceCount(caseItem)} {getServiceCount(caseItem) === 1 ? "item" : "itens"}</strong>
          <small>Lançar trabalhos neste caso</small>
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Prazo",
      render: (caseItem) => (
        <span className="cell-main">
          <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
        </span>
      ),
    },
    { key: "status", header: "Status", render: (caseItem) => <StatusBadge status={caseItem.status} /> },
    { key: "priority", header: "Prioridade", render: (caseItem) => <PriorityBadge priority={caseItem.priority} /> },
    { key: "total_value", header: "Valor", render: (caseItem) => formatCurrency(caseItem.total_value) },
    {
      key: "actions",
      header: "Ações",
      render: (caseItem) => (
        <div className="row-actions">
          <Button
            variant="primary"
            onClick={() => onOpenCaseItems(caseItem.id)}
          >
            <Plus size={16} />
            Adicionar item
          </Button>
          <Button
            variant="secondary"
            iconOnly
            aria-label="Ver caso"
            title="Ver caso"
            onClick={() => onOpenCaseItems(caseItem.id)}
          >
            <Eye size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      kicker="Serviços"
      title="Serviços dos casos"
      description="Lance e revise os serviços vinculados a cada caso."
    >
      <div className="content-grid">
        <section className="panel panel-strong">
          <div className="panel-header">
            <div className="panel-title">
              <h3>Selecionar caso</h3>
              <p>Clique em “Adicionar item” para abrir o caso e lançar o serviço.</p>
            </div>
          </div>
          <div className="panel-body">
            <DataTable
              columns={columns}
              data={openCases}
              loading={loading}
              emptyIcon={Wrench}
              emptyTitle="Nenhum caso em aberto."
              emptyDescription="Casos entregues ficam no histórico."
            />
          </div>
        </section>

        {selectedCase && (
          <section className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <h3>Caso selecionado</h3>
                <p>Abra os detalhes para adicionar serviços, dentes e observações.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="case-service-hint">
                <strong>
                  #{selectedCase.id} · {selectedCase.patient_ref}
                </strong>
                <span>
                  {doctors.find((doctor) => doctor.id === selectedCase.doctor_id)?.name ||
                    `#${selectedCase.doctor_id}`}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      {selectedCase && (
        <CaseDetailsPage
          caseItem={selectedCase}
          doctor={doctors.find((doctor) => doctor.id === selectedCase.doctor_id)}
          items={items}
          itemForm={itemForm}
          busy={busy}
          onItemChange={onItemChange}
          onItemSubmit={onItemSubmit}
          onRemoveItem={onRemoveItem}
          onClose={onCloseDetails}
        />
      )}
    </PageContainer>
  );
}
