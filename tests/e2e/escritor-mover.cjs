// Escritor 0.16: ferramenta Mover (posição livre + guias com Shift) e contador de páginas.
const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/datamv', { recursive: true, force: true });
  const { app, win, logs } = await launch('datamv');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  await win.waitForSelector('.home h1');
  await win.click('text=Novo livro >> nth=0'); await win.fill('.modal input', 'Mover'); await win.click('.modal >> text=Criar livro');
  await win.waitForSelector('.page-content'); await sleep(400);
  const pc = win.locator('.page-content').first();
  await pc.click(); await win.keyboard.type('Um parágrafo qualquer para a página ter texto. '.repeat(6)); await win.keyboard.press('Enter');
  ok('contador de páginas no centro inferior', (await win.locator('.page-number').first().textContent()) === '1 / 1');
  if (!(await win.locator('.shape-btn:has-text("Estrela")').count())) await win.click('.rail-btn[title="Inserir"]');
  await win.click('.shape-btn:has-text("Estrela")'); await sleep(300);
  const shapeEl = pc.locator('.shape-node').first();
  await win.click('button[title^="Mover (Ctrl+M)"]'); await sleep(150);
  ok('Mover liga com o botão', await win.locator('.page.move-tool').count() >= 1);
  const b = await shapeEl.boundingBox();
  await win.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await win.mouse.down();
  await win.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 160, { steps: 8 }); await win.mouse.up(); await sleep(400);
  const freeNow = await pc.locator(".shape-node[data-wrap='free']").count();
  const b2 = await shapeEl.boundingBox();
  ok('arrastar deixa a forma em posição livre onde foi solta', freeNow === 1 && Math.abs(b2.x - b.x - 120) < 4 && Math.abs(b2.y - b.y - 160) < 4, `${Math.round(b2.x - b.x)},${Math.round(b2.y - b.y)}`);
  // Shift: centralizar na página
  const page = await win.locator('.page').first().boundingBox();
  const cx = page.x + page.width / 2;
  await win.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await win.mouse.down(); await win.keyboard.down('Shift');
  await win.mouse.move(cx + 5, b2.y + b2.height / 2 + 4, { steps: 10 }); await sleep(120);
  const g = await win.locator('.page-guide').count();
  await shot(win, 'mv00-guia');
  await win.mouse.up(); await win.keyboard.up('Shift'); await sleep(400);
  const b3 = await shapeEl.boundingBox();
  ok('Shift encaixa no centro da página com guia', g > 0 && Math.abs((b3.x + b3.width / 2) - cx) < 1.5, `guias=${g} desvio=${((b3.x + b3.width / 2) - cx).toFixed(2)}`);
  await win.keyboard.press('Escape'); await sleep(100);
  ok('Esc sai do Mover', await win.locator('.page.move-tool').count() === 0);
  await win.keyboard.press('Control+s'); await sleep(1200);
  const dir = path.join(S, 'datamv/docs/Livros'); const book = JSON.parse(fs.readFileSync(path.join(dir, fs.readdirSync(dir)[0], 'livro.json'), 'utf8'));
  const all = JSON.stringify(book);
  const sh = JSON.parse(all.match(/\{"type":"shape","attrs":\{[^}]*\}\}/)?.[0] || 'null');
  ok('posição livre gravada no livro', sh && sh.attrs.wrap === 'free' && sh.attrs.x > 0 && sh.attrs.y > 0, sh && JSON.stringify({ w: sh.attrs.wrap, x: sh.attrs.x, y: sh.attrs.y }));

  const { execSync } = require('child_process');
  const mockSave = (f) => app.evaluate(({ dialog }, x) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: x }); }, f);
  for (const kind of ['PDF', 'DOCX']) {
    const out = path.join(S, `mover.${kind.toLowerCase()}`); fs.rmSync(out, { force: true });
    await mockSave(out); await win.click('.rail-btn[title="Exportar o livro"]'); await win.click(`.menu-item:has-text("${kind}")`);
    await win.waitForSelector('.toast.ok', { timeout: 30000 }); await win.locator('.toast .icon-btn').first().click(); await sleep(300);
  }
  const ptxt = execSync(`pdftotext -layout ${path.join(S, 'mover.pdf')} -`).toString();
  ok('PDF: contador "1 / 1" no rodapé', /1 ?\/ ?1/.test(ptxt), JSON.stringify(ptxt.trim().split('\n').slice(-1)));
  execSync(`cd ${S} && pdftoppm -r 60 -png -f 1 -l 1 mover.pdf mover-p`);
  fs.rmSync(path.join(S, 'mvdocx'), { recursive: true, force: true }); execSync(`unzip -q -o ${path.join(S, 'mover.docx')} -d ${path.join(S, 'mvdocx')}`);
  const dx = fs.readFileSync(path.join(S, 'mvdocx/word/document.xml'), 'utf8');
  const foot = fs.readdirSync(path.join(S, 'mvdocx/word')).filter((f) => f.startsWith('footer')).map((f) => fs.readFileSync(path.join(S, 'mvdocx/word', f), 'utf8')).join('');
  const off = dx.match(/<wp:positionH relativeFrom="page"><wp:posOffset>(\d+)/);
  ok('DOCX: forma livre ancorada na página e contador PAGE / NUMPAGES', dx.includes('wp:anchor') && !!off && foot.includes('NUMPAGES') && foot.includes('PAGE'), off ? `x=${Math.round(off[1] / 9525)}px` : dx.slice(dx.indexOf('wp:anchor') - 20, dx.indexOf('wp:anchor') + 400));
  await shot(win, 'mv01-livre');
  res.forEach((r) => console.log(r)); console.log('LOGS', JSON.stringify(logs));
  await app.close();
})().catch((e) => { res.forEach((r) => console.log(r)); console.error(e); process.exit(1); });
