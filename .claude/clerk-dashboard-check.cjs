const { WebSocket } = require('ws');
const ws = new WebSocket('ws://localhost:9222/devtools/page/F4A3A294F54ECEE205A6BBB48AAF5721');

let step = 0;
ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'https://dashboard.clerk.com/apps/app_3C6fwHIDq170G73rcz9YxdFgc8a/instances/ins_3C6sdUZ5O8mCUlgKwxBapiSZzU0/user-authentication/user-and-authentication' } }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  step++;

  if (step === 1) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: `
        (function(){
          // Check for shadow DOM
          const shadowHosts = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
          const iframes = Array.from(document.querySelectorAll('iframe'));
          return {
            shadowHosts: shadowHosts.length,
            iframes: iframes.map(f => f.src),
            bodyHTML: document.body.innerHTML.slice(0, 1000)
          };
        })()
      ` } }));
    }, 6000);
  } else if (step === 2) {
    console.log('Shadow/iframes:', JSON.stringify(msg.result.result.value));
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 3, method: 'Runtime.evaluate', params: { expression: `
        (function(){
          // Try clicking by text content
          const allButtons = Array.from(document.querySelectorAll('button, [role="button"], div[aria-checked]'));
          return { count: allButtons.length, texts: allButtons.map(b => b.innerText.trim().slice(0,30)).slice(0,20) };
        })()
      ` } }));
    }, 1000);
  } else if (step === 3) {
    console.log('All interactive:', JSON.stringify(msg.result.result.value));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); ws.close(); process.exit(1); }, 15000);
