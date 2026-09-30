/* global self */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Only known app pages receive the precached shell. The reset token in a URL is never a cache key.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    allowlist: [
      /^\/(?:\?.*)?$/,
      /^\/(?:cases|history|doctors|finance|forgot-password|reset-password)\/?(?:\?.*)?$/,
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Future selected GETs may use NetworkFirst with a versioned, expiring cache,
// separating public and authenticated data by user. Writes would need an
// IndexedDB outbox, Background Sync with startup retry, idempotency and
// conflict rules. No API or authenticated response is cached in this version.
