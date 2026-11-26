// Planejador 0.16: ferramentas Texto/Caixa, ligações pelos 4 lados e estilos, guias com Shift, barras ajustáveis.
const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/datapl', { recursive: true, force: true });
  const { app, win, logs } = await launch('datapl');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  await win.waitForSelector('.home h1');
  const id = await win.evaluate(async () => {
    const c = window.cogito; const m = await c.planCreate({ name: 'Quadro 0.16', icon: 'mapa' });
    const p = await c.planLoad(m.id);
    const nd = (id, type, title, x, y, w, h, extra = {}) => ({ id, type, x, y, w, h, title, subtitle: '', color: '#7aa7d6', icon: 'mapa', image: null, body: '', tags: [], ...extra });
    p.nodes = [
      nd('a', 'local', 'Porto', 0, 0, 260, 180), nd('b', 'local', 'Farol', 520, 0, 260, 180),
      nd('c', 'nota', 'Pista', 0, 340, 260, 180), nd('d', 'faccao', 'Seita', 520, 380, 260, 180),
    ];
    p.view = { x: 260, y: 120, zoom: 1 };
    await c.planSave(p); return m.id;
  });
  const file = path.join(S, 'datapl/docs/Planejador', id, 'plano.json');
  const read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
  let plan = read;
  const settle = async () => { await win.evaluate(() => window.__flushPlan?.()); await sleep(1100); };
  await win.click('.mode-tab >> text=Planejador'); await win.waitForSelector('.pd-row');
  await win.click('.pd-detail button:has-text("Abrir quadro")'); await win.waitForSelector('.plan-screen'); await sleep(500);
  const box = async (sel) => win.locator(sel).boundingBox();
  // ligação do lado de baixo do Porto até o topo da Pista
  const A = await box('.pn-node[data-id="a"]'); const C = await box('.pn-node[data-id="c"]');
  await win.mouse.move(A.x + 40, A.y + 40); await sleep(150);
  const hb = await box('.pn-node[data-id="a"] .pn-handle.wire.bottom');
  await win.mouse.move(hb.x + 8, hb.y + 8); await win.mouse.down(); await win.mouse.move(C.x + C.width / 2, C.y + 6, { steps: 10 }); await win.mouse.up(); await settle();
  let L = plan().links;
  ok('ligação sai do lado de baixo e chega no de cima', L.length === 1 && L[0].fromSide === 'bottom' && L[0].toSide === 'top', JSON.stringify(L[0] && { f: L[0].fromSide, t: L[0].toSide, k: L[0].kind }));
  await win.click('.lk-preset[title="Fluxo"]'); await settle();
  ok('estilo pronto aplica formato e pontas', plan().links[0].kind === 'cotovelo' && plan().links[0].endCap === 'triangulo');
  // segunda ligação: lado direito do Porto → Farol, já com o último estilo; troca para curva tracejada com círculo
  await win.mouse.move(A.x + 40, A.y + 40); await sleep(150);
  const hr = await box('.pn-node[data-id="a"] .pn-handle.wire.right'); const B = await box('.pn-node[data-id="b"]');
  await win.mouse.move(hr.x + 8, hr.y + 8); await win.mouse.down(); await win.mouse.move(B.x + 10, B.y + B.height / 2, { steps: 10 }); await win.mouse.up(); await settle();
  L = plan().links;
  ok('ligação nova usa o último estilo', L.length === 2 && L[1].kind === 'cotovelo' && L[1].fromSide === 'right' && L[1].toSide === 'left');
  await win.click('.lk-seg button:has-text("Curva")'); await win.click('.lk-seg button:has-text("Tracejado")');
  await win.selectOption('.field:has-text("Ponta no início") select', 'circulo'); await settle();
  L = plan().links; ok('formato, traço e ponta do início', L[1].kind === 'curva' && L[1].dash === 'tracejado' && L[1].startCap === 'circulo');
  await win.fill('.field:has-text("Legenda") input', 'vigia'); await sleep(200);
  // Texto
  await win.keyboard.press('Escape'); await win.mouse.click(900, 140); await sleep(100);
  await win.keyboard.press('t'); await sleep(100);
  ok('T escolhe a ferramenta Texto', await win.locator('.plan-tool.on:has-text("Texto")').count() === 1);
  await win.mouse.click(1080, 560); await sleep(200);
  await win.keyboard.type('Ato 1 — A neblina'); await win.keyboard.press('Escape'); await settle();
  const tx = plan().nodes.find((n) => n.type === 'texto');
  ok('texto criado e escrito no quadro', !!tx && tx.body === 'Ato 1 — A neblina' && await win.locator('.plan-tool.on:has-text("Mover")').count() === 1, JSON.stringify({ body: tx && tx.body, mover: await win.locator('.plan-tool.on:has-text("Mover")').count(), tipos: plan().nodes.map((n) => n.type) }));
  // Caixa de texto desenhada
  await win.keyboard.press('b'); await win.mouse.move(1000, 640); await win.mouse.down(); await win.mouse.move(1260, 760, { steps: 6 }); await win.mouse.up(); await sleep(200);
  await win.keyboard.type('Lembrar: o farol acende sozinho.'); await win.keyboard.press('Escape'); await settle();
  const cx = plan().nodes.find((n) => n.type === 'caixa');
  ok('caixa de texto desenhada com o tamanho arrastado', !!cx && Math.abs(cx.w - 260) < 4 && Math.abs(cx.h - 120) < 4 && cx.body.startsWith('Lembrar'), cx && `${cx.w}×${cx.h}`);
  // guias com Shift: arrasta a Seita para perto do alinhamento do Farol
  const D = await box('.pn-node[data-id="d"]');
  await win.mouse.move(D.x + 60, D.y + 60); await win.mouse.down(); await win.keyboard.down('Shift');
  await win.mouse.move(D.x + 64, D.y + 40, { steps: 6 }); await win.mouse.move(D.x + 63, D.y + 37, { steps: 2 }); await sleep(150);
  const guidesShown = await win.locator('.pc-guide').count();
  await shot(win, 'pl00-guias');
  await win.mouse.up(); await win.keyboard.up('Shift'); await settle();
  const dn = plan().nodes.find((n) => n.id === 'd');
  ok('Shift + arrastar mostra guias e encaixa no alinhamento', guidesShown > 0 && dn.x === 520, `guias=${guidesShown} x=${dn.x}`);
  // setas do teclado empurram
  await win.keyboard.press('ArrowRight'); await win.keyboard.press('Shift+ArrowDown'); await settle();
  const dn2 = plan().nodes.find((n) => n.id === 'd');
  ok('setas empurram (1 e 10 com Shift)', dn2.x === dn.x + 1 && dn2.y === dn.y + 10);
  // barra da direita ajustável
  const before = (await box('.plan-panel')).width;
  const h = await box('.plan-body > .resize-handle.right');
  await win.mouse.move(h.x + 3, h.y + 200); await win.mouse.down(); await win.mouse.move(h.x - 120, h.y + 200, { steps: 6 }); await win.mouse.up(); await sleep(200);
  const after = (await box('.plan-panel')).width;
  ok('barra da direita muda de largura arrastando', after > before + 100, `${Math.round(before)} → ${Math.round(after)}`);
  await win.click('.plan-tool[title="Enquadrar tudo"]'); await sleep(400); await win.mouse.click(5, 500); await win.keyboard.press('Escape'); await sleep(200);
  await shot(win, 'pl01-quadro');
  await win.locator('.pc-link').nth(1).click({ force: true }).catch(() => {}); await sleep(250);
  await shot(win, 'pl02-ligacao');
  res.forEach((r) => console.log(r)); console.log('LOGS', JSON.stringify(logs));
  await app.close();
})().catch((e) => { res.forEach((r) => console.log(r)); console.error(e); process.exit(1); });
