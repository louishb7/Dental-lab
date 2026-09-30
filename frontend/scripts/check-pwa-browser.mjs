import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
assert.ok(existsSync(path.join(dist, "sw.js")), "Run npm run build before test:pwa");
const browserBin =
  process.env.AUTH_TEST_BROWSER_BIN ||
  ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/brave.com/brave/brave-browser"].find(
    existsSync,
  );
assert.ok(browserBin, "A local Chromium browser is required");

let swVersion = 1;
let apiMode = "online";
let postMode = "online";
let activeUser = { id: 1, username: "tester", email: "tester@example.com" };
let postCount = 0;
let meCount = 0;
const cases = [
  {
    id: 1,
    doctor_id: 10,
    patient_ref: "Caso existente",
    status: "pending",
    priority: "normal",
    pricing_mode: "fixed",
    total_value: "100.00",
    deadline: "2026-10-01",
    notes: "",
    items_count: 1,
  },
];
const doctors = [
  { id: 10, name: "Dra. Ana", clinic_name: "Clínica", phone: "", notes: "", cases_count: 1 },
];
const dashboard = {
  generated_at: "2026-09-30T12:00:00Z",
  status_counts: { pending: 1, completed: 0, delivered: 0 },
  overdue_cases: [],
  urgent_open_cases: [],
  delivered_cases_month: [],
  delivered_total_month: "0.00",
  delivered_count_month: 0,
  revenue_trend: [],
};
const items = [
  {
    id: 20,
    case_id: 1,
    tooth: "11",
    service_type: "Coroa",
    quantity: 1,
    unit_value: "100.00",
    material: null,
    color: null,
    notes: null,
  },
];

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const relative = pathname === "/" ? "/index.html" : pathname;
  const file = path.resolve(dist, `.${relative}`);
  if (!file.startsWith(`${dist}/`)) return void response.writeHead(404).end();
  let body;
  try {
    body = await readFile(file);
  } catch {
    body = await readFile(path.join(dist, "index.html"));
  }
  if (pathname === "/sw.js")
    body = Buffer.concat([body, Buffer.from(`\n// browser-test-${swVersion}\n`)]);
  const contentType = pathname.endsWith(".js")
    ? "text/javascript"
    : pathname.endsWith(".css")
      ? "text/css"
      : pathname.endsWith(".webmanifest")
        ? "application/manifest+json"
        : pathname.endsWith(".png")
          ? "image/png"
          : pathname.endsWith(".svg")
            ? "image/svg+xml"
            : "text/html";
  response.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(body);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const appUrl = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(path.join(tmpdir(), "cadisk-pwa-"));
