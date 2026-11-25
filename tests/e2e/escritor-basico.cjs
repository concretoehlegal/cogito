const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
(async () => {
  fs.rmSync(S + '/data', { recursive: true, force: true });
  const { app, win, logs, data } = await launch();
  const mockOpen = (files) => app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: f }); }, files);
  await win.waitForSelector('.home h1');
  await win.click('text=Novo livro');
  await win.fill('.modal input', 'Crônicas de Valdória');
  await win.click('.modal >> text=Criar livro');
  await win.waitForSelector('.page-content');

  // --- texto e formatação
  const pc = win.locator('.page-content').first();
  await pc.click();
  await win.keyboard.press('Control+End');
  await win.keyboard.type('Bem-vindo a Valdória, uma terra de ');
  await win.keyboard.press('Control+b');
  await win.keyboard.type('magia antiga');
  await win.keyboard.press('Control+b');
  await win.keyboard.type(' e reinos em guerra.');
  await win.keyboard.press('Enter');
  ok('negrito aplicado', await pc.locator('strong', { hasText: 'magia antiga' }).count() === 1);

  // --- inserir blocos
  await win.click('.insert-btn:has-text("Subtítulo")');
  await win.keyboard.press('Control+End');
  await win.click('.insert-btn:has-text("Tabela") >> nth=0');
  ok('tabela inserida', await pc.locator('table').count() === 1, `rows=${await pc.locator('table tr').count()}`);
  await win.keyboard.press('Control+End');
  await win.click('.insert-btn:has-text("Bloco de criatura")');
  ok('bloco de criatura', await pc.locator('.rpg-block[data-kind="criatura"]').count() === 1);
  await win.keyboard.press('Control+End');
  await mockOpen([path.join(S, 'fixtures/mapa.png')]);
  await win.click('.insert-btn:has-text("Imagem")');
  await win.waitForSelector('.page-content img');
  const imgSrc = await pc.locator('img').getAttribute('src');
  ok('imagem inserida', imgSrc.startsWith('cogito://app/__img/'), imgSrc);
  await win.waitForFunction(() => { const i = document.querySelector('.page-content img'); return i && i.complete && i.naturalWidth > 0; });
  ok('imagem carregou', true);
  await win.waitForTimeout(500);
  await shot(win, '10-conteudo');

  // imagem: largura 50%
  await pc.locator('img').click();
  await win.click('.tool-btn:has-text("50%")');
  ok('largura da imagem', (await pc.locator('img').getAttribute('data-width')) === '50%');

  // --- estrutura
  await win.click('.add-chapter');                    // novo capítulo (entra em renomear)
  await win.keyboard.type('Regras de Combate'); await win.keyboard.press('Enter');
  ok('capítulo criado e renomeado', await win.locator('.chapter-row:has-text("Regras de Combate")').count() === 1);
  // nova seção no capítulo 2
  await win.locator('.chapter-row:has-text("Regras de Combate")').hover();
  await win.locator('.chapter-row:has-text("Regras de Combate") .row-menu').click();
  await win.click('.menu-item:has-text("Nova seção")');
  await win.keyboard.type('Iniciativa'); await win.keyboard.press('Enter');
  await win.locator('.chapter-row:has-text("Regras de Combate") .row-menu').click({ force: true });
  await win.click('.menu-item:has-text("Nova seção")');
  await win.keyboard.type('Ataques'); await win.keyboard.press('Enter');
  ok('seções criadas', await win.locator('.section-row').count() === 2);
  // nova página na seção Ataques
  await win.locator('.section-row:has-text("Ataques") .row-menu').click({ force: true });
  await win.click('.menu-item:has-text("Nova página")');
  ok('páginas', (await win.locator('.page-row').count()) === 5, `n=${await win.locator('.page-row').count()}`);
  // mover seção Ataques para cima
  await win.locator('.section-row:has-text("Ataques") .row-menu').click({ force: true });
  await win.click('.menu-item:has-text("Mover para cima")');
  const secs = await win.locator('.section-row .row-label').allTextContents();
  ok('reordenar seções', secs.join('|') === 'Ataques|Iniciativa', secs.join('|'));
  // arrastar capítulo 2 para antes do capítulo 1
  await win.locator('.chapter-row:has-text("Regras de Combate")').dragTo(win.locator('.chapter-row:has-text("Capítulo 1")'), { targetPosition: { x: 60, y: 4 } });
  let chs = await win.locator('.chapter-row .row-label').allTextContents();
  ok('arrastar capítulo', chs.join('|') === 'Regras de Combate|Capítulo 1', chs.join('|'));
  // arrastar página (em branco, da seção Ataques) para dentro do Capítulo 1
  await win.locator('.page-row:has-text("página em branco")').dragTo(win.locator('.chapter-row:has-text("Capítulo 1")'));
  await win.waitForTimeout(200);
  await shot(win, '11-estrutura');

  // --- sumário
  await win.click('.toc-link');
  await win.waitForSelector('.toc-list');
  let toc = await win.locator('.toc-entry').allTextContents();
  ok('sumário automático', toc.length === 4, JSON.stringify(toc));
  await win.click('text=Editar sumário');
  // edição manual do item "Ataques"
  const inp = win.locator('.toc-edit-row').nth(1).locator('input.toc-input');
  await inp.fill('Ataques e Dano'); await inp.blur();
  // ocultar "Iniciativa"
  await win.locator('.toc-edit-row').nth(2).locator('.icon-btn').first().click();
  // item manual
  await win.fill('.toc-add-row .toc-input', 'Apêndice: Mapa');
  await win.selectOption('.toc-add-row select >> nth=0', { index: 1 });
  await win.click('.toc-add-row >> text=Adicionar');
  await shot(win, '12-sumario-edicao');
  await win.click('text=Concluir');
  toc = await win.locator('.toc-entry .toc-label').allTextContents();
  ok('sumário com edições', toc.includes('Ataques e Dano') && !toc.includes('Iniciativa') && toc.includes('Apêndice: Mapa'), JSON.stringify(toc));
  // muda estrutura: renomeia capítulo e adiciona outro → edições manuais devem permanecer
  await win.locator('.chapter-row:has-text("Capítulo 1")').dblclick();
  await win.keyboard.type('O Mundo'); await win.keyboard.press('Enter');
  await win.click('.toc-link');
  toc = await win.locator('.toc-entry .toc-label').allTextContents();
  ok('sumário atualiza sem perder edições', toc.includes('O Mundo') && toc.includes('Ataques e Dano') && !toc.includes('Iniciativa') && toc.includes('Apêndice: Mapa'), JSON.stringify(toc));
  await shot(win, '13-sumario');
  // clique no item leva à página
  await win.click('.toc-entry:has-text("O Mundo")');
  await win.waitForSelector('.page-content');
  const h1 = await win.locator('.page-content h1').first().textContent();
  ok('sumário navega', h1 === 'O Mundo', h1);

  // --- dados
  await win.click('.rail-btn[title="Dados"]');
  await win.fill('.dice-form input', '2d6+3'); await win.click('.dice-form button');
  ok('animação em andamento', await win.locator('.dice-stage-fx .fx-die.tumbling').count() === 2);
  await win.waitForSelector('.dice-stage-fx .fx-total.pop');
  const total = Number(await win.locator('.dice-stage-fx .fx-total').textContent());
  ok('2d6+3 no intervalo', total >= 5 && total <= 15, `total=${total}`);
  for (const d of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) await win.click(`.die-btn:has-text("${d}") >> nth=0`);
  await win.waitForSelector('.dice-stage-fx .fx-total.pop');
  const hist = await win.locator('.dice-history li .hist-formula').allTextContents();
  ok('histórico limitado a 6', hist.length === 6 && hist[0] === '1d100' && hist[5] === '1d6', hist.join(','));
  await win.fill('.dice-form input', 'abc'); await win.click('.dice-form button');
  ok('fórmula inválida avisa', await win.locator('.dice-error').count() === 1);
  await shot(win, '14-dados');

  // --- salvar
  await win.waitForSelector('.save-pill.ok', { timeout: 5000 });
  const dir = path.join(data, 'docs', 'Livros'); const id = fs.readdirSync(dir)[0];
  const saved = JSON.parse(fs.readFileSync(path.join(dir, id, 'livro.json'), 'utf8'));
  ok('salvo no disco', saved.chapters.length === 2 && saved.chapters[1].title === 'O Mundo' && JSON.stringify(saved).includes('magia antiga'));
  ok('toc manual salvo', saved.toc.custom.length === 1 && Object.keys(saved.toc.overrides).length === 2);
  ok('backup existe', fs.readdirSync(path.join(dir, id, 'backups')).length >= 1, fs.readdirSync(path.join(dir, id)).join(','));
  ok('imagem na pasta do livro', fs.readdirSync(path.join(dir, id, 'imagens')).length === 1);

  console.log(results.join('\n')); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { console.log(results.join('\n')); console.error(e); process.exit(1); });
