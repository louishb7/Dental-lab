// Browser smoke checks using Node's built-in WebSocket and Chromium DevTools.
// Start Vite and an isolated Chromium with --remote-debugging-port=9339 first.
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const appUrl = process.env.AUTH_TEST_APP_URL || "http://127.0.0.1:5178";
const browserUrl = process.env.AUTH_TEST_BROWSER_URL || "http://127.0.0.1:9339";
for (const url of [appUrl, browserUrl]) {
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(url).hostname),
    "Only local test servers are allowed",
  );
}
const target = await fetch(`${browserUrl}/json/new?${encodeURIComponent("about:blank")}`, {
  method: "PUT",
}).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let nextId = 0;
const pending = new Map();
const counts = { login: 0, register: 0, forgot: 0, reset: 0 };
let lastLogin;
let lastReset;
let failRecovery = false;
let checks = 0;
const generic =
  "Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir a senha.";

function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function intercepted(params) {
  const { requestId, request } = params;
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/auth/")) return command("Fetch.continueRequest", { requestId });
  let body = {};
  let status = 200;
  const payload = JSON.parse(request.postData || "{}");
  if (request.method === "OPTIONS") status = 204;
  else if (path === "/auth/me") body = { id: 1, username: "tester", email: "test@example.com" };
  else if (path === "/auth/login") {
    counts.login++;
    lastLogin = payload;
    status = 401;
    body = { detail: "Credenciais inválidas" };
  } else if (path === "/auth/register") {
    counts.register++;
    status = 422;
    body = {
      detail: [
        { loc: ["body", "username"], msg: "Nome de usuário deve ter pelo menos 5 caracteres" },
      ],
    };
  } else if (path === "/auth/forgot-password") {
    counts.forgot++;
    await delay(250);
    if (failRecovery)
      return command("Fetch.failRequest", { requestId, errorReason: "ConnectionFailed" });
    body = { detail: generic };
  } else if (path === "/auth/reset-password") {
    counts.reset++;
    lastReset = payload;
    body = { detail: "Senha redefinida." };
  } else throw new Error("Unexpected auth endpoint");
  return command("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: appUrl },
      { name: "Access-Control-Allow-Headers", value: "content-type,authorization" },
      { name: "Access-Control-Allow-Methods", value: "POST,GET,OPTIONS" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}
socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const waiter = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) waiter.reject(new Error(data.error.message));
    else waiter.resolve(data.result);
  } else if (data.method === "Fetch.requestPaused") {
    intercepted(data.params).catch((error) => {
      // Navigation can cancel an intercepted request before its mock response is delivered.
      if (error.message === "Invalid InterceptionId.") return;
      console.error(error.message);
      process.exitCode = 1;
    });
  }
});
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error("Browser evaluation failed");
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await delay(50);
  }
  throw new Error(`UI condition timed out: ${expression}`);
}
async function check(expression, label) {
  assert.ok(await evaluate(expression), label);
  checks++;
}
async function input(name, value) {
  await evaluate(
    `(() => { const input = document.querySelector('input[name="${name}"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await delay(40);
}
const click = (text) =>
  evaluate(
    `[...document.querySelectorAll('button,a')].find(el => el.textContent.trim() === ${JSON.stringify(text)}).click()`,
  );
const submit = () =>
  evaluate(
    `document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`,
  );
async function navigate(path, title) {
  await command("Page.navigate", { url: `${appUrl}${path}` });
  await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(title)}`);
}

