const { WebSocket } = require('ws');
const ws = new WebSocket('ws://localhost:9222/devtools/page/F4A3A294F54ECEE205A6BBB48AAF5721');

let step = 0;
ws.on('open', () => {
  ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'http://localhost:3006/sign-in' } }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  if (!msg.id) return;
  step++;

  if (step === 1) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: { expression: `
        (function(){
          const emailInput = document.querySelector('input[name="identifier"]');
          const passInput = document.querySelector('input[name="password"]');
          if (!emailInput || !passInput) return 'inputs not found';
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(emailInput, 'greenlog-test-2026@example.com');
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          nativeInputValueSetter.call(passInput, 'xK9#mP2!wQ7$vL5%nJ8');
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          return 'credentials set';
        })()
      ` } }));
    }, 7000);
  } else if (step === 2) {
    console.log('Step 2:', msg.result.result.value);
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 3, method: 'Runtime.evaluate', params: { expression: `
        (function(){
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');
          if (btn) btn.click();
          return btn ? 'clicked' : 'not found';
        })()
      ` } }));
    }, 500);
  } else if (step === 3) {
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 4, method: 'Runtime.evaluate', params: { expression: `window.location.href` } }));
    }, 6000);
  } else if (step === 4) {
    console.log('URL:', msg.result.result.value);
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 5, method: 'Runtime.evaluate', params: { expression: `document.body.innerText.slice(0, 400)` } }));
    }, 2000);
  } else if (step === 5) {
    console.log('Body:', msg.result.result.value);
    ws.close();
    process.exit(0);
  }
});

ws.on('error', e => { console.error(e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); ws.close(); process.exit(1); }, 40000);
