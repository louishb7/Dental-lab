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
let dashboardMode = "online";
let postMode = "online";
let activeUser = { id: 1, username: "tester", email: "tester@example.com" };
let postCount = 0;
let meCount = 0;
let refreshCount = 0;
let secondaryDelayMs = 0;
let nextCaseId = 2;
let deliveryCount = 0;
const requestLog = [];
const createdByKey = new Map();
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
async function offerInstall() {
  await evaluate(`(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = () => { window.__installPromptCount = (window.__installPromptCount || 0) + 1; return Promise.resolve(); };
    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  })()`);
}
const records = `new Promise((resolve,reject) => { const r=indexedDB.open('cadisk-offline'); r.onerror=()=>reject(r.error); r.onsuccess=()=>{const q=r.result.transaction('records').objectStore('records').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)} })`;

async function intercept({ requestId, request }) {
  const url = new URL(request.url);
  if (url.hostname !== "localhost" || url.port !== "3001")
    return command("Fetch.continueRequest", { requestId });
  requestLog.push({
    method: request.method,
    path: url.pathname,
    at: Date.now(),
    key:
      request.method === "POST" && url.pathname === "/cases/"
        ? JSON.parse(request.postData || "{}").client_request_id
        : null,
  });
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
  if (url.pathname === "/dashboard/overview" && dashboardMode === "network")
    return command("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
  if (
    apiMode === "network" ||
    (request.method === "POST" && url.pathname === "/cases/" && postMode === "network")
  ) {
    if (request.method === "POST" && url.pathname === "/cases/") postCount++;
    return command("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
  }
  let status = apiMode === "server" ? 503 : 200;
  let body = { detail: "API indisponível" };
  if (request.headers.Authorization === "Bearer expired") {
    status = 401;
    body = { detail: "Token expirado" };
  }
  if (
    secondaryDelayMs &&
    request.method === "GET" &&
    ["/doctors/", "/dashboard/overview"].includes(url.pathname)
  )
    await delay(secondaryDelayMs);
  if (url.pathname === "/auth/me") {
    meCount++;
    if (apiMode === "unauthorized") {
      status = 401;
      body = { detail: "Sessão expirada" };
    } else if (status === 200) body = activeUser;
  } else if (status === 200 && url.pathname === "/auth/session") {
    body = { refresh_token: "b".repeat(64) };
  } else if (url.pathname === "/auth/refresh") {
    refreshCount++;
    status = apiMode === "unauthorized" ? 401 : status;
    body =
      status === 200
        ? {
            access_token: `token-${activeUser.id}`,
            refresh_token: refreshCount.toString(16).padStart(64, "c"),
          }
        : { detail: "Sessão inválida" };
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
    if (postMode === "unauthorized") {
      status = 401;
      body = { detail: "Sessão expirada" };
    } else if (postMode === "invalid") {
      status = 422;
      body = { detail: "Dados inválidos" };
    } else if (postMode === "server") {
      status = 503;
      body = { detail: "Servidor indisponível" };
    } else {
      const payload = JSON.parse(request.postData || "{}");
      body = createdByKey.get(`${activeUser.id}:${payload.client_request_id}`);
      if (!body) {
        body = {
          id: nextCaseId++,
          ...payload,
          status: "pending",
          items_count: payload.items?.length || 0,
        };
        createdByKey.set(`${activeUser.id}:${payload.client_request_id}`, body);
        cases.push(body);
      }
      if (postMode === "lost")
        return command("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
      status = 201;
    }
  } else if (
    status === 200 &&
    url.pathname === "/cases/bulk-deliver" &&
    request.method === "POST"
  ) {
    deliveryCount++;
    const ids = JSON.parse(request.postData || "{}").case_ids;
    body = cases
      .filter((item) => ids.includes(item.id))
      .map((item) => {
        item.status = "delivered";
        return { ...item };
      });
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
  const standaloneScript = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => query === '(display-mode: standalone)'
        ? { matches: true, addEventListener() {}, removeEventListener() {} }
        : original(query);
    })();`,
  });
  await navigate("/");
  await offerInstall();
  assert.equal(
    await evaluate(`document.body.textContent.includes('Instale o Cadisk')`),
    false,
    "Standalone must not show installation UI",
  );
  await command("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: standaloneScript.identifier,
  });
  const browserAgent = await evaluate(`navigator.userAgent`);
  const iosScript = await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      const original = window.addEventListener.bind(window);
      window.addEventListener = (type, ...args) =>
        type === 'beforeinstallprompt' ? undefined : original(type, ...args);
    })();`,
  });
  await command("Emulation.setUserAgentOverride", {
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await navigate("/");
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  await click("Instalar Cadisk");
  await waitFor(`document.body.textContent.includes('Adicionar à Tela de Início')`);
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Fechar"]').click()`);
  await command("Emulation.setUserAgentOverride", { userAgent: browserAgent });
  await navigate("/");
  assert.equal(await evaluate(`document.body.textContent.includes('Instale o Cadisk')`), false);
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: iosScript.identifier });
  await navigate("/");
  await offerInstall();
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  await evaluate(`document.querySelector('[aria-label="Fechar sugestão de instalação"]').click()`);
  await waitFor(`!document.body.textContent.includes('Instale o Cadisk')`);
  await input("identifier", "tester");
  await input("password", "password");
  await evaluate(
    `document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`,
  );
  await waitFor(`localStorage.getItem('cadisk_user')?.includes('"id":1')`);
  await evaluate(
    `history.pushState({}, '', '/cases'); window.dispatchEvent(new PopStateEvent('popstate'))`,
  );
  await waitFor(`location.pathname === '/cases'`);
  assert.equal(
    await evaluate(`document.body.textContent.includes('Instale o Cadisk')`),
    false,
    "Dismissed install UI must stay hidden on SPA navigation",
  );
  await navigate("/");
  await offerInstall();
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  await click("Instalar Cadisk");
  await waitFor(`!document.body.textContent.includes('Instale o Cadisk')`);
  assert.equal(await evaluate(`window.__installPromptCount`), 1);
  await navigate("/");
  await offerInstall();
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  await evaluate(`window.dispatchEvent(new Event('appinstalled'))`);
  await waitFor(`!document.body.textContent.includes('Instale o Cadisk')`);
  await navigate("/");
  await waitFor(`(await ${records}).some(row => row.type === 'cases' && row.ownerId === 1)`);
  assert.ok(meCount > 0, "Online /auth/me should succeed");
  await waitFor(`(await navigator.serviceWorker.getRegistration())?.active`);
  await waitFor(`document.querySelector('[aria-label="Semana de produção"]')`);
  assert.equal(
    await evaluate(
      `document.querySelector('[aria-label="Semana de produção"] button').getClientRects().length > 0`,
    ),
    true,
  );
  await evaluate(
    `Array.from(document.querySelector('[aria-label="Semana de produção"]').querySelectorAll('button')).find(button => button.textContent.trim() === 'Novo caso').click()`,
  );
  await waitFor(`document.querySelector('[name=deadline]')`);
  const todayKey = await evaluate(
    `(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-') })()`,
  );
  assert.equal(await evaluate(`document.querySelector('[name=deadline]').value`), todayKey);
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Fechar"]').click()`);
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await waitFor(`document.querySelector('[aria-label="Semana de produção"]')`);
  assert.equal(
    await evaluate(
      `Array.from(document.querySelector('[aria-label="Semana de produção"]').querySelectorAll('button')).find(button => button.textContent.trim() === 'Novo caso').getClientRects().length`,
    ),
    0,
    "Desktop week action must be hidden on mobile",
  );
  assert.equal(
    await evaluate(
      `document.querySelector('[aria-label="Semana de produção"]').textContent.includes('Neste dia')`,
    ),
    false,
  );
  await evaluate(`document.querySelector('[aria-label="Próxima semana"]').click()`);
  await evaluate(
    `document.querySelector('[aria-label="Dias da semana"] > div:nth-child(4) > button').click()`,
  );
  const selectedThursday = await evaluate(
    `(() => { const d = new Date(); d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1-d.getDay()) + 10); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-') })()`,
  );
  assert.ok(
    await evaluate(
      `document.querySelector('[aria-label="Criar caso no dia selecionado"]').getClientRects().length > 0`,
    ),
  );
  await evaluate(`document.querySelector('[aria-label="Criar caso no dia selecionado"]').click()`);
  await waitFor(`document.querySelector('[name=deadline]')`);
  assert.equal(await evaluate(`document.querySelector('[name=deadline]').value`), selectedThursday);
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Fechar"]').click()`);
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(`(await ${records}).some(row => row.type === 'dashboard' && row.ownerId === 1)`);
  dashboardMode = "network";
  await navigate("/");
  await waitFor(
    `document.body.textContent.includes('Último estado conhecido') && document.body.textContent.includes('Semana de produção')`,
  );
  dashboardMode = "online";
  await navigate("/");
  await waitFor(
    `document.body.textContent.includes('Semana de produção') && !document.body.textContent.includes('Último estado conhecido')`,
  );
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
  const postsBefore = postCount;
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await evaluate(
    `(() => { const select = document.querySelector('[role=dialog] select'); select.value = ''; select.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
  await input("patient_ref", "Paciente offline");
  await click("Valor fixo");
  await input("total_value", "120,00");
  assert.equal(await evaluate(`document.body.textContent.includes('Salvar rascunho')`), false);
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.type === 'pending-case' && row.data.payload.patient_ref === 'Paciente offline' && row.data.doctorId === null)`,
  );
  await waitFor(`document.body.textContent.includes('Aguardando sincronização')`);
  assert.equal(postCount, postsBefore, "Known offline state must not POST");

  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Paciente com dentista offline");
  await click("Valor fixo");
  await input("total_value", "90,00");
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await offerInstall();
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  swVersion = 3;
  await evaluate(`navigator.serviceWorker.getRegistration().then(reg => reg.update())`);
  await waitFor(`document.body.textContent.includes('Nova versão disponível')`);
  assert.equal(
    await evaluate(`(() => {
    const save = document.querySelector('[role=dialog] button[type=submit]').getBoundingClientRect();
    const warnings = [...document.querySelectorAll('[role=status]')].filter(el => /API indisponível|Nova versão disponível/.test(el.textContent));
    const install = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Instalar Cadisk')?.parentElement;
    return [...warnings, install].filter(Boolean).every(el => {
      const r = el.getBoundingClientRect();
      return r.bottom <= save.top || r.top >= save.bottom || r.right <= save.left || r.left >= save.right;
    });
  })()`),
    true,
    "PWA banners must not cover Save on mobile",
  );
  await click("Depois");
  await evaluate(`document.querySelector('[aria-label="Fechar sugestão de instalação"]').click()`);
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).filter(row => row.type === 'pending-case' && row.ownerId === 1).length === 2`,
  );
  assert.equal(postCount, postsBefore);
  await waitFor(`!document.querySelector('[name=patient_ref]')`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Dente offline");
  await waitFor(`document.querySelector('[role=button][aria-label="Dente 11"]')`);
  await evaluate(
    `document.querySelector('[role=button][aria-label="Dente 11"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`,
  );
  await waitFor(`document.querySelector('input[placeholder="R$ 0,00"]')`);
  await evaluate(
    `(() => { const el=document.querySelector('input[placeholder="R$ 0,00"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'14000'); el.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.type === 'pending-case' && row.data.payload.patient_ref === 'Dente offline' && row.data.payload.items?.[0]?.tooth === '11' && row.data.payload.items[0].unit_value === 140)`,
  );
  assert.equal(postCount, postsBefore);
  await navigate("/cases");
  await waitFor(
    `document.body.textContent.includes('Paciente offline') && document.body.textContent.includes('Paciente com dentista offline') && document.body.textContent.includes('Dente offline')`,
  );
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // An old manual draft is restored only after explicit user action.
  await evaluate(`(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('cadisk-offline');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').put({
      key: '1:draft:', ownerId: 1, type: 'draft', schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      data: { doctorId: null, form: { patient_ref: 'Rascunho legado', pricing_mode: 'fixed', total_value: 'R$ 50,00', deadline: '', priority: 'normal', notes: '', selected_teeth: [], unit_values: {}, service_name: '' } }
    });
    await new Promise(resolve => tx.oncomplete = resolve);
  })()`);
  await navigate("/cases");
  await click("Novo caso");
  await waitFor(`document.body.textContent.includes('Há um rascunho local')`);
  assert.equal(postCount, postsBefore, "Legacy draft must never be sent automatically");
  await click("Restaurar");
  assert.equal(
    await evaluate(`document.querySelector('[name=patient_ref]').value`),
    "Rascunho legado",
  );
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).filter(row => row.type === 'pending-case' && row.ownerId === 1).length === 4`,
  );
  assert.ok((await evaluate(`(async()=>${records})()`)).every((row) => row.type !== "draft"));

  await command("Network.emulateNetworkConditions", {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  apiMode = "online";
  await evaluate(`localStorage.setItem('cadisk_token', 'expired')`);
  const refreshesBeforeSync = refreshCount;
  await evaluate(`window.dispatchEvent(new Event('online'))`);
  await waitFor(`(await ${records}).every(row => row.type !== 'pending-case')`);
  await waitFor(`document.body.textContent.includes('Rascunho legado')`);
  assert.equal(postCount, postsBefore + 4, "Four local cases must sync once each");
  assert.equal(
    refreshCount - refreshesBeforeSync,
    1,
    "Reconnect must rotate once before outbox sync",
  );
  assert.equal(await evaluate(`localStorage.getItem('cadisk_token')`), "token-1");
  await evaluate(`localStorage.setItem('cadisk_token', 'expired')`);
  const refreshesBeforeReopen = refreshCount;
  const credentialBeforeReopen = await evaluate(`localStorage.getItem('cadisk_refresh_token')`);
  await navigate("/cases");
  await waitFor(`localStorage.getItem('cadisk_token') === 'token-1'`);
  assert.equal(await evaluate(`location.pathname`), "/cases");
  assert.equal(
    refreshCount - refreshesBeforeReopen,
    1,
    "Reopen must restore from refresh credential",
  );
  assert.notEqual(
    await evaluate(`localStorage.getItem('cadisk_refresh_token')`),
    credentialBeforeReopen,
  );
  assert.equal(
    cases.filter((item) =>
      [
        "Paciente offline",
        "Paciente com dentista offline",
        "Dente offline",
        "Rascunho legado",
      ].includes(item.patient_ref),
    ).length,
    4,
  );
  assert.equal(cases.find((item) => item.patient_ref === "Paciente offline")?.doctor_id, null);

  // A fast mutation must release its modal before deliberately slow secondary GETs.
  secondaryDelayMs = 1800;
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Criação rápida");
  await click("Valor fixo");
  await input("total_value", "70,00");
  const createRequestStart = requestLog.length;
  const createStartedAt = Date.now();
  await click("Salvar caso");
  await waitFor(`!document.querySelector('[name=patient_ref]')`);
  assert.ok(Date.now() - createStartedAt < 1200, "Slow GETs must not keep the creation modal open");
  assert.equal(
    requestLog
      .slice(createRequestStart)
      .filter((item) => item.method === "POST" && item.path === "/cases/").length,
    1,
  );
  assert.ok(await evaluate(`document.body.textContent.includes('Criação rápida')`));
  secondaryDelayMs = 0;
  await delay(1900);

  cases.find((item) => item.patient_ref === "Paciente offline").status = "completed";
  cases.find((item) => item.patient_ref === "Paciente com dentista offline").status = "completed";
  await navigate("/cases");
  await waitFor(`document.body.textContent.includes('Registrar entrega')`);
  secondaryDelayMs = 1800;
  const deliveryRequestStart = requestLog.length;
  const deliveryStartedAt = Date.now();
  await click("Registrar entrega");
  await click("Confirmar saída");
  await waitFor(`!document.body.textContent.includes('Confirmar saída')`);
  assert.ok(Date.now() - deliveryStartedAt < 1200, "Slow GETs must not keep delivery blocked");
  assert.equal(deliveryCount, 1);
  assert.equal(
    requestLog
      .slice(deliveryRequestStart)
      .filter((item) => item.method === "GET" && item.path === "/cases/").length,
    0,
  );
  assert.equal(cases.find((item) => item.patient_ref === "Paciente offline").status, "delivered");
  secondaryDelayMs = 0;
  await delay(1900);

  postMode = "lost";
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Resposta perdida");
  await click("Valor fixo");
  await input("total_value", "80,00");
  const lostRequestStart = requestLog.length;
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.type === 'pending-case' && row.data.payload.patient_ref === 'Resposta perdida')`,
  );
  assert.equal(cases.filter((item) => item.patient_ref === "Resposta perdida").length, 1);
  postMode = "online";
  await click("Tentar novamente");
  await waitFor(`(await ${records}).every(row => row.type !== 'pending-case')`);
  const lostPosts = requestLog
    .slice(lostRequestStart)
    .filter((item) => item.method === "POST" && item.path === "/cases/");
  assert.equal(lostPosts.length, 2);
  assert.equal(lostPosts[0].key, lostPosts[1].key);
  assert.equal(cases.filter((item) => item.patient_ref === "Resposta perdida").length, 1);

  postMode = "invalid";
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Caso para revisar");
  await click("Valor fixo");
  await input("total_value", "45,00");
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.type === 'pending-case' && row.data.state === 'failed')`,
  );
  postMode = "online";
  const postsAtFailure = postCount;
  await evaluate(`window.dispatchEvent(new Event('online'))`);
  await delay(400);
  assert.equal(postCount, postsAtFailure, "A 4xx failure must not loop");
  await click("Revisar");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await click("Salvar caso");
  await waitFor(`(await ${records}).every(row => row.type !== 'pending-case')`);

  postMode = "server";
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Falha do servidor");
  await click("Valor fixo");
  await input("total_value", "55,00");
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.type === 'pending-case' && row.data.payload.patient_ref === 'Falha do servidor')`,
  );
  postMode = "online";
  await navigate("/cases"); // A fresh app load also retries owned pending cases.
  await waitFor(`(await ${records}).every(row => row.type !== 'pending-case')`);

  apiMode = "network";
  await evaluate(`window.dispatchEvent(new Event('offline'))`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Pendente no logout");
  await click("Valor fixo");
  await input("total_value", "60,00");
  await click("Salvar caso");
  await waitFor(`(await ${records}).some(row => row.type === 'pending-case')`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  await input("patient_ref", "Edição em andamento");
  await offerInstall();
  await waitFor(`document.body.textContent.includes('Instale o Cadisk')`);
  swVersion = 4;
  await evaluate(`navigator.serviceWorker.getRegistration().then(reg => reg.update())`);
  await waitFor(
    `Array.from(document.querySelectorAll('button')).some(button => button.textContent === 'Depois')`,
  );
  await click("Instalar Cadisk");
  assert.ok(await evaluate(`document.body.textContent.includes('Nova versão disponível')`));
  await click("Depois");
  assert.equal(
    await evaluate(`document.querySelector('[name=patient_ref]').value`),
    "Edição em andamento",
  );
  await evaluate(`document.querySelector('[role=dialog] button[aria-label="Fechar"]').click()`);
  await evaluate(
    `(() => { const button = Array.from(document.querySelectorAll('button[aria-label^="Conta de "]')).find(button => button.getClientRects().length); button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })); button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', button: 0 })); })()`,
  );
  await waitFor(
    `Array.from(document.querySelectorAll('[role=menuitem]')).some(item => item.textContent.trim() === 'Sair')`,
  );
  await click("Sair");
  await waitFor(`document.body.textContent.includes('Sair com casos não sincronizados?')`);
  assert.ok(
    (await evaluate(`(async()=>${records})()`)).some(
      (row) => row.type === "pending-case" && row.ownerId === 1,
    ),
  );
  await click("Cancelar");
  assert.equal(await evaluate(`localStorage.getItem('cadisk_token')`), "token-1");
  assert.ok(
    (await evaluate(`(async()=>${records})()`)).some(
      (row) => row.type === "pending-case" && row.ownerId === 1,
    ),
  );
  await evaluate(
    `(() => { const button = Array.from(document.querySelectorAll('button[aria-label^="Conta de "]')).find(button => button.getClientRects().length); button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })); button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', button: 0 })); })()`,
  );
  await waitFor(
    `Array.from(document.querySelectorAll('[role=menuitem]')).some(item => item.textContent.trim() === 'Sair')`,
  );
  await click("Sair");
  await waitFor(`document.body.textContent.includes('Sair com casos não sincronizados?')`);
  await click("Sair e apagar");
  await waitFor(`localStorage.getItem('cadisk_token') === null`);
  await waitFor(`(await ${records}).every(row => row.ownerId !== 1)`);
  apiMode = "online";
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
  await waitFor(
    `(await ${records}).some(row => row.ownerId === 2 && row.type === 'doctors' && row.data.length === 0)`,
  );
  apiMode = "network";
  await navigate("/cases");
  await waitFor(`document.body.textContent.includes('Último estado conhecido')`);
  await click("Novo caso");
  await waitFor(`document.querySelector('[name=patient_ref]')`);
  assert.equal(await evaluate(`document.querySelector('[role=dialog] select').value`), "");
  await input("patient_ref", "Avulso sem dentistas");
  await click("Salvar caso");
  await waitFor(
    `(await ${records}).some(row => row.ownerId === 2 && row.type === 'pending-case' && row.data.doctorId === null)`,
  );
  apiMode = "online";
  postMode = "unauthorized";
  await evaluate(`window.dispatchEvent(new Event('online'))`);
  await waitFor(`localStorage.getItem('cadisk_token') === null`);
  assert.ok((await evaluate(`(async()=>${records})()`)).every((row) => row.ownerId !== 2));
  await Promise.all(interceptions);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: PWA shell/update/install, offline pending cases, idempotent retry, mobile banners, fast create/delivery, legacy draft and auth isolation.",
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
