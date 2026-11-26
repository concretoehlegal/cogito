const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const { execSync } = require('child_process');
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
(async () => {
  const { app, win, logs, data } = await launch();
  const mockOpen = (files) => app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: f }); }, files);
  const mockSave = (file) => app.evaluate(({ dialog }, f) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: f }); }, file);
  await win.waitForSelector('.book-card');
  await shot(win, '20-home');
  await win.click('.book-card');
  await win.waitForSelector('.page-content');
  ok('reabriu com conteúdo', (await win.locator('.tree .chapter-row').count()) === 2);

  // --- biblioteca
  await win.click('.rail-btn[title="Biblioteca"]');
  await mockOpen([path.join(S, 'fixtures/Sistema Antigo.pdf')]);
  await win.click('text=Adicionar PDFs');
  await win.waitForSelector('.file-list li');
  await win.click('.file-main');
  await win.waitForSelector('.pdfViewer .page canvas', { timeout: 15000 });
  await win.waitForTimeout(1200);
  const pagesTxt = await win.locator('.viewer-tools .muted').first().textContent();
  ok('PDF aberto no app', pagesTxt.includes('5'), pagesTxt);
  await win.fill('.viewer-search input', 'grimório 3');
  await win.keyboard.press('Enter');
  await win.waitForTimeout(1500);
  const mc = await win.locator('.match-count').textContent().catch(() => '');
  const pageNow = await win.locator('.page-input').inputValue();
  ok('busca no PDF', mc.startsWith('1/1') && pageNow === '3', `matches=${mc} page=${pageNow}`);
  await shot(win, '21-biblioteca-split');
  ok('biblioteca fora da pasta do livro', fs.readdirSync(path.join(data, 'docs', 'Biblioteca')).some((f) => f.endsWith('.pdf')));

  // --- anexos
  await win.click('.rail-btn[title="Anexos"]');
  await mockOpen([path.join(S, 'fixtures/notas-anexo.pdf')]);
  await win.click('text=Anexar arquivos');
  await win.waitForSelector('.file-list li:has-text("notas-anexo.pdf")');
  ok('anexo adicionado', true);
  await win.click('.viewer-head .icon-btn');   // fecha consulta

  // --- página com excedente
  await win.locator('.page-row').last().click();   // página em branco (pág. 5)
  const pc = win.locator('.page-content').first();
  await pc.click();
  for (let i = 1; i <= 70; i++) { await win.keyboard.type(`Parágrafo ${i} da crônica.`); await win.keyboard.press('Enter'); }
  await win.waitForSelector('.overflow-banner');
  ok('aviso de excedente', true);
  await shot(win, '22-excedente');
  const before = await win.locator('.page-row').count();
  await win.click('text=Mover excedente para nova página');
  await win.waitForTimeout(1500);
  const after = await win.locator('.page-row').count();
  ok('excedente virou nova página', after > before && (await win.locator('.overflow-banner').count()) === 0, `${before}->${after}`);

  // --- duas colunas + A3 + lado a lado
  await win.locator('.page-bar-tools .icon-btn').first().click();   // 2 colunas
  ok('duas colunas', await win.locator('.page.cols-2').count() === 1);
  await win.click('.status-pill [title="Duas páginas lado a lado"]');
  await win.waitForTimeout(400);
  ok('lado a lado', await win.locator('.page-wrap').count() >= 1);
  await shot(win, '23-lado-a-lado');
  await win.locator('.page-bar-tools select').first().selectOption('A3');
  await win.waitForTimeout(300);
  ok('página A3', await win.locator('.page.fmt-A3').count() === 1);
  await shot(win, '24-a3');

  // --- exportar PDF
  await win.waitForSelector('.save-pill.ok');
  const pdf = path.join(S, 'out.pdf'); fs.rmSync(pdf, { force: true });
  await mockSave(pdf);
  await win.click('.rail-btn[title="Exportar o livro"]');
  await win.click('.menu-item:has-text("PDF")');
  await win.waitForSelector('.toast.ok', { timeout: 30000 });
  ok('toast PDF', (await win.locator('.toast.ok').textContent()).includes('PDF exportado'), await win.locator('.toast.ok').textContent());
  await win.locator('.toast .icon-btn').click();
  const info = execSync(`pdfinfo -l 20 "${pdf}"`).toString();
  fs.writeFileSync(path.join(S, 'out.pdfinfo.txt'), info);
  const text = execSync(`pdftotext -layout "${pdf}" -`).toString();
  fs.writeFileSync(path.join(S, 'out.pdf.txt'), text);
  const npages = Number(/Pages:\s+(\d+)/.exec(info)[1]);
  ok('PDF: nº de páginas', npages === after + 1, `pages=${npages} livro=${after}`);   // 1 sumário + 7 páginas (6 + 1 excedente)
  ok('PDF: tem sumário e conteúdo', /Sum[aá]rio/i.test(text) && text.includes('magia antiga') && text.includes('Ataques e Dano') && !/Iniciativa\s+\d/.test(text.split('O Mundo')[0]));
  ok('PDF: sem biblioteca/anexos', !text.includes('grimório') && !text.includes('Notas de pesquisa'));
  const imgs = execSync(`pdfimages -list "${pdf}" | tail -n +3 | wc -l`).toString().trim();
  ok('PDF: imagem incluída', Number(imgs) >= 1, `imgs=${imgs}`);

  // --- exportar DOCX
  const docx = path.join(S, 'out.docx'); fs.rmSync(docx, { force: true });
  await mockSave(docx);
  await win.click('.rail-btn[title="Exportar o livro"]');
  await win.click('.menu-item:has-text("DOCX")');
  await win.waitForSelector('.toast.ok', { timeout: 30000 });
  ok('toast DOCX', (await win.locator('.toast.ok').textContent()).includes('DOCX'));
  fs.rmSync(path.join(S, 'docx'), { recursive: true, force: true });
  execSync(`unzip -q -o "${docx}" -d "${path.join(S, 'docx')}"`);
  const xml = fs.readFileSync(path.join(S, 'docx/word/document.xml'), 'utf8');
  ok('DOCX: texto e tabela', xml.includes('magia antiga') && xml.includes('<w:tbl>') && xml.includes('Nome da criatura'));
  ok('DOCX: sumário com links e campos de página', xml.includes('Ataques e Dano') && xml.includes('PAGEREF') && xml.includes('w:anchor='));
  ok('DOCX: títulos', xml.includes('Heading1') && xml.includes('Heading2'));
  ok('DOCX: imagem', fs.readdirSync(path.join(S, 'docx/word/media')).length >= 1);
  ok('DOCX: sem biblioteca/anexos', !xml.includes('grimório') && !xml.includes('Notas de pesquisa'));
  ok('DOCX: A3 e 2 colunas', xml.includes('w:w="16838" w:h="23811"') && xml.includes('w:num="2"'), '');

  console.log(results.join('\n')); console.log('LOGS', logs);
  // fechamento normal pela janela (deve gravar antes)
  await pc.click().catch(() => {});
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await new Promise((r) => setTimeout(r, 1500));
  console.log('fechou:', app.windows().length === 0);
  await app.close().catch(() => {});
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
