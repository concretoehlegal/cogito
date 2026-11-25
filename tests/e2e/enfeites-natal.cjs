// Luzinhas: programa clássico (opacidade das camadas muda no compasso), troca de modo nas Configurações.
const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/dataxl', { recursive: true, force: true });
  const { app, win, logs } = await launch('dataxl');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  await win.waitForSelector('.home h1'); await sleep(500);
  const read = () => win.evaluate(() => [...document.querySelectorAll('.xmas-lights')].map((s) => [...s.querySelectorAll('.xl-glow')].map((e) => e.style.opacity).join(',')));
  const samples = [];
  for (let i = 0; i < 25; i++) { samples.push((await read())[0]); await sleep(170); }
  ok('clássica: duas guirlandas na tela', (await read()).length === 2);
  ok('clássica: o brilho dos grupos muda com o tempo', new Set(samples).size >= 4, samples.slice(0, 8).join(' | '));
  const r = await read(); ok('as duas guirlandas piscam juntas', r[0] === r[1], r.join(' / '));
  await shot(win, 'xl01-classica');
  await win.click('text=Configurações >> nth=0'); await sleep(400);
  ok('seletor do modo nas Configurações', await win.locator('.xmas-seg button').count() === 3);
  await win.click('.xmas-seg button:has-text("Sempre acesas")'); await sleep(300);
  const fixa = (await read())[0];
  ok('sempre acesas: nenhum grupo apagado, relógio parado', fixa.split(',').every((v) => v === '') && (await win.locator('.xmas-lights.anim-fixa').count()) > 0, fixa);
  await win.click('.xmas-seg button:has-text("Suave")'); await sleep(300);
  ok('cintilar suave: animação CSS nas camadas', await win.evaluate(() => getComputedStyle(document.querySelector('.xmas-lights .xl-glow')).animationName) === 'twinkle');
  await win.click('.xmas-seg button:has-text("Pisca-pisca")'); await sleep(400);
  const a = (await read())[0]; await sleep(700); const b = (await read())[0];
  ok('de volta ao clássico, o relógio volta a andar', a !== b || a.includes('0'), `${a} → ${b}`);
  await shot(win, 'xl02-config');
  res.forEach((x) => console.log(x)); console.log('LOGS', JSON.stringify(logs));
  await app.close();
})().catch((e) => { res.forEach((x) => console.log(x)); console.error(e); process.exit(1); });
