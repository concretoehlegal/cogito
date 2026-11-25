const { launch, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  fs.rmSync(S + '/dataq2', { recursive: true, force: true });
  const { app, win, data } = await launch('dataq2');
  await win.waitForSelector('.home h1');
  await win.click('.mode-tab >> text=Planejador');
  await win.click('text=Nova campanha >> nth=0'); await win.fill('.plan-dialog-form input >> nth=0', 'Teste'); await win.click('.modal >> text=Criar campanha');
  await win.waitForSelector('.plan-screen');
  await win.click('.plan-tool:has-text("Local")');
  // O nome da ficha nova ganha o foco no quadro de animação seguinte; digitar antes disso cai no quadro.
  await win.waitForFunction(() => document.activeElement?.tagName === 'INPUT');
  await win.keyboard.type('ULTIMO LUGAR');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  // Espera a gravação do fechamento (em máquinas lentas, como o CI, leva mais que 1–2 s); desiste em 10 s.
  const dir = path.join(data, 'docs', 'Planejador');
  const has = () => { try { const id = fs.readdirSync(dir)[0]; return fs.readFileSync(path.join(dir, id, 'plano.json'), 'utf8').includes('ULTIMO LUGAR'); } catch { return false; } };
  let saved = false;
  for (let t = 0; t < 100 && !(saved = has()); t++) await sleep(100);
  console.log(`${saved ? 'PASS' : 'FAIL'}  fechar o app grava o quadro pendente`);
  await app.close().catch(() => {});
})().catch((e) => { console.error(e); process.exit(1); });
