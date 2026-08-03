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
const SERVICES_PER_PAGE = 5;
const CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]/75 focus:border-primary focus:ring-2 focus:ring-primary/25";

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
  const [servicesPage, setServicesPage] = useState(1);
  const selectedTeeth = sortTeethByFdi(itemForm.selected_teeth);
  const unitValues = itemForm.unit_values || {};
  const caseNotes = splitCaseNotes(caseItem?.notes);
  const hasUrgentPriority = caseItem?.priority === "urgent";
  const totalServicePages = Math.max(1, Math.ceil(items.length / SERVICES_PER_PAGE));
  const currentServicesPage = Math.min(servicesPage, totalServicePages);
  const pagedItems = items.slice(
    (currentServicesPage - 1) * SERVICES_PER_PAGE,
    currentServicesPage * SERVICES_PER_PAGE,
  );

  useEffect(() => {
    setShowItemForm(false);
    setEditingItemId(null);
    setServicesPage(1);
  }, [caseItem?.id]);

  useEffect(() => {
    setServicesPage((current) => Math.min(current, totalServicePages));
  }, [totalServicePages]);

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
        title="Detalhes do caso"
        onClose={onClose}
        className="max-w-[760px]"
      >
        <div className="grid gap-3">
          <section className="grid gap-4 rounded-md border border-primary/30 bg-[var(--color-surface)] p-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => openItemForm()}>
                <Plus size={16} />
                Adicionar serviço
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3 max-[640px]:grid-cols-2">
              <div className="grid min-w-0 gap-1">
                <small className="text-xs font-bold text-[var(--color-text-muted)]">Paciente</small>
                <strong className="truncate text-sm font-bold text-[var(--color-text)]">{caseItem.patient_ref}</strong>
              </div>
              <div className="grid min-w-0 gap-1">
                <small className="text-xs font-bold text-[var(--color-text-muted)]">Dentista</small>
                <strong className="truncate text-sm font-bold text-[var(--color-text)]">{doctor?.name || `#${caseItem.doctor_id}`}</strong>
              </div>
              <div className="grid min-w-0 gap-1">
                <small className="text-xs font-bold text-[var(--color-text-muted)]">Prazo</small>
                <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
              </div>
              <div className="grid min-w-0 gap-1">
                <small className="text-xs font-bold text-[var(--color-text-muted)]">Total</small>
                <strong className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(caseItem.total_value)}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={caseItem.status} />
              {hasUrgentPriority && (
                <span className="rounded-full border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--color-danger-soft)]">
                  Urgente
                </span>
              )}
            </div>

            {(caseNotes.notes || caseNotes.teeth) && (
              <div className="grid gap-2">
                {caseNotes.notes && (
                  <div className="grid gap-1 border-t border-[var(--color-border)] pt-2">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Observações</small>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-soft)]">{caseNotes.notes}</p>
                  </div>
                )}
                {caseNotes.teeth && (
                  <div className="grid gap-1 border-t border-[var(--color-border)] pt-2">
                    <small className="text-xs font-bold text-[var(--color-text-muted)]">Dentes selecionados</small>
                    <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">{caseNotes.teeth}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {items.length > 0 && (
            <section className="grid gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-subtle)] p-4">
              <h3 className="text-base font-bold text-[var(--color-text)]">Serviços extras</h3>
              <div className="grid gap-2">
                {pagedItems.map((item) => {
                  const view = getItemView(item);

                  return (
                    <article key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 max-[640px]:flex-col">
                      <div className="grid min-w-0 gap-1">
                        <strong className="text-sm font-bold text-[var(--color-text)]">{item.tooth ? `Dente ${item.tooth}` : "Serviço extra"}</strong>
                        {view.notes && <small className="text-xs leading-snug text-[var(--color-text-muted)]">{view.notes}</small>}
                      </div>
                      <div className="grid shrink-0 justify-items-end gap-2 max-[640px]:justify-items-start">
                        {item.unit_value !== null && item.unit_value !== undefined && (
                          <>
                            <strong className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(view.totalValue ?? item.unit_value)}</strong>
                            {view.quantity > 1 && (
                              <small className="text-xs text-[var(--color-text-muted)]">{`${view.quantity} x ${formatCurrency(item.unit_value)}`}</small>
                            )}
                          </>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
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
              {totalServicePages > 1 && (
                <nav className="flex justify-end gap-1.5" aria-label="Páginas de serviços extras">
                  {Array.from({ length: totalServicePages }, (_, index) => {
                    const page = index + 1;

                    return (
                      <button
                        key={page}
                        className={[
                          "grid size-8 place-items-center rounded-md border text-xs font-bold",
                          page === currentServicesPage
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-[var(--color-border)] bg-[var(--color-subtle)] text-[var(--color-text-soft)]",
                        ].join(" ")}
                        type="button"
                        aria-current={page === currentServicesPage ? "page" : undefined}
                        onClick={() => setServicesPage(page)}
                      >
                        {page}
                      </button>
                    );
                  })}
                </nav>
              )}
            </section>
          )}
        </div>
      </Modal>

      {showItemForm && (
        <Modal
          title={editingItemId ? "Editar serviço extra" : "Serviço extra"}
          onClose={closeItemForm}
          className="max-w-[620px]"
        >
          <form className="grid gap-3" onSubmit={handleSubmit}>
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
              <div className="grid gap-2">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">Dentes selecionados</span>
                <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
              </div>
            )}

            <div className="grid gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
              <span>Cobrança deste item de serviço</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cobrança deste item de serviço">
                <button
                  type="button"
                  className={[
                    "flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-bold text-[var(--color-text)]",
                    itemForm.pricing_mode === "fixed"
                      ? "border-primary/30 bg-primary/10"
                      : "border-[var(--color-border)] bg-[var(--color-subtle)]",
                  ].join(" ")}
                  aria-pressed={itemForm.pricing_mode === "fixed"}
                  onClick={() => setServicePricingMode("fixed")}
                >
                  <strong>Manter preço fixado</strong>
                </button>
                <button
                  type="button"
                  className={[
                    "flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-bold text-[var(--color-text)]",
                    itemForm.pricing_mode === "services"
                      ? "border-primary/30 bg-primary/10"
                      : "border-[var(--color-border)] bg-[var(--color-subtle)]",
                  ].join(" ")}
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
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-auto pr-1 max-[640px]:grid-cols-1">
                  {selectedTeeth.map((tooth) => (
                    <label key={tooth} className="grid gap-1 text-xs font-bold text-[var(--color-text-muted)]">
                      <span>Dente {tooth}</span>
                      <input
                        className={CONTROL_CLASS}
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
              />
            </FormField>

            <div className="flex flex-wrap justify-end gap-2">
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
