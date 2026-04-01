"use client";

import { useEffect, useRef } from "react";

const PUSH_ENABLED_KEY = "cannalog_push_enabled";

export function usePushSubscription(userId: string | undefined) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!userId || subscribed.current) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    subscribed.current = true;

    navigator.serviceWorker.ready.then(async (registration) => {
      // Fetch VAPID public key from server
      let vapidKey = "";
      try {
        const res = await fetch("/api/push/vapid-public-key");
        if (res.ok) {
          const data = await res.json();
          vapidKey = data.publicKey || "";
        }
      } catch (e) {
        console.warn("[Push] Could not fetch VAPID key:", e);
        return;
      }

      if (!vapidKey) {
        console.warn("[Push] No VAPID public key configured");
        return;
      }

      registration.pushManager
        .subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
        .then((subscription) => {
          console.log("[Push] Subscribed:", subscription.endpoint);
          return fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription.toJSON()),
          });
        })
        .then((res) => {
          if (res.ok) {
            localStorage.setItem(PUSH_ENABLED_KEY, "true");
            console.log("[Push] Subscription saved to server");
          }
        })
        .catch((err) => {
          console.warn("[Push] Subscription failed:", err);
        });
    });
  }, [userId]);
}

// Ask for notification permission and trigger subscription
export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.warn("[Push] Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    console.warn("[Push] Notification permission denied");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

// Decode VAPID key from base64
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) return new Uint8Array();
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
