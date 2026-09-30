import { openDB } from "idb";

let dbPromise;
function getDb() {
  dbPromise ??= openDB("cadisk-offline", 1, {
    upgrade(db) {
      db.createObjectStore("records", { keyPath: "key" });
    },
  });
  return dbPromise;
}
const pendingWrites = new Map();

const DOCTOR_FIELDS = ["id", "name", "clinic_name", "phone", "notes", "cases_count"];
const CASE_FIELDS = [
  "id",
  "doctor_id",
  "doctor_name",
  "patient_ref",
  "deadline",
  "priority",
  "status",
  "total_value",
  "pricing_mode",
  "notes",
  "created_at",
  "delivered_at",
  "items_count",
];
const ITEM_FIELDS = [
  "id",
  "case_id",
  "tooth",
  "service_type",
  "quantity",
  "unit_value",
  "material",
  "color",
  "notes",
];
const DRAFT_FIELDS = [
  "patient_ref",
  "pricing_mode",
  "service_name",
  "selected_teeth",
  "unit_values",
  "total_value",
  "deadline",
  "priority",
  "notes",
];

function keyFor(ownerId, type, resourceId = "") {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) throw new Error("Usuário offline inválido.");
  return `${ownerId}:${type}:${resourceId}`;
}

function pick(source, fields) {
  return Object.fromEntries(
    fields.filter((field) => source?.[field] !== undefined).map((field) => [field, source[field]]),
  );
}

function sanitize(type, value) {
  if (type === "pending-case") {
    if (
      !value ||
      typeof value.clientRequestId !== "string" ||
      value.clientRequestId !== value.id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) ||
      value.payload?.client_request_id !== value.id ||
      !["pending", "failed"].includes(value.state) ||
      typeof value.createdAt !== "string" ||
      !value.form ||
      typeof value.form !== "object" ||
      Array.isArray(value.form) ||
      typeof value.payload?.patient_ref !== "string" ||
      (value.payload.doctor_id !== null && !Number.isSafeInteger(value.payload.doctor_id))
    )
      throw new Error("Caso pendente inválido.");
    const payload = pick(value.payload, [
      "client_request_id",
      "doctor_id",
      "patient_ref",
      "pricing_mode",
      "total_value",
      "deadline",
      "priority",
      "notes",
    ]);
    if (Array.isArray(value.payload.items)) {
      payload.items = value.payload.items.map((item) =>
        pick(item, [
          "tooth",
          "service_type",
          "quantity",
          "unit_value",
          "material",
          "color",
          "notes",
        ]),
      );
    }
    return {
      id: value.id,
      clientRequestId: value.clientRequestId,
      payload,
      form: pick(value.form, DRAFT_FIELDS),
      doctorId: value.payload.doctor_id,
      createdAt: value.createdAt,
      state: value.state,
    };
  }
  if (type === "doctors" && Array.isArray(value))
    return value.map((item) => pick(item, DOCTOR_FIELDS));
  if (type === "cases" && Array.isArray(value)) return value.map((item) => pick(item, CASE_FIELDS));
  if (type === "items" && Array.isArray(value)) return value.map((item) => pick(item, ITEM_FIELDS));
  if (type === "dashboard" && value && typeof value === "object" && !Array.isArray(value)) {
    return {
      generated_at: value.generated_at,
      status_counts: pick(value.status_counts, ["pending", "completed", "delivered"]),
      overdue_cases: (value.overdue_cases || []).map((item) => pick(item, CASE_FIELDS)),
      urgent_open_cases: (value.urgent_open_cases || []).map((item) => pick(item, CASE_FIELDS)),
      delivered_cases_month: (value.delivered_cases_month || []).map((item) =>
        pick(item, CASE_FIELDS),
      ),
      delivered_total_month: value.delivered_total_month,
      delivered_count_month: value.delivered_count_month,
      revenue_trend: (value.revenue_trend || []).map((item) =>
        pick(item, ["month", "total_value", "delivered_count"]),
      ),
    };
  }
  if (
    type === "draft" &&
    value?.form &&
    (value.doctorId === null || Number.isSafeInteger(value.doctorId))
  ) {
    return { doctorId: value.doctorId, form: pick(value.form, DRAFT_FIELDS) };
  }
  throw new Error("Dados offline inválidos.");
}

export async function saveOfflineRecord(ownerId, type, data, resourceId = "") {
  const record = {
    key: keyFor(ownerId, type, resourceId),
    ownerId,
    type,
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    data: sanitize(type, data),
  };
  const write = getDb().then((db) => db.put("records", record));
  if (!pendingWrites.has(ownerId)) pendingWrites.set(ownerId, new Set());
  pendingWrites.get(ownerId).add(write);
  try {
    await write;
  } finally {
    pendingWrites.get(ownerId)?.delete(write);
  }
  return record;
}

export async function readOfflineRecord(ownerId, type, resourceId = "") {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) return null;
  const record = await (await getDb()).get("records", keyFor(ownerId, type, resourceId));
  return record?.ownerId === ownerId && record?.type === type && record?.schemaVersion === 1
    ? record
    : null;
}

export async function deleteOfflineRecord(ownerId, type, resourceId = "") {
  await (await getDb()).delete("records", keyFor(ownerId, type, resourceId));
}

export async function readPendingCases(ownerId) {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) return [];
  const prefix = `${ownerId}:pending-case:`;
  const db = await getDb();
  const records = await db.getAll(
    "records",
    globalThis.IDBKeyRange.bound(prefix, `${prefix}\uffff`),
  );
  return records
    .filter(
      (record) =>
        record.ownerId === ownerId && record.type === "pending-case" && record.schemaVersion === 1,
    )
    .map((record) => record.data)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function clearUserOfflineData(ownerId) {
  keyFor(ownerId, "");
  await Promise.allSettled([...(pendingWrites.get(ownerId) || [])]);
  const prefix = `${ownerId}:`;
  const db = await getDb();
  const tx = db.transaction("records", "readwrite");
  const keys = await tx.store.getAllKeys(globalThis.IDBKeyRange.bound(prefix, `${prefix}\uffff`));
  await Promise.all(keys.map((key) => tx.store.delete(key)));
  await tx.done;
}
