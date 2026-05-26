import { Layers3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, formatDeadline } from "../utils/formatters.js";

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
  const isFixedPrice = caseItem?.pricing_mode === "fixed";
  const columns = [
    { key: "tooth", header: "Dente/área" },
    {
      key: "service_type",
      header: "Serviço",
      render: (item) => (
        <span className="cell-main">
          <strong>{item.service_type}</strong>
          {item.notes && <small>{item.notes}</small>}
        </span>
      ),
    },
    { key: "material", header: "Material", render: (item) => item.material || "-" },
    { key: "color", header: "Cor", render: (item) => item.color || "-" },
    ...(
      isFixedPrice
        ? []
        : [{ key: "unit_value", header: "Valor", render: (item) => formatCurrency(item.unit_value) }]
    ),
    {
      key: "actions",
      header: "Ações",
      render: (item) => (
        <Button
          variant="danger"
          iconOnly
          aria-label="Excluir item"
          onClick={() => onRemoveItem(item.id)}
        >
          <Trash2 size={16} />
        </Button>
      ),
    },
  ];

  if (!caseItem) return null;

  async function handleSubmit(event) {
    const success = await onItemSubmit(event);
    if (success) {
      setShowItemForm(false);
    }
  }

  return (
    <Modal
      title={`Caso #${caseItem.id}`}
      description="Detalhes operacionais e itens solicitados."
      onClose={onClose}
    >
      <div className="content-grid">
        <section className="form-section">
          <h3>Informações principais</h3>
          <div className="form-row">
            <div className="cell-main">
              <small>Referência/paciente</small>
              <strong>{caseItem.patient_ref}</strong>
            </div>
            <div className="cell-main">
              <small>Dentista</small>
              <strong>{doctor?.name || `#${caseItem.doctor_id}`}</strong>
            </div>
            <div className="cell-main">
              <small>Prazo</small>
              <strong>{formatDeadline(caseItem.deadline, caseItem.status)}</strong>
            </div>
            <div className="cell-main">
              <small>Total</small>
              <strong>{formatCurrency(caseItem.total_value)}</strong>
            </div>
          </div>
          <div className="case-meta">
            <StatusBadge status={caseItem.status} />
            <PriorityBadge priority={caseItem.priority} />
            <span>{caseItem.pricing_mode === "fixed" ? "Valor fixo" : "Por serviços"}</span>
          </div>
          {caseItem.notes && <p className="muted">{caseItem.notes}</p>}
        </section>

        <section className="form-section">
          <div className="case-card-top">
            <div className="panel-title">
              <h3>Serviços do caso</h3>
              <p>{items.length ? "Itens que compõem este caso." : "Nenhum serviço adicionado ainda."}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowItemForm(true)}>
              <Plus size={16} />
              Adicionar serviço
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={items}
            emptyIcon={Layers3}
            emptyTitle="Nenhum serviço adicionado ainda."
            emptyDescription="Adicione os serviços que compõem este caso."
          />
        </section>

        {showItemForm && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="case-card-top">
                <h3>Adicionar serviço</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowItemForm(false)}>
                  Cancelar
                </Button>
              </div>
            <div className="form-row">
              <FormField label="Serviço">
                <input
                  name="service_type"
                  value={itemForm.service_type}
                  onChange={onItemChange}
                  placeholder="Coroa, faceta, placa..."
                  required
                />
              </FormField>
              <FormField label="Dente/área">
                <input
                  name="tooth"
                  value={itemForm.tooth}
                  onChange={onItemChange}
                  placeholder="11 ou prótese total"
                  required
                />
              </FormField>
            </div>
            <div className="form-row">
              <FormField label="Material">
                <input
                  name="material"
                  value={itemForm.material}
                  onChange={onItemChange}
                  placeholder="Zircônia, resina..."
                />
              </FormField>
              <FormField label="Cor">
                <input
                  name="color"
                  value={itemForm.color}
                  onChange={onItemChange}
                  placeholder="A2, BL1..."
                />
              </FormField>
            </div>
            {!isFixedPrice && (
              <FormField label="Valor unitário">
                <input
                  name="unit_value"
                  value={itemForm.unit_value}
                  onChange={onItemChange}
                  placeholder="R$ 120,00"
                  required
                />
              </FormField>
            )}
            <FormField label="Observações">
              <textarea
                name="notes"
                rows="3"
                value={itemForm.notes}
                onChange={onItemChange}
              />
            </FormField>
            <Button variant="primary" disabled={busy} type="submit">
              <Plus size={18} />
              Adicionar serviço
            </Button>
          </div>
        </form>
        )}
      </div>
    </Modal>
  );
}
