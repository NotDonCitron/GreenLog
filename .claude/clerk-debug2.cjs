const { WebSocket } = require('ws');
const ws = new WebSocket('ws://localhost:9222/devtools/page/F4A3A294F54ECEE205A6BBB48AAF5721');

let step = 0;
ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'http://localhost:3000/sign-in' } }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  step++;

  if (step === 1) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: `
        (function(){
          return {
            url: window.location.href,
            title: document.title,
            bodyHTML: document.body.innerHTML.slice(0, 2000),
            allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder })),
            iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src, id: f.id }))
          };
        })()
      ` } }));
    }, 7000);
  } else if (step === 2) {
    console.log('Sign-in page:', JSON.stringify(msg.result.result.value));
    ws.close();
    process.exit(0);
  }
});

ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); ws.close(); process.exit(1); }, 15000);
