'use client';

import { useState } from 'react';

export default function TestNotificationPage() {
  const [result, setResult] = useState<string>('');

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/test-notification', { method: 'POST' });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error: ' + (error as Error).message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Benachrichtigung</h1>
      <button onClick={sendTestNotification}>Test-Benachrichtigung senden</button>
      <pre>{result}</pre>
    </div>
  );
}