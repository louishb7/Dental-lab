import { parseCurrencyToApiValue } from "./formatters.js";

export const EMPTY_DOCTOR = { name: "", clinic_name: "", phone: "", notes: "" };
export const EMPTY_LOGIN = { identifier: "", password: "" };
export const EMPTY_REGISTER = { email: "", username: "", password: "" };
export const EMPTY_CASE = {
  patient_ref: "",
  pricing_mode: "services",
  total_value: "",
  deadline: "",
  priority: "normal",
  notes: "",
};
export const EMPTY_ITEM = {
  tooth: "",
  service_type: "",
  unit_value: "",
  material: "",
  color: "",
  notes: "",
};

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
  const payload = {
    doctor_id: doctorId,
    patient_ref: form.patient_ref.trim(),
    pricing_mode: form.pricing_mode,
  };

  if (form.pricing_mode === "fixed") {
    payload.total_value = parseCurrencyToApiValue(form.total_value);
  }

  if (advanced) {
    payload.deadline = toIsoDate(form.deadline);
    payload.priority = form.priority;
    payload.notes = form.notes.trim() || null;
  }

  return payload;
}

export function buildItemPayload(form, advanced, pricingMode = "services") {
  const payload = {
    tooth: form.tooth.trim(),
    service_type: form.service_type.trim(),
    unit_value: pricingMode === "fixed" ? null : parseCurrencyToApiValue(form.unit_value),
  };

  if (advanced) {
    payload.material = form.material.trim() || null;
    payload.color = form.color.trim() || null;
    payload.notes = form.notes.trim() || null;
  }

  return payload;
}
