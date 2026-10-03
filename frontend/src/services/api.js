const DEFAULT_API_ROOT_URL = "http://localhost:3001";
const API_ROOT_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ROOT_URL).replace(
  /\/+$/,
  "",
);
const DOCTORS_URL = `${API_ROOT_URL}/doctors`;
const CASES_URL = `${API_ROOT_URL}/cases`;
const CASE_HISTORY_URL = `${API_ROOT_URL}/case-history`;
const REFRESH_KEY = "cadisk_refresh_token";
let refreshPromise = null;

export function hasRefreshSession() {
  return Boolean(window.localStorage.getItem(REFRESH_KEY));
}

async function rotateSession() {
  if (navigator.onLine === false) throw new Error("Sem conexão");
  const rotate = async () => {
    const credential = window.localStorage.getItem(REFRESH_KEY);
    if (!credential) throw new Error("Sessão ausente");
    const response = await globalThis.fetch(`${API_ROOT_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: credential }),
      cache: "no-store",
    });
    if (!response.ok) {
      if (credential !== window.localStorage.getItem(REFRESH_KEY)) return;
      const error = new Error("Sessão inválida");
      error.status = response.status;
      throw error;
    }
    const payload = await response.json();
    if (typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
      throw new Error("Resposta de sessão inválida");
    }
    if (credential === window.localStorage.getItem(REFRESH_KEY)) {
      window.localStorage.setItem("cadisk_token", payload.access_token);
      window.localStorage.setItem(REFRESH_KEY, payload.refresh_token);
    }
  };
  if (!refreshPromise) {
    refreshPromise = (async () => {
      if (navigator.locks) await navigator.locks.request("cadisk-refresh", rotate);
      else await rotate();
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

let apiAvailability = navigator.onLine ? "unknown" : "unavailable";
const availabilityListeners = new Set();

export function getApiAvailability() {
  return apiAvailability;
}

export function subscribeApiAvailability(listener) {
  availabilityListeners.add(listener);
  return () => availabilityListeners.delete(listener);
}

function setApiAvailability(next, reason) {
  if (apiAvailability === next) return;
  const previous = apiAvailability;
  apiAvailability = next;
  availabilityListeners.forEach((listener) => listener(next, previous, reason));
}

window.addEventListener("offline", () => setApiAvailability("unavailable", "network"));

// Every request in this module goes through this transport; no API response enters Cache Storage.
async function fetch(url, options = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && !url.includes("/auth/") && apiAvailability === "unavailable") {
    const error = new Error("API indisponível. Alterações exigem conexão.");
    error.code = "OFFLINE_WRITE_BLOCKED";
    throw error;
  }

  let response;
  try {
    response = await globalThis.fetch(url, options);
    if (response.status === 401 && !url.includes("/auth/") && hasRefreshSession()) {
      if (
        !window.localStorage.getItem("cadisk_token") ||
        options.headers?.Authorization === `Bearer ${window.localStorage.getItem("cadisk_token")}`
      )
        await rotateSession();
      response = await globalThis.fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${window.localStorage.getItem("cadisk_token")}`,
        },
      });
    } else if (response.status === 401 && url.endsWith("/auth/me") && hasRefreshSession()) {
      if (
        !window.localStorage.getItem("cadisk_token") ||
        options.headers?.Authorization === `Bearer ${window.localStorage.getItem("cadisk_token")}`
      )
        await rotateSession();
      response = await globalThis.fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${window.localStorage.getItem("cadisk_token")}`,
        },
      });
    }
  } catch (error) {
    if (error.status !== 401) setApiAvailability("unavailable", "network");
    throw error;
  }
  setApiAvailability(
    response.status >= 500 ? "unavailable" : "available",
    response.status === 401 ? "auth" : "response",
  );
  return response;
}

/**
 * Builds default request headers for the Cadisk API.
 *
 * The token is optional and keeps this doctors module compatible with the
 * authenticated backend without coupling the UI to a login screen.
 *
 * @returns {HeadersInit} Headers used in JSON requests.
 */
function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = window.localStorage.getItem("cadisk_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Parses an API response and raises a descriptive error for non-2xx statuses.
 *
 * @param {Response} response Fetch response returned by the browser.
 * @returns {Promise<unknown|null>} Parsed JSON payload or null for empty bodies.
 * @throws {Error} When the API returns an error status.
 */
async function parseResponse(response) {
  const hasBody = response.status !== 204;
  const payload = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const detail = payload?.detail || "Nao foi possivel concluir a operacao.";
    const error = new Error(Array.isArray(detail) ? detail[0]?.msg : detail);
    error.status = response.status;
    error.details = Array.isArray(detail) ? detail : null;
    throw error;
  }

  return payload;
}

/**
 * Saves the authenticated user session in browser storage.
 *
 * @param {{access_token: string, username: string, email: string}} payload
 * Token payload returned by the backend.
 * @returns {{username: string, email: string}} Public session data for the UI.
 */
export function saveSession(payload) {
  const prior = getStoredSession();
  if (prior && prior.username !== payload.username) clearSession();
  window.localStorage.setItem("cadisk_token", payload.access_token);
  if (payload.refresh_token) window.localStorage.setItem(REFRESH_KEY, payload.refresh_token);
  window.localStorage.setItem(
    "cadisk_user",
    JSON.stringify({ username: payload.username, email: payload.email }),
  );

  return { username: payload.username, email: payload.email };
}

export function saveValidatedSession(user) {
  const session = { id: user.id, username: user.username, email: user.email };
  window.localStorage.setItem("cadisk_user", JSON.stringify(session));
  return session;
}

/**
 * Reads the saved Cadisk user session from browser storage.
 *
 * @returns {{username: string, email: string}|null} Stored user data or null.
 */
export function getStoredSession() {
  const rawUser = window.localStorage.getItem("cadisk_user");
  const token = window.localStorage.getItem("cadisk_token");

  if (!rawUser || (!token && !hasRefreshSession())) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Removes the current Cadisk authentication data from browser storage.
 *
 * @returns {void}
 */
export function clearSession() {
  window.localStorage.removeItem("cadisk_token");
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem("cadisk_user");
  window.localStorage.removeItem("cadisk_last_case_doctor_id");
}

export async function revokeSession() {
  const credential = window.localStorage.getItem(REFRESH_KEY);
  clearSession();
  if (credential && navigator.onLine !== false) {
    try {
      await globalThis.fetch(`${API_ROOT_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: credential }),
        cache: "no-store",
      });
    } catch {
      /* Offline logout removes the device credential below. */
    }
  }
}

