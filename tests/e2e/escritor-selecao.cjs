const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/datas', { recursive: true, force: true });
  const { app, win, logs } = await launch('datas');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 940));
  await win.waitForSelector('.home h1');
  await win.click('text=Novo livro'); await win.fill('.modal input', 'Seleção'); await win.click('.modal >> text=Criar livro');
  await win.waitForSelector('.page-content');
  const rectOf = (word) => win.evaluate((w) => {
    const tw = document.createTreeWalker(document.querySelector('.page-content'), NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { const i = n.data.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const b = r.getBoundingClientRect(); return { l: b.left, r: b.right, y: b.top + b.height / 2 }; } }
  }, word);
  const sel = () => win.evaluate(() => window.getSelection().toString());
  const drag = async (x1, y1, x2, y2) => {
    await win.mouse.move(x1, y1); await win.mouse.down(); await sleep(80);
    for (let i = 1; i <= 12; i++) { await win.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12); await sleep(25); }
    await sleep(80); await win.mouse.up(); await sleep(250);
  };
  const pc = win.locator('.page-content').first();
  await pc.click(); await win.keyboard.press('Control+End');
  await win.keyboard.type('Primeira frase do texto para selecionar com o mouse.'); await win.keyboard.press('Enter');
  await win.keyboard.type('Segunda frase, em outro parágrafo, também para selecionar.'); await sleep(500);
  const a = await rectOf('Primeira'); const b = await rectOf('selecionar com'); const c = await rectOf('também'); const fim = await rectOf('selecionar.');
  const page = await win.locator('.page').first().boundingBox();

  await drag(a.l + 60, a.y, b.r - 1, b.y);
  ok('arrastar dentro do texto', (await sel()) === 'frase do texto para selecionar com' || (await sel()).endsWith('selecionar com'), JSON.stringify(await sel()));
  await shot(win, 's02-selecao-visivel');
  await win.keyboard.press('Control+End');

  await drag(a.l - 40, a.y, b.r - 1, b.y);   // começa na margem esquerda
  ok('arrastar começando na margem esquerda', (await sel()) === 'Primeira frase do texto para selecionar com', JSON.stringify(await sel()));
  await win.keyboard.press('Control+End');

  await drag(page.x + page.width - 20, a.y, a.l + 1, a.y);   // começa na margem direita, para trás
  ok('arrastar começando na margem direita', (await sel()) === 'Primeira frase do texto para selecionar com o mouse.', JSON.stringify(await sel()));
  await win.keyboard.press('Control+Home');

  await drag(c.l + 40, fim.y + 260, c.l - 1, c.y);   // começa na área vazia abaixo do texto
  ok('arrastar começando abaixo do texto', (await sel()) === 'também para selecionar.', JSON.stringify(await sel()));
  await win.keyboard.press('Control+Home');

  await win.mouse.click(c.l + 40, fim.y + 300); await win.keyboard.type(' FIM'); await sleep(200);
  ok('clique na área vazia põe o cursor no fim', (await pc.locator('p').nth(1).textContent()).endsWith('selecionar. FIM'));
  const d = await rectOf('Primeira');
  await win.mouse.click(d.l - 40, d.y); await win.keyboard.type('X'); await sleep(200);
  ok('clique na margem põe o cursor no começo da linha', (await pc.locator('p').first().textContent()).startsWith('XPrimeira'), await pc.locator('p').first().textContent());

  // PDF da biblioteca: seleção de texto
  await app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] }); }, path.join(S, 'fixtures/Sistema Antigo.pdf'));
  await win.click('.rail-btn[title="Biblioteca"]'); await win.click('text=Adicionar PDFs'); await win.click('.file-main');
  await win.waitForSelector('.pdfViewer .textLayer span', { timeout: 15000 }); await sleep(800);
  const span = await win.locator('.pdfViewer .textLayer span').first().boundingBox();
  await drag(span.x + 2, span.y + span.height / 2, span.x + span.width - 2, span.y + span.height / 2);
  ok('selecionar texto no PDF da biblioteca', (await sel()).length > 5, JSON.stringify(await sel()));

  console.log(results.join('\n')); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
