"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showSyncing, setShowSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowSyncing(true);
      // Show "syncing" for 2 seconds after coming back online
      setTimeout(() => setShowSyncing(false), 2000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showSyncing) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
        isOnline
          ? "bg-[#2FF801]/90 text-black"
          : "bg-[#ff716c]/90 text-white"
      }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi size={14} />
          Wieder online — synchronisiere...
        </>
      ) : (
        <>
          <WifiOff size={14} />
          Offline — Änderungen werden gespeichert
        </>
      )}
    </div>
  );
}
