import { Edit3, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import OdontogramSelector from "../components/cases/OdontogramSelector.jsx";
import Button from "../components/ui/Button.jsx";
import ActionsMenu from "../components/ui/ActionsMenu.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
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
        title={caseItem.patient_ref}
        description={doctor?.name || `Dentista #${caseItem.doctor_id}`}
        onClose={onClose}
        className="max-w-[720px]"
      >
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={caseItem.status} />
                {hasUrgentPriority && (
                  <span className="rounded-full border border-destructive/25 bg-destructive/5 px-2 py-0.5 text-xs text-[var(--color-danger)]">
                    Urgente
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                Prazo <DeadlineBadge deadline={caseItem.deadline} status={caseItem.status} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--color-text-muted)]">Valor do caso</span>
              <strong className="mt-1 block text-xl font-semibold tabular-nums">
                {formatCurrency(caseItem.total_value)}
              </strong>
            </div>
          </div>
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">
                Serviços do caso{" "}
                <span className="ml-1 font-normal text-[var(--color-text-muted)]">{items.length}</span>
              </h3>
              <Button variant="primary" size="sm" onClick={() => openItemForm()}>
                <Plus size={16} />
                Adicionar serviço
              </Button>
            </div>
            {items.length ? (
              <div className="divide-y divide-[var(--color-border)]">
                {pagedItems.map((item) => {
                  const view = getItemView(item);
                  return (
                    <article key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="min-w-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-2 py-2 text-center text-sm font-semibold tabular-nums"
                          aria-label={item.tooth ? `Dente ${item.tooth}` : "Sem dente"}
                        >
                          {item.tooth || "—"}
                        </span>
                        <div className="min-w-0">
                          <strong className="break-words text-sm font-medium">
                            {item.service_type || "Serviço odontológico"}
                          </strong>
                          {view.notes && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                              {view.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {item.unit_value !== null && item.unit_value !== undefined && (
                          <div className="mr-auto text-sm sm:mr-1">
                            <strong className="block text-right font-semibold tabular-nums">
                              {formatCurrency(view.totalValue ?? item.unit_value)}
                            </strong>
                            {view.quantity > 1 && (
                              <small className="text-xs text-[var(--color-text-muted)]">
                                {view.quantity} x {formatCurrency(item.unit_value)}
                              </small>
                            )}
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openItemForm(item)}>
                          <Edit3 size={15} />
                          Editar
                        </Button>
                        <ActionsMenu
                          label={`Ações do serviço ${item.tooth || item.id}`}
                          items={[
                            {
                              label: "Excluir serviço",
                              icon: Trash2,
                              danger: true,
                              onSelect: () => onRemoveItem(item.id),
                            },
                          ]}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Nenhum serviço registrado."
                description="Adicione os serviços e dentes deste trabalho."
              />
            )}
            {totalServicePages > 1 && (
              <nav className="mt-3 flex flex-wrap justify-end gap-2" aria-label="Páginas de serviços">
                {Array.from({ length: totalServicePages }, (_, index) => index + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentServicesPage ? "primary" : "secondary"}
                    size="sm"
                    aria-current={page === currentServicesPage ? "page" : undefined}
                    onClick={() => setServicesPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </nav>
            )}
          </section>
          {caseNotes.teeth && (
            <section className="border-t border-[var(--color-border)] pt-4">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)]">Dentes selecionados</h3>
              <p className="mt-2 break-words text-sm tabular-nums">{caseNotes.teeth}</p>
            </section>
          )}
          {caseNotes.notes && (
            <section className="border-t border-[var(--color-border)] pt-4">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)]">
                Observações do trabalho
              </h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-soft)]">
                {caseNotes.notes}
              </p>
            </section>
          )}
        </div>
      </Modal>

      {showItemForm && (
        <Modal
          title={editingItemId ? "Editar serviço extra" : "Serviço extra"}
          onClose={closeItemForm}
          className={editingItemId ? "max-w-[520px]" : "max-w-[940px]"}
        >
          <form
            className={`grid gap-5 ${editingItemId ? "" : "lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]"}`}
            onSubmit={handleSubmit}
          >
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
              <div className="mx-auto grid w-full max-w-[460px] content-start gap-5 py-4 [&_g[role=button]:focus-visible]:drop-shadow-[0_0_3px_var(--color-primary)] [&>div]:gap-5">
                <span className="text-xs font-bold text-[var(--color-text-muted)]">Dentes selecionados</span>
                <OdontogramSelector selectedTeeth={selectedTeeth} onChange={handleTeethChange} />
              </div>
            )}

            <div className="grid content-start gap-4">
              <div className="grid gap-1.5 text-xs font-bold text-[var(--color-text-muted)]">
                <span>Cobrança deste item de serviço</span>
                <div
                  className="grid grid-cols-2 gap-2"
                  role="group"
                  aria-label="Cobrança deste item de serviço"
                >
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

              {itemForm.pricing_mode === "services" &&
                (editingItemId ? (
                  <FormField label="Valor adicional">
                    <input
                      name="unit_value"
                      value={itemForm.unit_value}
                      onChange={onItemChange}
                      placeholder="R$ 0,00"
                      required
                    />
                  </FormField>
                ) : (
                  selectedTeeth.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTeeth.map((tooth) => (
                        <label
                          key={tooth}
                          className="grid gap-1 text-xs font-bold text-[var(--color-text-muted)]"
                        >
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
                ))}

              <FormField label="Observações">
                <textarea name="notes" rows="3" value={itemForm.notes} onChange={onItemChange} />
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
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
