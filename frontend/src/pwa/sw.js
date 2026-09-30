/* global self */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { registerRoute } from "workbox-routing";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Only same-origin document navigations receive the shell. API and files use the network.
// URL fragments (including reset tokens) never reach the service worker.
registerRoute(
  ({ request, url, sameOrigin }) =>
    sameOrigin &&
    request.mode === "navigate" &&
    !/^\/(?:api|auth)(?:\/|$)/.test(url.pathname) &&
    !/\.[^/]+$/.test(url.pathname),
  createHandlerBoundToURL("/index.html"),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Private snapshots and drafts belong to React's IndexedDB store, not this worker.
// No API or authenticated response is cached in Cache Storage.
