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
  await win.click('.plan-tool:has-text("Local")'); await win.keyboard.type('ULTIMO LUGAR');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await sleep(1500);
  const dir = path.join(data, 'docs', 'Planejador'); const id = fs.readdirSync(dir)[0];
  const saved = fs.readFileSync(path.join(dir, id, 'plano.json'), 'utf8').includes('ULTIMO LUGAR');
  console.log(`${saved ? 'PASS' : 'FAIL'}  fechar o app grava o quadro pendente`);
  await app.close().catch(() => {});
})().catch((e) => { console.error(e); process.exit(1); });