try {
  await command("Page.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await navigate("/", "Acesse sua bancada");
  await evaluate("localStorage.clear()");
  await input("password", "x");
  await evaluate(`document.querySelector('[aria-label="Mostrar senha"]').click()`);
  await check(
    `document.querySelector('[name="password"]').type === 'text' && document.querySelector('[name="password"]').value === 'x'`,
    "Login reveals without changing value",
  );
  await evaluate(`document.querySelector('[aria-label="Ocultar senha"]').click()`);
  await check(
    `document.querySelector('[name="password"]').type === 'password'`,
    "Login hides password",
  );
  await check(
    `!document.querySelector('[aria-label="Requisitos da senha"]')`,
    "Login has no creation checklist",
  );
  await input("identifier", "tester");
  await submit();
  await waitFor(`document.querySelector('[role="alert"]')`);
  assert.equal(lastLogin.password, "x");
  checks++;

  await click("Criar conta");
  await waitFor(`document.querySelector('h1')?.textContent === 'Crie sua conta'`);
  await check(
    `!document.body.textContent.includes('Mínimo') && !document.body.textContent.includes('pelo menos 5 caracteres')`,
    "No preventive username rule",
  );
  await check(
    `document.querySelectorAll('li.line-through').length === 0`,
    "Requirements start pending",
  );
  await input("password", "abcde");
  await check(
    `document.querySelectorAll('li.line-through').length === 1`,
    "Five letters complete one requirement",
  );
  await input("password", "abcde1");
  await check(
    `document.querySelectorAll('li.line-through').length === 2`,
    "Number completes second requirement",
  );
  await evaluate(`document.querySelector('[aria-label="Mostrar senha"]').click()`);
  await check(
    `document.querySelector('[name="password"]').type === 'text'`,
    "Registration reveals password",
  );
  await input("password", "abcd");
  await check(
    `document.querySelectorAll('li.line-through').length === 0 && document.querySelector('button[type="submit"]').disabled`,
    "Deleting characters reverts requirements",
  );
  await submit();
  await delay(100);
  assert.equal(counts.register, 0);
  checks++;
  await input("email", "test@example.com");
  await input("username", "abc");
  await input("password", "abcde1");
  await check(
    `!document.body.textContent.includes('pelo menos 5 caracteres')`,
    "Short username error waits for submission",
  );
  await submit();
  await waitFor(`document.body.textContent.includes('pelo menos 5 caracteres')`);
  assert.equal(counts.register, 1);
  checks++;

  await navigate("/forgot-password", "Recupere seu acesso");
  await input("email", "test@example.com");
  await submit();
  await check(
    `document.querySelector('form').getAttribute('aria-busy') === 'true'`,
    "Recovery loading state",
  );
  await waitFor(`document.querySelector('[role="status"]')`);
  await check(
    `document.querySelector('[role="status"]').textContent === ${JSON.stringify(generic)}`,
    "Generic success",
  );
  await check(
    `document.querySelector('button[type="submit"]').disabled && document.querySelector('button[type="submit"]').textContent === 'Instruções enviadas'`,
    "Success locks the submit button",
  );
  await submit();
  await delay(100);
  assert.equal(counts.forgot, 1);
  checks++;
  await input("email", "second@example.com");
  await check(
    `!document.querySelector('button[type="submit"]').disabled && !document.querySelector('[role="status"]')`,
    "Editing email unlocks form",
  );
  failRecovery = true;
  await submit();
  await waitFor(`document.querySelector('[role="alert"]')`);
  await check(
    `!document.querySelector('button[type="submit"]').disabled`,
    "Network error allows retry",
  );
  failRecovery = false;

  await evaluate(
    `localStorage.setItem('cadisk_token', 'test-session'); localStorage.setItem('cadisk_user', JSON.stringify({ username: 'tester', email: 'test@example.com' }))`,
  );
  const token = "a".repeat(64);
  await navigate(`/reset-password#token=${token}`, "Crie uma nova senha");
  await waitFor(`document.querySelector('[name="password"]')`);
  await check(
    `location.hash === '' && location.search === ''`,
    "Fragment removed with existing session",
  );
  await input("password", "abcde1");
  await evaluate(`document.querySelector('[aria-label="Mostrar senha"]').click()`);
  await check(
    `document.querySelector('[name="password"]').type === 'text' && document.querySelectorAll('li.line-through').length === 2`,
    "Reset toggle and checklist",
  );
  await submit();
  await waitFor(`document.querySelector('[role="status"]')`);
  assert.equal(lastReset.token, token);
  assert.equal(lastReset.password, "abcde1");
  checks++;
  await check(
    `localStorage.getItem('cadisk_token') === null && !document.querySelector('[name="password"]')`,
    "Reset clears session and sensitive form",
  );
  await click("Voltar ao login");
  await waitFor(`document.querySelector('h1')?.textContent === 'Acesse sua bancada'`);
  checks++;
  for (const suffix of ["", "#token=bad", "?token=" + token]) {
    await navigate(`/reset-password${suffix}`, "Crie uma nova senha");
    await waitFor(`document.querySelector('[role="alert"]')`);
    await check(
      `!document.querySelector('[name="password"]') && location.hash === ''`,
      "Missing/malformed/query token rejected",
    );
  }
  console.log(`PASS: ${checks} authentication browser checks (mock HTTP, real React UI).`);
} finally {
  await command("Page.close").catch(() => {});
  socket.close();
}
