import { parseCurrencyToApiValue } from "./formatters.js";

export const EMPTY_DOCTOR = { name: "", clinic_name: "", phone: "", notes: "" };
export const EMPTY_LOGIN = { identifier: "", password: "" };
export const EMPTY_REGISTER = { email: "", username: "", password: "" };
export const EMPTY_CASE = {
  patient_ref: "",
  pricing_mode: "services",
  service_name: "",
  selected_teeth: [],
  unit_values: {},
  total_value: "",
  deadline: "",
  priority: "normal",
  notes: "",
};
export const EMPTY_ITEM = {
  name: "",
  tooth: "",
  service_type: "",
  quantity: "1",
  unit_value: "",
  material: "",
  color: "",
  notes: "",
};

const QUANTITY_LINE_PATTERN = /^Quantidade:\s*(\d+)\s*(?:\n+)?/i;

export function formatBrazilianPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd})${number}`;
  if (number.length <= 8) return `(${ddd})${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${ddd})${number.slice(0, 5)}-${number.slice(5)}`;
}

export function toIsoDate(value) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

export function buildDoctorPayload(form) {
  return {
    name: form.name.trim(),
    clinic_name: form.clinic_name.trim() || null,
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export function buildCasePayload(doctorId, form, advanced) {
  const trimmedNotes = form.notes.trim();
  const operationalNotes = [
    form.service_name?.trim() ? `Servico principal: ${form.service_name.trim()}` : null,
    Array.isArray(form.selected_teeth) && form.selected_teeth.length
      ? `Dentes selecionados: ${form.selected_teeth.join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const payload = {
    doctor_id: doctorId,
    patient_ref: form.patient_ref.trim(),
    pricing_mode: form.pricing_mode,
  };

  if (form.pricing_mode === "fixed") {
    payload.total_value = parseCurrencyToApiValue(form.total_value);
  }

  payload.deadline = toIsoDate(form.deadline);
  payload.priority = form.priority;
  payload.notes = [trimmedNotes || null, operationalNotes || null].filter(Boolean).join("\n\n") || null;

  return payload;
}

export function normalizeQuantity(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "1";

  return String(Math.max(1, Number(digits)));
}

export function splitItemOperationalNotes(value) {
  const rawNotes = String(value ?? "");
  const match = rawNotes.match(QUANTITY_LINE_PATTERN);

  if (!match) {
    return {
      quantity: "1",
      notes: rawNotes.trim(),
    };
  }

  const quantity = normalizeQuantity(match[1]);
  const notes = rawNotes.replace(QUANTITY_LINE_PATTERN, "").trim();

  return { quantity, notes };
}

export function buildItemPayload(form, advanced, pricingMode = "services") {
  const quantity = normalizeQuantity(form.quantity);
  const serviceName = form.name?.trim() || form.service_type?.trim() || "";
  const notes = form.notes.trim();
  const composedNotes = [
    quantity !== "1" ? `Quantidade: ${quantity}` : null,
    notes || null,
  ]
    .filter(Boolean)
    .join("\n");

  const payload = {
    tooth: form.tooth.trim(),
    service_type: serviceName,
    unit_value: pricingMode === "fixed" ? null : parseCurrencyToApiValue(form.unit_value),
    material: form.material.trim() || null,
    color: form.color.trim() || null,
    notes: composedNotes || null,
  };

  return payload;
}

export function buildAutomaticCaseItems(form) {
  const selectedTeeth = Array.isArray(form.selected_teeth) ? form.selected_teeth : [];
  const unitValues = form.unit_values || {};
  const serviceName = form.service_name?.trim() || "Servico do caso";

  return selectedTeeth.map((tooth) => ({
    tooth,
    service_type: serviceName,
    unit_value: parseCurrencyToApiValue(unitValues[tooth]),
    material: null,
    color: null,
    notes: null,
  }));
}
