const API_BASE_URL = "http://localhost:8000/doctors";

/**
 * Builds default request headers for the Cadista API.
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
  const token = window.localStorage.getItem("cadista_token");

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
    throw new Error(Array.isArray(detail) ? detail[0]?.msg : detail);
  }

  return payload;
}

/**
 * Fetches the active doctors registered in Cadista.
 *
 * @returns {Promise<Array>} List of doctors returned by the backend.
 */
export async function getDoctors() {
  const response = await fetch(`${API_BASE_URL}/`, {
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
  const response = await fetch(`${API_BASE_URL}/`, {
    method: "POST",
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
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  return parseResponse(response);
}
