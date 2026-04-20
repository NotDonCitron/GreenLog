"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister()))
          )
          .catch((error) => {
            console.warn("[SW] Development cleanup failed:", error);
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
    }
  }, []);

  return null;
}
