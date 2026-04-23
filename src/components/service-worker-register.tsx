"use client";

import { useEffect } from "react";

const SW_CACHE_PREFIXES = ["greenlog-", "workbox-"];

async function unregisterAndClearCaches() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if (typeof window.caches === "undefined") return;
  const cacheKeys = await window.caches.keys();
  const staleKeys = cacheKeys.filter((key) =>
    SW_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
  await Promise.all(staleKeys.map((key) => window.caches.delete(key)));
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const shouldDisableInProduction = process.env.NEXT_PUBLIC_DISABLE_SW === "true";

    if (process.env.NODE_ENV !== "production") {
      unregisterAndClearCaches().catch((error) => {
        console.warn("[SW] Cleanup failed:", error);
      });
      return;
    }

    if (shouldDisableInProduction) {
      unregisterAndClearCaches().catch((error) => {
        console.warn("[SW] Cleanup failed:", error);
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);
      })
      .catch((error) => {
        console.warn("[SW] Registration failed:", error);
      });
  }, []);

  return null;
}
