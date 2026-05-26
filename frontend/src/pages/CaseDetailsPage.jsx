import { Layers3, Plus, Trash2 } from "lucide-react";
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
  itemAdvanced,
  setItemAdvanced,
  busy,
  onItemChange,
  onItemSubmit,
  onRemoveItem,
  onClose,
}) {
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
    { key: "unit_value", header: "Valor", render: (item) => formatCurrency(item.unit_value) },
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

        <form className="form-grid" onSubmit={onItemSubmit}>
          <div className="form-section">
            <div className="case-card-top">
              <h3>Novo item do caso</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItemAdvanced((value) => !value)}
              >
                {itemAdvanced ? "Simples" : "Avançado"}
              </Button>
            </div>
            <div className="form-row">
              <FormField label="Dente/área">
                <input
                  name="tooth"
                  value={itemForm.tooth}
                  onChange={onItemChange}
                  placeholder="11 ou prótese total"
                  required
                />
              </FormField>
              <FormField label="Serviço">
                <input
                  name="service_type"
                  value={itemForm.service_type}
                  onChange={onItemChange}
                  placeholder="Coroa, faceta, placa..."
                  required
                />
              </FormField>
            </div>
            <FormField label="Valor unitário">
              <input
                name="unit_value"
                value={itemForm.unit_value}
                onChange={onItemChange}
                placeholder="120,00"
                required={caseItem.pricing_mode === "services"}
              />
            </FormField>
            {itemAdvanced && (
              <>
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
                <FormField label="Observações">
                  <textarea
                    name="notes"
                    rows="3"
                    value={itemForm.notes}
                    onChange={onItemChange}
                  />
                </FormField>
              </>
            )}
            <Button variant="primary" disabled={busy} type="submit">
              <Plus size={18} />
              Adicionar item
            </Button>
          </div>
        </form>

        <section>
          <div className="panel-title" style={{ marginBottom: 10 }}>
            <h3>Itens solicitados</h3>
            <p>{items.length ? "Serviços vinculados ao caso." : "Nenhum item cadastrado."}</p>
          </div>
          <DataTable
            columns={columns}
            data={items}
            emptyIcon={Layers3}
            emptyTitle="Nenhum item vinculado."
            emptyDescription="Adicione dente/área, serviço, material, cor e valor quando aplicável."
          />
        </section>
      </div>
    </Modal>
  );
}

