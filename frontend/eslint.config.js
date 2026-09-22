import js from "@eslint/js";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: Object.fromEntries(
        [
          "window",
          "document",
          "navigator",
          "localStorage",
          "sessionStorage",
          "URL",
          "URLSearchParams",
          "fetch",
          "AbortController",
          "AbortSignal",
          "TextEncoder",
          "setTimeout",
          "clearTimeout",
          "setInterval",
          "clearInterval",
          "console",
          "requestAnimationFrame",
          "cancelAnimationFrame",
          "ResizeObserver",
          "WebSocket",
          "process",
          "Buffer",
          "structuredClone",
          "performance",
        ].map((name) => [name, "readonly"]),
      ),
    },
  },
];
