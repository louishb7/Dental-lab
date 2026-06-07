import { Edit3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import OdontogramSelector from "../components/cases/OdontogramSelector.jsx";
import Button from "../components/ui/Button.jsx";
import DeadlineBadge from "../components/ui/DeadlineBadge.jsx";
import FormField from "../components/ui/FormField.jsx";
import Modal from "../components/ui/Modal.jsx";
import StatusBadge from "../components/ui/StatusBadge.jsx";
import { formatCurrency, formatCurrencyInput, parseCurrencyToNumber } from "../utils/formatters.js";
import { splitItemOperationalNotes } from "../utils/forms.js";
import { sortTeethByFdi } from "../utils/odontogram.js";

const EMPTY_ITEM_FORM = {
  name: "",
  tooth: "",
  service_type: "",
  quantity: "1",
  unit_value: "",
  selected_teeth: [],
  unit_values: {},
  pricing_mode: "fixed",
  total_value: "",
  material: "",
  color: "",
  notes: "",
};

function splitCaseNotes(value) {
  const notes = [];
  const teeth = [];

  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^Dentes selecionados:\s*(.+)$/i);
      if (match) {
        teeth.push(match[1].trim());
      } else if (!/^Servico principal:/i.test(line)) {
        notes.push(line);
      }
    });

  return {
    notes: notes.join("\n"),
    teeth: teeth.join(", "),
  };
}

