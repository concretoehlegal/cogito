const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/dataw', { recursive: true, force: true });
  let { app, win, logs } = await launch('dataw');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 940));
  await app.evaluate(({ Menu }) => { Menu.prototype.popup = function () { global.__menu = this.items.map((i) => i.label || '—'); }; });
  await win.waitForSelector('.home h1');
  await win.click('text=Novo livro'); await win.fill('.modal input', 'Livro - Exemplo'); await win.click('.modal >> text=Criar livro');
  await win.waitForSelector('.page-content');
  await win.click('.right-panel .icon-btn');           // fecha o painel Inserir

  // 1) lado a lado já na página 1 de um livro com 1 página
  await win.click('.status-pill [title="Duas páginas lado a lado"]'); await sleep(400);
  ok('lado a lado na página 1: página + lugar vazio', await win.locator('.page-wrap').count() === 2 && await win.locator('.page-ghost').count() === 1);
  await shot(win, 'w01-lado-a-lado-1pagina');
  await win.click('.page-ghost'); await sleep(500);
  ok('lugar vazio cria a página 2 ao lado', await win.locator('.page-wrap .page').count() === 2 && await win.locator('.page-ghost').count() === 0);
  const boxes = await win.locator('.page-wrap .page').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)]; }));
  ok('as duas páginas ficam na mesma linha', boxes[0][1] === boxes[1][1] && boxes[1][0] > boxes[0][0] + boxes[0][2] - 2, JSON.stringify(boxes));
  await win.click('.add-chapter'); await win.keyboard.type('Capítulo 2'); await win.keyboard.press('Enter'); await sleep(300);
  ok('página 3 abre o par (3, vazio)', (await win.locator('.status-page').textContent()) === 'Página 3 de 3' && await win.locator('.page-ghost').count() === 1);
  await win.click('.status-pill [title^="Página anterior"]'); await sleep(300);
  ok('voltar um par mostra 1 e 2', (await win.locator('.page-bar-title b').allTextContents()).join('|') === 'Página 1|Página 2', (await win.locator('.page-bar-title b').allTextContents()).join('|'));
  await shot(win, 'w02-lado-a-lado');

  // 2) zoom com Ctrl + rolagem
  const w0 = (await win.locator('.page-wrap .page').first().boundingBox()).width;
  await win.mouse.move(700, 500); await win.keyboard.down('Control');
  await win.mouse.wheel(0, -300); await sleep(300);
  const w1 = (await win.locator('.page-wrap .page').first().boundingBox()).width;
  await win.mouse.wheel(0, 600); await sleep(300);
  const w2 = (await win.locator('.page-wrap .page').first().boundingBox()).width;
  await win.keyboard.up('Control');
  ok('Ctrl + rolagem aproxima e afasta', w1 > w0 * 1.2 && w2 < w1 * 0.7, `${Math.round(w0)} → ${Math.round(w1)} → ${Math.round(w2)} | ${await win.locator('.zoom-label').textContent()}`);
  await win.mouse.wheel(0, 200); await sleep(200);
  const w3 = (await win.locator('.page-wrap .page').first().boundingBox()).width;
  ok('rolagem sem Ctrl não muda o zoom', Math.abs(w3 - w2) < 1);
  await win.click('.zoom-label'); await sleep(300);

  // 3) corretor ortográfico
  await win.click('.status-pill [title="Uma página por vez"]'); await sleep(300);
  const pc = win.locator('.page-content').first();
  await pc.click(); await win.keyboard.press('Control+End');
  await win.keyboard.type('A cavallaria chegou ontem com a espada magica. '); await sleep(1500);
  const pos = await win.evaluate(() => {
    const w = document.createTreeWalker(document.querySelector('.page-content'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf('cavallaria'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i + 2); r.setEnd(n, i + 6); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; } }
  });
  await win.mouse.click(pos.x, pos.y, { button: 'right' }); await sleep(800);
  const menu = await app.evaluate(() => global.__menu || null);
  ok('botão direito mostra sugestões', !!menu && menu.includes('cavalaria') && menu.some((l) => l.startsWith('Adicionar')), JSON.stringify(menu));
  const langs = await app.evaluate(({ session }) => ({ langs: session.defaultSession.getSpellCheckerLanguages(), on: session.defaultSession.isSpellCheckerEnabled() }));
  ok('idiomas do corretor', langs.on && langs.langs.includes('pt-BR'), JSON.stringify(langs));
  await app.evaluate(() => { global.__menu = null; });
  const good = await win.evaluate(() => {
    const w = document.createTreeWalker(document.querySelector('.page-content'), NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const i = n.data.indexOf('chegou'); if (i >= 0) { const r = document.createRange(); r.setStart(n, i + 1); r.setEnd(n, i + 4); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; } }
  });
  await win.mouse.click(good.x, good.y, { button: 'right' }); await sleep(600);
  const menu2 = await app.evaluate(() => global.__menu || null);
  ok('palavra correta: só recortar/copiar/colar', !!menu2 && menu2[0] === 'Recortar', JSON.stringify(menu2));
  await win.keyboard.press('Escape');

  // 4) arrastar a borda dos painéis
  const lw0 = (await win.locator('.left-panel').boundingBox()).width;
  const h = await win.locator('.resize-handle.left').boundingBox();
  await win.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await win.mouse.down(); await win.mouse.move(h.x + 120, h.y + 300, { steps: 6 }); await win.mouse.up(); await sleep(200);
  const lw1 = (await win.locator('.left-panel').boundingBox()).width;
  ok('arrastar alarga o cartão da estrutura', Math.round(lw1 - lw0) >= 100, `${Math.round(lw0)} → ${Math.round(lw1)}`);
  await win.click('.rail-btn[title="Dados"]'); await sleep(300);
  const rw0 = (await win.locator('.right-panel').boundingBox()).width;
  const hr = await win.locator('.resize-handle.right').boundingBox();
  await win.mouse.move(hr.x + hr.width / 2, hr.y + hr.height / 2); await win.mouse.down(); await win.mouse.move(hr.x - 100, hr.y + 200, { steps: 6 }); await win.mouse.up(); await sleep(200);
  const rw1 = (await win.locator('.right-panel').boundingBox()).width;
  ok('arrastar alarga o painel direito', Math.round(rw1 - rw0) >= 90, `${Math.round(rw0)} → ${Math.round(rw1)}`);
  await shot(win, 'w03-paineis-largos');

  // 5) tamanho da interface
  await win.click('.rail-btn[title="Configurações"]'); await sleep(300);
  await win.locator('input[type=range]').nth(1).focus();
  for (let i = 0; i < 4; i++) await win.keyboard.press('ArrowRight');
  await sleep(500);
  const zf = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor());
  ok('tamanho da interface', Math.abs(zf - 1.2) < 0.01, `fator=${zf}`);
  await shot(win, 'w04-config-120');
  for (let i = 0; i < 4; i++) await win.keyboard.press('ArrowLeft');
  await sleep(300); await win.click('.modal >> text=Concluir');
  await win.waitForSelector('.save-pill.ok');
  await app.evaluate(({ app }) => app.exit(0));

  // preferências persistem
  ({ app, win, logs } = await launch('dataw'));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 940));
  await win.click('.book-card'); await win.waitForSelector('.page-content'); await sleep(300);
  ok('larguras lembradas ao reabrir', Math.abs((await win.locator('.left-panel').boundingBox()).width - lw1) < 2);
  await shot(win, 'w05-reaberto');
  console.log(results.join('\n')); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