const browser = spawn(
  browserBin,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--disable-component-update",
    "--no-first-run",
    "--window-size=1440,900",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { detached: true, stdio: "ignore" },
);
let socket;
let nextId = 0;
const pending = new Map();
const interceptions = new Set();
const errors = [];

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`DevTools timeout: ${method}`));
    }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${expression}`);
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if (await evaluate(`(async () => Boolean(${expression}))()`)) return;
    } catch {
      /* document may be navigating */
    }
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
}
async function navigate(route) {
  await command("Page.navigate", { url: `${appUrl}${route}` });
  await waitFor(
    `document.readyState === 'complete' && document.querySelector('#root')?.children.length > 0`,
  );
}
async function click(label) {
  await evaluate(
    `([...document.querySelectorAll('button,[role=menuitem]')].find(el => el.textContent.trim() === ${JSON.stringify(label)})).click()`,
  );
}
async function input(name, value) {
  await evaluate(
    `(() => { const el = document.querySelector('[name=${JSON.stringify(name)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
}
const records = `new Promise((resolve,reject) => { const r=indexedDB.open('cadisk-offline'); r.onerror=()=>reject(r.error); r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)} })`;

async function intercept({ requestId, request }) {
  const url = new URL(request.url);
  if (url.hostname !== "localhost" || url.port !== "3001")
    return command("Fetch.continueRequest", { requestId });
  if (request.method === "OPTIONS")
    return command("Fetch.fulfillRequest", {
      requestId,
      responseCode: 204,
      responseHeaders: [
        { name: "Access-Control-Allow-Origin", value: appUrl },
        { name: "Access-Control-Allow-Headers", value: "authorization,content-type" },
        { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
      ],
    });
  if (
    apiMode === "network" ||
    (request.method === "POST" && url.pathname === "/cases/" && postMode === "network")
  ) {
    if (request.method === "POST" && url.pathname === "/cases/") postCount++;
    return command("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
  }
  let status = apiMode === "server" ? 503 : 200;
  let body = { detail: "API indisponível" };
  if (url.pathname === "/auth/me") {
    meCount++;
    if (apiMode === "unauthorized") {
      status = 401;
      body = { detail: "Sessão expirada" };
    } else if (status === 200) body = activeUser;
  } else if (status === 200 && url.pathname === "/auth/login") {
    body = {
      access_token: `token-${activeUser.id}`,
      username: activeUser.username,
      email: activeUser.email,
    };
  } else if (status === 200 && url.pathname === "/doctors/")
    body = activeUser.id === 1 ? doctors : [];
  else if (status === 200 && url.pathname === "/cases/" && request.method === "GET")
    body = activeUser.id === 1 ? cases : [];
  else if (status === 200 && url.pathname === "/dashboard/overview")
    body =
      activeUser.id === 1
        ? dashboard
        : { ...dashboard, status_counts: { pending: 0, completed: 0, delivered: 0 } };
  else if (status === 200 && url.pathname === "/cases/1/items/") body = items;
  else if (status === 200 && url.pathname === "/cases/" && request.method === "POST") {
    postCount++;
    body = { id: 2, ...JSON.parse(request.postData || "{}"), status: "pending", items_count: 0 };
    cases.push(body);
  }
  return command("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Cache-Control", value: "no-store" },
      { name: "Access-Control-Allow-Origin", value: appUrl },
      { name: "Access-Control-Allow-Headers", value: "authorization,content-type" },
      { name: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}

try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      port = Number(
        (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0],
      );
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(port, "Browser did not start");
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
    method: "PUT",
  }).then((r) => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const entry = pending.get(data.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(data.id);
      data.error ? entry.reject(new Error(data.error.message)) : entry.resolve(data.result);
    } else if (data.method === "Fetch.requestPaused") {
      const task = intercept(data.params).catch((error) => {
        // Navigation/update can cancel a paused request before CDP fulfills it.
        if (error.message !== "Invalid InterceptionId.") errors.push(error.message);
      });
      interceptions.add(task);
      void task.then(() => interceptions.delete(task));
    }
  });
  await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await command("Runtime.enable");
  await command("Network.enable");
  await command("Fetch.enable", {
    patterns: [{ urlPattern: "http://localhost:3001/*", requestStage: "Request" }],
  });
  await navigate("/");
  await input("identifier", "tester");
  await input("password", "password");
  await evaluate(
    `document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`,
  );
  await waitFor(`localStorage.getItem('cadisk_user')?.includes('"id":1')`);
  await waitFor(`(await ${records}).some(row => row.type === 'cases' && row.ownerId === 1)`);
  assert.ok(meCount > 0, "Online /auth/me should succeed");
  await waitFor(`(await navigator.serviceWorker.getRegistration())?.active`);
  await navigate("/cases");
  await waitFor(`navigator.serviceWorker.controller !== null`);
  await waitFor(`document.body.textContent.includes('Caso existente')`);
  await click("Detalhes");
  await waitFor(`(await ${records}).some(row => row.type === 'items' && row.ownerId === 1)`);
  const onlineRecords = await evaluate(`(async()=>${records})()`);
  assert.ok(
    ["doctors", "cases", "dashboard", "items"].every((type) =>
      onlineRecords.some((row) => row.type === type && row.updatedAt && row.schemaVersion === 1),
    ),
  );
  const obsoleteCache = await evaluate(
    `(async()=>{const name='workbox-precache-obsolete-'+(await navigator.serviceWorker.getRegistration()).scope;await caches.open(name);return name})()`,
  );
  swVersion = 2;
  await evaluate(`navigator.serviceWorker.getRegistration().then(reg => reg.update())`);
  await waitFor(
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Atualizar')`,
  );
  await click("Atualizar");
  await waitFor(`!(await caches.keys()).includes(${JSON.stringify(obsoleteCache)})`);
  await waitFor(
    `document.readyState === 'complete' && localStorage.getItem('cadisk_token') === 'token-1' && document.body.textContent.includes('Caso existente') && !document.body.textContent.includes('Carregando dados')`,
  );
  const lastOnlineCasesTimestamp = (await evaluate(`(async()=>${records})()`)).find(
    (row) => row.type === "cases",
  )?.updatedAt;
  await command("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  apiMode = "network";
  const resetToken = "a".repeat(64);
  await navigate(`/reset-password#token=${resetToken}`);
  await waitFor(`location.hash === '' && document.querySelector('[name=password]')`);
  await navigate("/future-react-route");
  await waitFor(`location.pathname === '/'`);
  await navigate("/cases");
  await evaluate(`window.dispatchEvent(new Event('offline'))`);
  await waitFor(
    `document.body.textContent.includes('Caso existente') && document.body.textContent.includes('Último estado conhecido')`,
  );
  assert.equal(await evaluate(`localStorage.getItem('cadisk_token')`), "token-1");
  const cacheKeys = await evaluate(
    `(async()=> (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(key => key.url)))).flat())()`,
  );
  assert.ok(
    cacheKeys.length >= 11 &&
      cacheKeys.every(
        (url) => !url.includes("/auth/") && !url.includes(resetToken) && !url.includes("/cases/"),
      ),
  );
  assert.ok(!JSON.stringify(await evaluate(`(async()=>${records})()`)).includes(resetToken));
  assert.equal(
    (await evaluate(`(async()=>${records})()`)).find((row) => row.type === "cases")?.updatedAt,
    lastOnlineCasesTimestamp,
    "A failed request must preserve lastUpdatedAt",
  );
  await click("Detalhes");
  await waitFor(`document.body.textContent.includes('Coroa')`);
  assert.equal(
    await evaluate(
      `Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Adicionar serviço')`,
    ),
    false,
    "Previously loaded details must be read-only offline",
  );
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Fechar"]').click()`);
  assert.equal(
    await evaluate(`document.querySelector('button[aria-label^="Marcar "]') === null`),
    true,
  );
  await navigate("/doctors");
  await waitFor(
    `document.body.textContent.includes('Dra. Ana') && document.body.textContent.includes('Último estado conhecido')`,
  );
  await navigate("/finance");
  await waitFor(
    `document.body.textContent.includes('Resultado do mês') && document.body.textContent.includes('Último estado conhecido')`,
  );
  await navigate("/cases");
  await waitFor(`document.body.textContent.includes('Caso existente')`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Paciente offline");
  await click("Valor fixo");
  await input("total_value", "120,00");
  await click("Salvar rascunho");
  await waitFor(
    `(await ${records}).some(row => row.type === 'draft' && row.data.form.patient_ref === 'Paciente offline')`,
  );
  const postsBefore = postCount;
  await navigate("/cases");
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await waitFor(`document.body.textContent.includes('Há um rascunho local')`);
  await click("Restaurar");
  assert.equal(
    await evaluate(`document.querySelector('[name=patient_ref]').value`),
    "Paciente offline",
  );
  assert.equal(postCount, postsBefore, "Draft must not POST automatically");
  await command("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  apiMode = "server";
  await evaluate(`window.dispatchEvent(new Event('online'))`);
  await waitFor(
    `(await navigator.serviceWorker.getRegistration())?.active && document.body.textContent.includes('API indisponível')`,
  );
  assert.equal(
    await evaluate(`localStorage.getItem('cadisk_token')`),
    "token-1",
    "5xx must preserve session",
  );
  apiMode = "online";
  await click("Tentar novamente");
  await waitFor(
    `!document.body.textContent.includes('Último estado conhecido') && !document.body.textContent.includes('API indisponível')`,
  );
  assert.equal(postCount, postsBefore, "Reconnect must not POST a draft");
  postMode = "network";
  await click("Salvar caso");
  await waitFor(`document.body.textContent.includes('Não foi possível confirmar a criação')`);
  assert.equal(
    await evaluate(`document.querySelector('[name=patient_ref]').value`),
    "Paciente offline",
  );
  assert.ok((await evaluate(`(async()=>${records})()`)).some((row) => row.type === "draft"));
  postMode = "online";
  await click("Tentar novamente");
  await waitFor(`!document.body.textContent.includes('API indisponível')`);
  assert.equal(postCount, postsBefore + 1, "Failed POST must not be retried automatically");
  await click("Salvar caso");
  await waitFor(`(await ${records}).every(row => row.type !== 'draft')`);
  assert.equal(postCount, postsBefore + 2);
  await waitFor(`!document.querySelector('[name=patient_ref]')`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Rascunho descartável");
  await click("Salvar rascunho");
  await waitFor(`(await ${records}).some(row => row.type === 'draft')`);
  await click("Novo caso");
  await waitFor(`document.body.textContent.includes('Há um rascunho local')`);
  await click("Descartar");
  await waitFor(`(await ${records}).every(row => row.type !== 'draft')`);
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Edição em andamento");
  swVersion = 3;
  await evaluate(`navigator.serviceWorker.getRegistration().then(reg => reg.update())`);
  await waitFor(
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Depois')`,
  );
  await click("Depois");
  assert.equal(
    await evaluate(`document.querySelector('[name=patient_ref]').value`),
    "Edição em andamento",
  );
  await evaluate(
    `(() => { const button = Array.from(document.querySelectorAll('button[aria-label^="Conta de "]')).find(button => button.getClientRects().length); button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })); button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', button: 0 })); })()`,
  );
  await waitFor(
    `Array.from(document.querySelectorAll('[role=menuitem]')).some(item => item.textContent.trim() === 'Sair')`,
  );
  await click("Sair");
  await waitFor(`localStorage.getItem('cadisk_token') === null`);
  await waitFor(`(await ${records}).every(row => row.ownerId !== 1)`);
  activeUser = { id: 2, username: "other", email: "other@example.com" };
  await input("identifier", "other");
  await input("password", "password");
  await evaluate(
    `document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`,
  );
  await waitFor(`localStorage.getItem('cadisk_user')?.includes('"id":2')`);
  assert.ok(
    !(await evaluate(`document.body.textContent.includes('Caso existente')`)),
    "Previous user's data must not appear",
  );
  apiMode = "unauthorized";
  await evaluate(`window.dispatchEvent(new Event('online'))`);
  await waitFor(`localStorage.getItem('cadisk_token') === null`);
  assert.ok((await evaluate(`(async()=>${records})()`)).every((row) => row.ownerId !== 2));
  await Promise.all(interceptions);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: PWA shell/cache, old-cache cleanup, update activation/deferral, real reset fragment, auth 200/401/network/5xx, isolated snapshots, draft lifecycle, explicit POST.",
  );
} finally {
  socket?.close();
  try {
    process.kill(-browser.pid, "SIGTERM");
  } catch {
    /* already closed */
  }
  if (browser.exitCode === null)
    await Promise.race([new Promise((resolve) => browser.once("exit", resolve)), delay(2000)]);
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