function getItemView(item) {
  const operational = splitItemOperationalNotes(item?.notes);
  const quantity = Number(item?.quantity ?? operational.quantity) || 1;
  const unitValue = parseCurrencyToNumber(item?.unit_value);
  const totalValue = unitValue === null ? null : unitValue * quantity;

  return {
    quantity,
    notes: operational.notes,
    totalValue,
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
  const selectedTeeth = sortTeethByFdi(itemForm.selected_teeth);
  const unitValues = itemForm.unit_values || {};
  const caseNotes = splitCaseNotes(caseItem?.notes);
  const hasUrgentPriority = caseItem?.priority === "urgent";

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
      syncItemForm(EMPTY_ITEM_FORM);
      return;
    }

    const operational = splitItemOperationalNotes(item.notes);

    syncItemForm({
      ...EMPTY_ITEM_FORM,
      name: item.service_type || "",
      tooth: item.tooth || "",
      service_type: item.service_type || "",
      quantity: String(item.quantity ?? operational.quantity),
      unit_value: item.unit_value ? formatCurrency(item.unit_value) : "",
      pricing_mode: item.unit_value ? "services" : "fixed",
      notes: operational.notes,
    });
  }

  function closeItemForm() {
    setShowItemForm(false);
    setEditingItemId(null);
    syncItemForm(EMPTY_ITEM_FORM);
  }

  function setServicePricingMode(mode) {
    syncItemForm({ pricing_mode: mode });
  }

  function handleTeethChange(nextTeeth) {
    const nextUnitValues = nextTeeth.reduce((accumulator, tooth) => {
      accumulator[tooth] = unitValues[tooth] || "";
      return accumulator;
    }, {});

    syncItemForm({
      selected_teeth: nextTeeth,
      unit_values: nextUnitValues,
      tooth: sortTeethByFdi(nextTeeth).join(", "),
    });
  }

  function handleUnitValueChange(tooth, value) {
    syncItemForm({
      unit_values: {
        ...unitValues,
        [tooth]: formatCurrencyInput(value),
      },
    });
  }

  if (!caseItem) return null;

  async function handleSubmit(event) {
    const success = await onItemSubmit(event, {
      itemId: editingItemId,
      pricingMode: itemForm.pricing_mode,
    });
    if (success) {
      closeItemForm();
    }
  }

  return (
    <>
      <Modal
        title={caseItem.patient_ref || "Detalhes do caso"}
        onClose={onClose}
        className="case-details-modal"
      >
        <div className="case-details-stack">
          <section className="case-details-section">
            <div className="case-details-topline">
              <h3>Informações principais</h3>
              <Button variant="primary" size="sm" onClick={() => openItemForm()}>
                <Plus size={16} />
                Adicionar serviço
              </Button>
            </div>

            <div className="case-details-facts">
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
              {hasUrgentPriority && <span className="badge badge-priority urgent">Urgente</span>}
            </div>

            {(caseNotes.notes || caseNotes.teeth) && (
              <div className="case-notes-grid">
                {caseNotes.notes && (
                  <div className="case-note-block">
                    <small>Observações</small>
                    <p>{caseNotes.notes}</p>
                  </div>
                )}
                {caseNotes.teeth && (
                  <div className="case-note-block">
                    <small>Dentes selecionados</small>
                    <p>{caseNotes.teeth}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="case-details-section">
            <h3>Serviços do caso</h3>

            {items.length ? (
              <div className="case-services-list">
                {items.map((item) => {
                  const view = getItemView(item);

                  return (
                    <article key={item.id} className="case-service-item">
                      <div className="case-service-main">
                        <strong>{item.service_type}</strong>
                        <span>{item.tooth ? `Dente ${item.tooth}` : "Sem dente informado"}</span>
                        {view.quantity > 1 && <span>{`${view.quantity} unidades`}</span>}
                        {view.notes && <small>{view.notes}</small>}
                      </div>
                      <div className="case-service-side">
                        {item.unit_value !== null && item.unit_value !== undefined && (
                          <>
                            <strong>{formatCurrency(view.totalValue ?? item.unit_value)}</strong>
                            {view.quantity > 1 && (
                              <small>{`${view.quantity} x ${formatCurrency(item.unit_value)}`}</small>
                            )}
                          </>
                        )}
                        <div className="row-actions">
                          <Button variant="secondary" size="sm" onClick={() => openItemForm(item)}>
                            <Edit3 size={15} />
                            Editar
                          </Button>
                          <Button
                            variant="danger"
                            iconOnly
                            aria-label="Excluir serviço"
                            onClick={() => onRemoveItem(item.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="case-empty-copy">Nenhum serviço lançado ainda.</p>
            )}
          </section>
        </div>
      </Modal>

      {showItemForm && (
        <Modal
          title={editingItemId ? "Editar serviço" : "Adicionar serviço"}
          onClose={closeItemForm}
          className="case-service-modal"
        >
          <form className="case-service-form" onSubmit={handleSubmit}>
            <FormField label="Serviço / descrição curta">
              <input
                name="name"
                value={itemForm.name}
                onChange={onItemChange}
                placeholder="Coroa, faceta, placa, provisório..."
                required
              />
            </FormField>

            {editingItemId ? (
              <FormField label="Dentes selecionados">
                <input
                  name="tooth"
                  value={itemForm.tooth}
                  onChange={onItemChange}
                  placeholder="11, 21, 22-24..."
                  required
                />
              </FormField>
            ) : (
              <div className="case-service-teeth">
                <span className="case-service-label">Dentes selecionados</span>
                <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
              </div>
            )}

            <FormField label="Unidades">
              <input
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={itemForm.quantity}
                onChange={onItemChange}
                required
              />
            </FormField>

            <div className="form-field">
              <span>Cobrança deste item de serviço</span>
              <div className="pricing-mode-grid" role="radiogroup" aria-label="Cobrança deste item de serviço">
                <button
                  type="button"
                  className={`choice-card ${itemForm.pricing_mode === "fixed" ? "active" : ""}`}
                  aria-pressed={itemForm.pricing_mode === "fixed"}
                  onClick={() => setServicePricingMode("fixed")}
                >
                  <strong>Manter preço fixado</strong>
                </button>
                <button
                  type="button"
                  className={`choice-card ${itemForm.pricing_mode === "services" ? "active" : ""}`}
                  aria-pressed={itemForm.pricing_mode === "services"}
                  onClick={() => setServicePricingMode("services")}
                >
                  <strong>Valor adicional</strong>
                </button>
              </div>
            </div>

            {itemForm.pricing_mode === "services" && (
              editingItemId ? (
                <FormField label="Valor adicional">
                  <input
                    name="unit_value"
                    value={itemForm.unit_value}
                    onChange={onItemChange}
                    placeholder="R$ 0,00"
                    required
                  />
                </FormField>
              ) : selectedTeeth.length > 0 && (
                <div className="tooth-pricing-list compact">
                  {selectedTeeth.map((tooth) => (
                    <label key={tooth} className="tooth-pricing-item">
                      <span>Dente {tooth}</span>
                      <input
                        value={unitValues[tooth] || ""}
                        onChange={(event) => handleUnitValueChange(tooth, event.target.value)}
                        placeholder="R$ 0,00"
                        required
                      />
                    </label>
                  ))}
                </div>
              )
            )}

            <FormField label="Observações">
              <textarea
                name="notes"
                rows="3"
                value={itemForm.notes}
                onChange={onItemChange}
                placeholder="Observação curta do serviço"
              />
            </FormField>

            <div className="confirm-modal-actions">
              <Button variant="ghost" onClick={closeItemForm}>
                Cancelar
              </Button>
              <Button variant="primary" disabled={busy} type="submit">
                <Plus size={16} />
                {editingItemId ? "Salvar serviço" : "Adicionar serviço"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
