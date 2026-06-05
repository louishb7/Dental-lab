import { Edit3, Layers3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import CaseDentalWorkForm from "../components/cases/CaseDentalWorkForm.jsx";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency } from "../utils/formatters.js";
import { splitItemOperationalNotes } from "../utils/forms.js";

const EMPTY_ITEM_FORM = {
  name: "",
  tooth: "",
  service_type: "",
  quantity: "1",
  unit_value: "",
  selected_teeth: [],
  unit_values: {},
  pricing_mode: "services",
  total_value: "",
  material: "",
  color: "",
  notes: "",
};

function getItemView(item) {
  const operational = splitItemOperationalNotes(item?.notes);
  return {
    quantity: operational.quantity,
    notes: operational.notes,
  };
}

export default function CaseDetailsPage({
  caseItem,
  doctor,
  items,
  itemForm,
  busy,
  onItemChange,
  onItemSubmit,
  onRemoveItem,
  onClose,
}) {
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const isFixedPrice = caseItem?.pricing_mode === "fixed";

  useEffect(() => {
    setShowItemForm(false);
    setEditingItemId(null);
  }, [caseItem?.id]);

  function syncItemForm(nextValues) {
    Object.entries(nextValues).forEach(([name, value]) => {
      onItemChange({ target: { name, value } });
    });
  }

  function openItemForm(item = null) {
    setEditingItemId(item?.id ?? null);
    setShowItemForm(true);

    if (!item) {
      syncItemForm({
        ...EMPTY_ITEM_FORM,
        pricing_mode: caseItem?.pricing_mode || "services",
        total_value: isFixedPrice ? formatCurrency(caseItem?.total_value) : "",
      });
      return;
    }

    const operational = splitItemOperationalNotes(item.notes);

    syncItemForm({
      name: item.service_type || "",
      tooth: item.tooth || "",
      service_type: item.service_type || "",
      quantity: operational.quantity,
      unit_value: item.unit_value ? formatCurrency(item.unit_value) : "",
      selected_teeth: [],
      unit_values: {},
      pricing_mode: caseItem?.pricing_mode || "services",
      total_value: isFixedPrice ? formatCurrency(caseItem?.total_value) : "",
      material: item.material || "",
      color: item.color || "",
      notes: operational.notes,
    });
  }

  function closeItemForm() {
    setShowItemForm(false);
    setEditingItemId(null);
    syncItemForm(EMPTY_ITEM_FORM);
  }

  const columns = [
    {
      key: "service_type",
      header: "Serviço",
      render: (item) => {
        const view = getItemView(item);

        return (
          <span className="cell-main">
            <strong>{item.service_type}</strong>
            {view.notes && <small>{view.notes}</small>}
          </span>
        );
      },
    },
    { key: "tooth", header: "Dentes / numeração" },
    {
      key: "quantity",
      header: "Qtd.",
      render: (item) => getItemView(item).quantity,
    },
    ...(
      isFixedPrice
        ? []
        : [{ key: "unit_value", header: "Valor", render: (item) => formatCurrency(item.unit_value) }]
    ),
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <div className="row-actions">
          <Button variant="secondary" size="sm" onClick={() => openItemForm(item)}>
            <Edit3 size={16} />
            Editar
          </Button>
          <Button
            variant="danger"
            iconOnly
            aria-label="Excluir item"
            onClick={() => onRemoveItem(item.id)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  if (!caseItem) return null;

  async function handleSubmit(event) {
    const success = await onItemSubmit(event, { itemId: editingItemId, advanced: false });
    if (success) {
      closeItemForm();
    }
  }

  const billingTitle = isFixedPrice ? "Valor fixo acertado" : "Cobrança unitária";
  const billingDescription = isFixedPrice
    ? "Use os serviços para registrar dentes, quantidade e observações. O total do caso permanece fixo."
    : "Adicione vários serviços com seus respectivos dentes e valores para compor o total do caso.";
  const servicesDescription = isFixedPrice
    ? "Registre os serviços apenas para organizar dentes e observações deste caso."
    : "Lance cada serviço com dente, quantidade e valor unitário.";
  const emptyServicesDescription = isFixedPrice
    ? "Abra o formulário e registre os serviços só para organizar o trabalho deste caso."
    : "Abra o formulário e registre o primeiro serviço com valor unitário deste caso.";

  return (
    <Modal
      title={caseItem.patient_ref || "Detalhes do caso"}
      description="Resumo do caso e serviços vinculados."
      onClose={onClose}
    >
      <div className="content-grid">
        <section className="form-section simple-form-section">
          <h3>Informações principais</h3>
          <div className="form-row">
            <div className="cell-main">
              <small>Paciente</small>
              <strong>{caseItem.patient_ref}</strong>
            </div>
            <div className="cell-main">
              <small>Dentista</small>
              <strong>{doctor?.name || `#${caseItem.doctor_id}`}</strong>
            </div>
            <div className="cell-main">
              <small>Prazo</small>
              <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
            </div>
            <div className="cell-main">
              <small>Total</small>
              <strong>{formatCurrency(caseItem.total_value)}</strong>
            </div>
          </div>
          <div className="case-meta">
            <StatusBadge status={caseItem.status} />
            <PriorityBadge priority={caseItem.priority} />
            <span>{billingTitle}</span>
          </div>
          {caseItem.notes && <p className="muted">{caseItem.notes}</p>}
          <div className="case-billing-box">
            <div className="case-billing-copy">
              <small>Forma de cobrança</small>
              <strong>{billingTitle}</strong>
              <p>{billingDescription}</p>
            </div>
            {isFixedPrice && <strong className="case-billing-value">{formatCurrency(caseItem.total_value)}</strong>}
          </div>
        </section>

        <section className="form-section simple-form-section">
          <div className="case-card-top">
            <div className="panel-title">
              <h3>Serviços do caso</h3>
              <p>{items.length ? servicesDescription : "Nenhum serviço lançado ainda."}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => openItemForm()}>
              <Plus size={16} />
              Adicionar serviço
            </Button>
          </div>
          <div className="case-service-hint">
            <strong>{billingTitle}</strong>
            <span>{servicesDescription}</span>
          </div>
          <DataTable
            columns={columns}
            data={items}
            emptyIcon={Layers3}
            emptyTitle="Nenhum serviço lançado ainda."
            emptyDescription={emptyServicesDescription}
          />
        </section>

        {showItemForm && !editingItemId && (
          <form className="case-creation-workspace case-intake-form compact case-service-work-form" onSubmit={handleSubmit}>
            <CaseDentalWorkForm
              form={itemForm}
              busy={busy}
              submitLabel="Adicionar serviço"
              submitIcon={Plus}
              allowPricingModeChange={false}
              showFixedValueInput={false}
              showServiceName
              showNotes
              title="Dentes do serviço"
              subtitle="Selecione os dentes deste lançamento"
              summaryTitle="Resumo do serviço"
              fixedModeLabel="Cobrança fixa"
              unitModeLabel="Cobrança unitária"
              fixedValueHint="Valor fixo do caso"
              unitValueHint="Total dos dentes selecionados"
              onChange={onItemChange}
              onCancel={closeItemForm}
              summaryRows={[
                { label: "Caso", value: caseItem.patient_ref },
                { label: "Dentista", value: doctor?.name || `#${caseItem.doctor_id}` },
                { label: "Serviço", value: itemForm.name },
              ]}
            />
          </form>
        )}

        {showItemForm && editingItemId && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-section simple-form-section">
              <div className="panel-title">
                <h3>Editar serviço</h3>
                <p>
                  {isFixedPrice
                    ? "Informe dentes, quantidade e observações. O valor total continua sendo o combinado do caso."
                    : "Informe o serviço, os dentes e o valor unitário de cada lançamento."}
                </p>
              </div>

              <div className="case-billing-box compact">
                <div className="case-billing-copy">
                  <small>Forma de cobrança</small>
                  <strong>{billingTitle}</strong>
                  <p>{isFixedPrice ? "Sem detalhamento unitário obrigatório." : "Cada lançamento soma no valor final do caso."}</p>
                </div>
              </div>

              <div className="form-row">
                <FormField label="Serviço">
                  <input
                    name="name"
                    value={itemForm.name}
                    onChange={onItemChange}
                    placeholder="Coroa, faceta, placa, provisório..."
                    required
                  />
                </FormField>
                <FormField label="Quantidade">
                  <input
                    name="quantity"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={itemForm.quantity}
                    onChange={onItemChange}
                    placeholder="1"
                    required
                  />
                </FormField>
              </div>

              <FormField label="Dentes / numeração">
                <input
                  name="tooth"
                  value={itemForm.tooth}
                  onChange={onItemChange}
                  placeholder="11, 21, 22-24, PT, moldeira..."
                  required
                />
              </FormField>

              {!isFixedPrice && (
                <FormField label="Valor unitário">
                  <input
                    name="unit_value"
                    value={itemForm.unit_value}
                    onChange={onItemChange}
                    placeholder="R$ 0,00"
                    required
                  />
                </FormField>
              )}

              <FormField label="Observações">
                <textarea
                  name="notes"
                  rows="4"
                  value={itemForm.notes}
                  onChange={onItemChange}
                  placeholder="Use este campo para anotar detalhes rápidos do trabalho."
                />
              </FormField>

              <div className="confirm-modal-actions">
                <Button variant="ghost" onClick={closeItemForm}>
                  Cancelar
                </Button>
                <Button variant="primary" disabled={busy} type="submit">
                  <Plus size={16} />
                  Salvar serviço
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
