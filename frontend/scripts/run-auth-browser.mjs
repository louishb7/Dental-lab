// Own every test resource so success, failure and interruption share the same cleanup.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const children = new Set();
const startupErrors = new WeakMap();
const interruption = new AbortController();
let server;
let httpServer;
let profile;
let cleaning;

function start(executable, args, options = {}) {
  const child = spawn(executable, args, { detached: true, stdio: "inherit", ...options });
  children.add(child);
  child.once("error", (error) => startupErrors.set(child, error));
  return child;
}

function cleanup() {
  if (cleaning) return cleaning;
  cleaning = (async () => {
    for (const child of children) {
      if (!child.pid) continue;
      // Only process groups launched by this run, never a shared browser/server.
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
      if (child.exitCode === null && child.signalCode === null) {
        await Promise.race([new Promise((resolve) => child.once("exit", resolve)), delay(2000)]);
      }
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
    if (httpServer?.listening) {
      httpServer.closeAllConnections();
      await new Promise((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await server?.close();
    if (profile) await rm(profile, { recursive: true, force: true });
  })();
  return cleaning;
}

for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  process.once(signal, () => {
    process.exitCode = code;
    interruption.abort(new Error(`Browser checks interrupted by ${signal}`));
  });
}

try {
  const executable =
    process.env.AUTH_TEST_BROWSER_BIN ||
    [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
      "/opt/brave.com/brave/brave-browser",
    ].find(existsSync);
  if (!executable) throw new Error("Set AUTH_TEST_BROWSER_BIN to a local Chromium executable.");
  profile = await mkdtemp(path.join(tmpdir(), "cadisk-smoke-"));
  interruption.signal.throwIfAborted();
  server = await createServer({
    root,
    server: { middlewareMode: true, hmr: false, open: false },
    define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://127.0.0.1:3001") },
  });
  interruption.signal.throwIfAborted();
  // Vite treats port 0 as its default port; let Node allocate an exclusive local port.
  httpServer = createHttpServer(server.middlewares);
  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(0, "127.0.0.1", resolve);
  });
  interruption.signal.throwIfAborted();
  const address = httpServer.address();
  if (!address || typeof address === "string") throw new Error("Vite did not bind a local port.");
  const browser = start(
    executable,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--disable-component-update",
      "--no-first-run",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let browserPort;
  for (let attempt = 0; attempt < 100; attempt++) {
    interruption.signal.throwIfAborted();
    if (startupErrors.has(browser)) throw startupErrors.get(browser);
    if (!browser.pid || browser.exitCode !== null || browser.signalCode !== null) {
      throw new Error("The isolated browser could not start or was interrupted.");
    }
    try {
      browserPort = Number(
        (await readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0],
      );
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await delay(100);
  }
  if (!browserPort) throw new Error("Timed out starting the isolated browser.");
  interruption.signal.throwIfAborted();
  const worker = start(process.execPath, [path.join(root, "scripts/check-auth-browser.mjs")], {
    env: {
      ...process.env,
      AUTH_TEST_APP_URL: `http://127.0.0.1:${address.port}`,
      AUTH_TEST_BROWSER_URL: `http://127.0.0.1:${browserPort}`,
    },
  });
  const timeout = setTimeout(() => {
    interruption.abort(new Error("Authentication browser checks timed out."));
  }, 60_000);
  try {
    const code = await new Promise((resolve, reject) => {
      interruption.signal.addEventListener("abort", () => reject(interruption.signal.reason), {
        once: true,
      });
      worker.once("error", reject);
      worker.once("exit", (code) => resolve(code));
    });
    if (code !== 0) throw new Error("Authentication browser checks failed.");
  } finally {
    clearTimeout(timeout);
  }
} finally {
  await cleanup();
}
