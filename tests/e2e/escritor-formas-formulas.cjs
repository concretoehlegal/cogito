const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/datae', { recursive: true, force: true });
  const { app, win, logs } = await launch('datae');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  const mockOpen = (f) => app.evaluate(({ dialog }, x) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: x }); }, f);
  const mockSave = (f) => app.evaluate(({ dialog }, x) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: x }); }, f);
  await win.waitForSelector('.home h1');
  await win.click('text=Novo livro >> nth=0'); await win.fill('.modal input', 'Formas e Fórmulas'); await win.click('.modal >> text=Criar livro');
  await win.waitForSelector('.page-content');
  const pc = win.locator('.page-content').first();
  await pc.click(); await win.keyboard.press('Control+End');
  // ── forma: faixa com texto ──
  await win.click('.shape-btn:has-text("Faixa")'); await sleep(300);
  ok('faixa inserida', await pc.locator('.shape-node[data-kind="banner"]').count() === 1);
  await pc.locator('.shape-node').first().click(); await sleep(200);
  ok('alças aparecem ao selecionar', await win.locator('.shape-handle').count() === 8);
  const before = await pc.locator('.shape-node').first().boundingBox();
  const h = await win.locator('.shape-handle.h-se').boundingBox();
  await win.mouse.move(h.x + 5, h.y + 5); await win.mouse.down(); await win.mouse.move(h.x + 5 - 80, h.y + 5 + 40, { steps: 8 }); await win.mouse.up(); await sleep(300);
  const after = await pc.locator('.shape-node').first().boundingBox();
  ok('redimensionar arrastando a alça', after.height > before.height + 20 && after.width < before.width - 60, `${Math.round(before.width)}×${Math.round(before.height)} → ${Math.round(after.width)}×${Math.round(after.height)}`);
  await win.fill('.tool-input', 'Capítulo Sombrio'); await win.keyboard.press('Enter'); await sleep(200);
  ok('texto na forma', (await pc.locator('.shape-node text').textContent()) === 'Capítulo Sombrio');
  // ── estrela com contorno de texto ──
  await win.keyboard.press('ArrowDown'); await win.keyboard.press('Control+End');
  await win.click('.shape-btn:has-text("Estrela")'); await sleep(200);
  await pc.locator('.shape-node[data-kind="star"]').click(); await win.click('.tool-btn:has-text("Contorno ◧") >> nth=0'); await sleep(200);
  await win.keyboard.press('Control+End');
  await win.keyboard.type('O texto contorna a estrela pela direita. '.repeat(10)); await win.keyboard.press('Enter');
  ok('forma flutuante com contorno', (await pc.locator('.shape-node[data-kind="star"]').getAttribute('data-wrap')) === 'left' && (await pc.locator('.shape-node[data-kind="star"]').evaluate((e) => getComputedStyle(e).float)) === 'left');
  // ── tabela com fórmulas e largura de coluna ──
  await win.click('.insert-btn:has-text("Tabela") >> nth=0'); await sleep(300);
  const cells = pc.locator('table').first().locator('td');
  const typeIn = async (i, t) => { await cells.nth(i).click(); await win.keyboard.type(t); };
  // linha 2: A2..C2 ; linha 3; linha 4 (3 colunas, 4 linhas)
  await typeIn(0, 'Espada'); await typeIn(1, '15'); await typeIn(2, '=B2*2');
  await typeIn(3, 'Escudo'); await typeIn(4, '10,5'); await typeIn(5, '=B3*2');
  await typeIn(6, 'Total'); await typeIn(7, '=SOMA(B2:B3)'); await typeIn(8, '=C2+C3');
  await cells.nth(6).click(); await sleep(300);
  const shown = await pc.locator('td.formula-cell').evaluateAll((els) => els.map((e) => getComputedStyle(e, '::after').content));
  ok('fórmulas mostram o resultado', shown.join('|') === '"30"|"21"|"25,5"|"51"', shown.join('|'));
  await cells.nth(8).click(); await sleep(200);
  ok('ao editar a célula, aparece a fórmula', await pc.locator('td.formula-cell.editing').count() === 1);
  await cells.nth(0).click();
  // arrastar a borda entre a coluna A e B
  const c0 = await cells.nth(0).boundingBox();
  await win.mouse.move(c0.x + c0.width - 1, c0.y + c0.height / 2); await sleep(150);
  await win.mouse.down(); await win.mouse.move(c0.x + c0.width + 90, c0.y + c0.height / 2, { steps: 10 }); await win.mouse.up(); await sleep(300);
  const c0b = await cells.nth(0).boundingBox();
  ok('largura da coluna ajustada arrastando', c0b.width > c0.width + 50, `${Math.round(c0.width)} → ${Math.round(c0b.width)}`);
  // ── imagem PNG transparente com contorno ──
  await win.keyboard.press('Control+End');
  await mockOpen([path.join(S, 'fixtures/disco.png')]);
  await win.click('.insert-btn:has-text("Imagem")'); await win.waitForSelector('.page-content img');
  await pc.locator('img').click(); await win.click('.tool-btn:has-text("Contorno ◨")'); await sleep(200);
  await win.keyboard.press('Control+End');
  await win.keyboard.type('Este parágrafo deve seguir a curva do disco transparente, e não a caixa quadrada da imagem. '.repeat(5));
  await sleep(500);
  const img = pc.locator('img').first();
  ok('imagem flutua com shape-outside do próprio PNG', (await img.evaluate((e) => getComputedStyle(e).float)) === 'right' && (await img.evaluate((e) => getComputedStyle(e).shapeOutside)).includes('url('));
  await win.waitForSelector('.save-pill.ok'); await sleep(300);
  await shot(win, 'e01-escritor');
  // linhas encostando na curva: medir a largura das linhas do parágrafo ao lado do disco
  const widths = await win.evaluate(() => {
    const p = [...document.querySelectorAll('.page-content p')].pop(); const r = document.createRange(); r.selectNodeContents(p);
    const rects = [...r.getClientRects()]; const lines = new Map(); for (const x of rects) { const k = Math.round(x.top); lines.set(k, Math.max(lines.get(k) || 0, x.right)); } return [...lines.values()].map(Math.round);
  });
  ok('linhas acompanham a curva (larguras variam)', new Set(widths.slice(0, 8)).size >= 3, widths.slice(0, 10).join(','));
  // ── exportar ──
  for (const kind of ['PDF', 'DOCX']) {
    const out = path.join(S, `formas.${kind.toLowerCase()}`); fs.rmSync(out, { force: true });
    await mockSave(out); await win.click('.rail-btn[title="Exportar o livro"]'); await win.click(`.menu-item:has-text("${kind}")`);
    await win.waitForSelector('.toast.ok', { timeout: 30000 }); await win.locator('.toast .icon-btn').first().click();
  }
  const txt = execSync(`pdftotext -layout ${path.join(S, 'formas.pdf')} -`).toString();
  ok('PDF: resultados das fórmulas e texto da faixa', txt.includes('25,5') && txt.includes('51') && !txt.includes('=SOMA') && txt.includes('Capítulo Sombrio'));
  fs.rmSync(path.join(S, 'fdocx'), { recursive: true, force: true }); execSync(`unzip -q -o ${path.join(S, 'formas.docx')} -d ${path.join(S, 'fdocx')}`);
  const xml = fs.readFileSync(path.join(S, 'fdocx/word/document.xml'), 'utf8');
  ok('DOCX: fórmulas calculadas, formas como imagem, imagem flutuante, larguras de coluna', xml.includes('>25,5<') && !xml.includes('=SOMA') && fs.readdirSync(path.join(S, 'fdocx/word/media')).length >= 3 && xml.includes('wp:anchor') && xml.includes('wrapSquare') && xml.includes('w:gridCol'), `mídias=${fs.readdirSync(path.join(S, 'fdocx/word/media')).length}`);
  execSync(`cd ${S} && pdftoppm -r 60 -png -f 1 -l 1 formas.pdf formas-p`);
  console.log(results.join('\n')); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
