'use client';

import { useState } from 'react';

export default function PushTestPage() {
  const [status, setStatus] = useState('');

  const testPushNotification = async () => {
    setStatus('Starte Push-Test...');
    try {
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();

      if (!sub) {
        setStatus('Hole neues Abo...');
        const resKey = await fetch("/api/push/vapid-public-key");
        const { data } = await resKey.json();

        const padding = "=".repeat((4 - (data.publicKey.length % 4)) % 4);
        const base64 = (data.publicKey + padding).replace(/-/g,
          "+").replace(/_/g, "/");
        const rawData = window.atob(base64);
        const uint8Key = new Uint8Array([...rawData].map((char) =>
          char.charCodeAt(0)));

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: uint8Key
        });
      }

      setStatus('Sende Test-Push...');
      const res = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: "2d797325-5a17-4620-8b94-a55f338996c1",
          type: "badge_unlocked",
          subscription: sub.toJSON()
        })
      });
      const result = await res.json();
      console.log("Server Antwort:", result);
      if (result.data && result.data.pushResult.sent === 1) {
        setStatus('ERFOLG! Es sollte jetzt \'geploppt\' haben.');
      } else {
        setStatus('Push wurde vom Server nicht gesendet: ' + JSON.stringify(result));
      }
    } catch (err) {
      setStatus('Fehler: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Push Notification Test</h1>
      <button onClick={testPushNotification} disabled={status.includes('Starte')}>
        Test Push Notification
      </button>
      <p>Status: {status}</p>
    </div>
  );
}