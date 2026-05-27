import { Edit3, Layers3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../components/ui/Button.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import PriorityBadge from "../components/ui/PriorityBadge.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency } from "../utils/formatters.js";

const EMPTY_ITEM_FORM = {
  tooth: "",
  service_type: "",
  unit_value: "",
  material: "",
  color: "",
  notes: "",
};

function hasAdvancedDetails(item) {
  return Boolean(item?.material || item?.color || item?.notes);
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
  const [itemMode, setItemMode] = useState("simple");
  const [editingItemId, setEditingItemId] = useState(null);
  const isFixedPrice = caseItem?.pricing_mode === "fixed";

  useEffect(() => {
    setShowItemForm(false);
    setItemMode("simple");
    setEditingItemId(null);
  }, [caseItem?.id]);

  function syncItemForm(nextValues) {
    Object.entries(nextValues).forEach(([name, value]) => {
      onItemChange({ target: { name, value } });
    });
  }

  function openItemForm(mode, item = null) {
    setItemMode(mode);
    setEditingItemId(item?.id ?? null);
    setShowItemForm(true);

    if (!item) {
      syncItemForm(EMPTY_ITEM_FORM);
      return;
    }

    syncItemForm({
      tooth: item.tooth || "",
      service_type: item.service_type || "",
      unit_value: item.unit_value ? formatCurrency(item.unit_value) : "",
      material: item.material || "",
      color: item.color || "",
      notes: item.notes || "",
    });
  }

  function closeItemForm() {
    setShowItemForm(false);
    setItemMode("simple");
    setEditingItemId(null);
    syncItemForm(EMPTY_ITEM_FORM);
  }

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
        <div className="row-actions">
          <Button variant="secondary" size="sm" onClick={() => openItemForm(hasAdvancedDetails(item) ? "advanced" : "simple", item)}>
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
    const success = await onItemSubmit(event, {
      itemId: editingItemId,
      advanced: itemMode === "advanced",
    });
    if (success) {
      closeItemForm();
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
            <span>{caseItem.pricing_mode === "fixed" ? "Valor fixo" : "Por serviços"}</span>
          </div>
          {caseItem.notes && <p className="muted">{caseItem.notes}</p>}
        </section>

        <section className="form-section">
          <div className="case-card-top">
            <div className="panel-title">
              <h3>Serviços do caso</h3>
              <p>{items.length ? "Itens que compõem este caso." : "Nenhum serviço acoplado ainda."}</p>
            </div>
            <div className="service-mode-actions">
              <Button variant="primary" size="sm" onClick={() => openItemForm("simple")}>
                <Plus size={16} />
                Serviço simples
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openItemForm("advanced")}>
                <Plus size={16} />
                Serviço avançado
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={items}
            emptyIcon={Layers3}
            emptyTitle="Nenhum serviço acoplado ainda."
            emptyDescription="Abra a área de adição para acoplar serviços ao pedido."
          />
        </section>

        {showItemForm && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="case-card-top">
                <div className="panel-title">
                  <h3>{editingItemId ? "Editar serviço do caso" : "Acoplar serviço ao caso"}</h3>
                  <p>
                    {itemMode === "simple"
                      ? "Preencha serviço, dente/área e valor do serviço."
                      : "Preencha todos os detalhes do serviço antes de salvar."}
                  </p>
                </div>
                <div className="service-mode-actions">
                  <Button
                    variant={itemMode === "simple" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setItemMode("simple")}
                  >
                    Serviço simples
                  </Button>
                  <Button
                    variant={itemMode === "advanced" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => setItemMode("advanced")}
                  >
                    Serviço avançado
                  </Button>
                </div>
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
              {!isFixedPrice && (
                <FormField label="Valor do serviço">
                  <input
                    name="unit_value"
                    value={itemForm.unit_value}
                    onChange={onItemChange}
                    placeholder="R$ 120,00"
                    required
                  />
                </FormField>
              )}
              {itemMode === "advanced" && (
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
              <div className="confirm-modal-actions">
                <Button variant="ghost" size="sm" onClick={closeItemForm}>
                  Cancelar
                </Button>
                <Button variant="primary" disabled={busy} type="submit">
                  <Plus size={18} />
                  {editingItemId ? "Salvar alterações" : "Adicionar serviço"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