/**
 * Authenticates a user with username/email and password.
 *
 * @param {{identifier: string, password: string}} credentials Login credentials.
 * @returns {Promise<{username: string, email: string}>} Public session data.
 */
export async function login(credentials) {
  const response = await fetch(`${API_ROOT_URL}/auth/login`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(credentials),
  });
  const payload = await parseResponse(response);

  return saveSession(payload);
}

/**
 * Creates a user account and stores the returned authentication token.
 *
 * @param {{email: string, username: string, password: string}} data New account data.
 * @returns {Promise<{username: string, email: string}>} Public session data.
 */
export async function register(data) {
  const response = await fetch(`${API_ROOT_URL}/auth/register`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });
  const payload = await parseResponse(response);

  return saveSession(payload);
}

async function recoveryRequest(path, data) {
  const response = await fetch(`${API_ROOT_URL}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    referrerPolicy: "no-referrer",
  });
  return parseResponse(response);
}

export function forgotPassword(email) {
  return recoveryRequest("forgot-password", { email });
}

export function resetPassword(token, password) {
  return recoveryRequest("reset-password", { token, password });
}

/**
 * Fetches the current authenticated user from the backend.
 *
 * @returns {Promise<{id: number, username: string, email: string}>} User profile.
 */
export async function getCurrentUser() {
  const response = await fetch(`${API_ROOT_URL}/auth/me`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetches the operational dashboard summary for the authenticated user.
 *
 * @returns {Promise<object>} Dashboard summary returned by the backend.
 */
export async function getDashboardOverview() {
  const response = await fetch(`${API_ROOT_URL}/dashboard/overview`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetches the active doctors registered in Cadisk.
 *
 * @returns {Promise<Array>} List of doctors returned by the backend.
 */
export async function getDoctors() {
  const response = await fetch(`${DOCTORS_URL}/`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Creates a doctor using the backend JSON contract.
 *
 * @param {{name: string, clinic_name?: string, phone?: string, notes?: string}} data
 * Doctor data collected from the controlled form.
 * @returns {Promise<object>} Doctor created by the backend.
 */
export async function createDoctor(data) {
  const response = await fetch(`${DOCTORS_URL}/`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Updates an active doctor using the backend JSON contract.
 *
 * @param {number} id Unique doctor identifier.
 * @param {object} data Partial doctor data.
 * @returns {Promise<object>} Updated doctor returned by the backend.
 */
export async function updateDoctor(id, data) {
  const response = await fetch(`${DOCTORS_URL}/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Deletes a doctor by id and lets the backend enforce business constraints.
 *
 * @param {number} id Unique doctor identifier.
 * @returns {Promise<null>} Null when the backend confirms deletion.
 */
export async function deleteDoctor(id) {
  const response = await fetch(`${DOCTORS_URL}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetches cases, optionally scoped to a doctor.
 *
 * @param {{doctorId?: number, status?: string}} filters Optional query filters.
 * @returns {Promise<Array>} List of cases returned by the backend.
 */
export async function getCases(filters = {}) {
  const params = new URLSearchParams();

  if (filters.doctorId) {
    params.set("doctor_id", String(filters.doctorId));
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${CASES_URL}/${query}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Creates a case, optionally linked to a doctor.
 *
 * @param {object} data Case payload compatible with the backend schema.
 * @returns {Promise<object>} Case created by the backend.
 */
export async function createCase(data) {
  const response = await fetch(`${CASES_URL}/`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Delivers multiple completed cases in a single request.
 *
 * @param {{case_ids: number[], doctor_id?: number|null}} data Delivery payload.
 * @returns {Promise<Array>} List of delivered cases.
 */
export async function bulkDeliverCases(data) {
  const response = await fetch(`${CASES_URL}/bulk-deliver`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Updates a case by id.
 *
 * @param {number} id Unique case identifier.
 * @param {object} data Partial case payload.
 * @returns {Promise<object>} Updated case.
 */
export async function updateCase(id, data) {
  const response = await fetch(`${CASES_URL}/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Deletes a case by id.
 *
 * @param {number} id Unique case identifier.
 * @returns {Promise<object>} Deleted or soft-deleted case returned by the API.
 */
export async function deleteCase(id) {
  const response = await fetch(`${CASES_URL}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

function buildQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params.toString() ? `?${params.toString()}` : "";
}

/**
 * Fetches paginated historical case records using server-side filters.
 *
 * @param {object} filters Query filters and pagination values.
 * @returns {Promise<{items: Array, pagination: object}>} Paginated history list.
 */
export async function getCaseHistory(filters = {}) {
  const response = await fetch(`${CASE_HISTORY_URL}${buildQueryString(filters)}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetches the detail summary for a case in the historical archive.
 *
 * @param {number} caseId Unique case identifier.
 * @returns {Promise<object>} Case detail returned by the backend.
 */
export async function getCaseHistoryDetail(caseId) {
  const response = await fetch(`${CASE_HISTORY_URL}/${caseId}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Fetches a paginated timeline for a single case.
 *
 * @param {number} caseId Unique case identifier.
 * @param {{page?: number, limit?: number}} pagination Pagination controls.
 * @returns {Promise<{items: Array, pagination: object}>} Paginated events.
 */
export async function getCaseHistoryEvents(caseId, pagination = {}) {
  const response = await fetch(`${CASES_URL}/${caseId}/history${buildQueryString(pagination)}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Permanently deletes one historical case record owned by the authenticated user.
 *
 * @param {number} caseId Unique case identifier.
 * @returns {Promise<{deleted_count: number}>} Deletion summary.
 */
export async function deleteCaseHistoryRecord(caseId) {
  const response = await fetch(`${CASE_HISTORY_URL}/${caseId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Permanently deletes selected historical case records owned by the authenticated user.
 *
 * @param {number[]} caseIds Case identifiers selected in the archive.
 * @returns {Promise<{deleted_count: number}>} Deletion summary.
 */
export async function deleteCaseHistoryRecords(caseIds) {
  const response = await fetch(CASE_HISTORY_URL, {
    method: "DELETE",
    headers: buildHeaders(),
    body: JSON.stringify({ case_ids: caseIds }),
  });

  return parseResponse(response);
}

/**
 * Requests the backend to revert a case to its immediate previous status.
 *
 * @param {number} caseId Unique case identifier.
 * @param {{reason: string}} data Reversion reason.
 * @returns {Promise<object>} Updated case returned by the backend.
 */
export async function revertCaseStatus(caseId, data) {
  const response = await fetch(`${CASES_URL}/${caseId}/revert-status`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Fetches items/services linked to a case.
 *
 * @param {number} caseId Unique case identifier.
 * @returns {Promise<Array>} List of case items.
 */
export async function getCaseItems(caseId) {
  const response = await fetch(`${CASES_URL}/${caseId}/items/`, {
    method: "GET",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}

/**
 * Creates an item/service linked to a case.
 *
 * @param {number} caseId Unique case identifier.
 * @param {object} data Item payload compatible with the backend schema.
 * @returns {Promise<object>} Created item.
 */
export async function createCaseItem(caseId, data) {
  const response = await fetch(`${CASES_URL}/${caseId}/items/`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Creates multiple items/services linked to a case.
 *
 * @param {number} caseId Unique case identifier.
 * @param {object[]} data Array of item payloads compatible with the backend schema.
 * @returns {Promise<object[]>} Created items.
 */
export async function createCaseItemsBulk(caseId, data) {
  const response = await fetch(`${CASES_URL}/${caseId}/items/bulk`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Updates an item/service linked to a case.
 *
 * @param {number} caseId Unique case identifier.
 * @param {number} itemId Unique item identifier.
 * @param {object} data Partial item payload.
 * @returns {Promise<object>} Updated item.
 */
export async function updateCaseItem(caseId, itemId, data) {
  const response = await fetch(`${CASES_URL}/${caseId}/items/${itemId}`, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response);
}

/**
 * Deletes an item/service from a case.
 *
 * @param {number} caseId Unique case identifier.
 * @param {number} itemId Unique item identifier.
 * @returns {Promise<null>} Null when deletion succeeds.
 */
export async function deleteCaseItem(caseId, itemId) {
  const response = await fetch(`${CASES_URL}/${caseId}/items/${itemId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}
