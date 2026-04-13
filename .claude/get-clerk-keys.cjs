const { WebSocket } = require('ws');
let step = 0;
const ws = new WebSocket('ws://localhost:9222/devtools/page/F4A3A294F54ECEE205A6BBB48AAF5721');

ws.on('open', () => {
  console.log('Navigating to API keys...');
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'https://dashboard.clerk.com/apps/app_3C6fwHIDq170G73rcz9YxdFgc8a/instances/ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0/api-keys' } }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  step++;

  if (step === 1) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: 'window.location.href' } }));
    }, 12000);
  } else if (step === 2) {
    console.log('Location:', msg.result.result.value);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); ws.close(); process.exit(1); }, 30000);