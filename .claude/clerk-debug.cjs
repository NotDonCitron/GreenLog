const { WebSocket } = require('ws');
const ws = new WebSocket('ws://localhost:9222/devtools/page/F4A3A294F54ECEE205A6BBB48AAF5721');

let step = 0;
ws.on('open', () => {
  console.log('Opening sign-in page...');
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'http://localhost:3000/sign-in' } }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  step++;

  if (step === 1) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: `JSON.stringify({ title: document.title, url: window.location.href, bodyText: document.body.innerText.slice(0, 500) })` } }));
    }, 5000);
  } else if (step === 2) {
    console.log('Page info:', msg.result.result.value);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); ws.close(); process.exit(1); }, 20000);
