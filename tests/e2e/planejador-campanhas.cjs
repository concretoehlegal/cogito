const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch { /* */ } await sleep(120); } return false; };
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/dataq', { recursive: true, force: true });
  const { app, win, logs } = await launch('dataq');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  await win.waitForSelector('.home h1');
  ok('três áreas: Escritor, Planejador, Bestiário', (await win.locator('.mode-tab strong').allTextContents()).join('|') === 'Escritor|Planejador de Campanhas|Bestiário');
  await win.click('.mode-tab >> text=Planejador');
  await win.click('text=Nova campanha >> nth=0'); await win.waitForSelector('.plan-dialog');
  await win.fill('.plan-dialog-form input >> nth=0', 'Cair da Noite');
  await win.fill('.plan-dialog-form textarea', 'Noir e terror nos dias de hoje. O grupo caça o Verme no porto.');
  await win.click('.plan-dialog-form .color-dot >> nth=3');
  await win.click('.plan-dialog-form .icon-pick button[title="Lua"]');
  await app.evaluate(({ dialog }, f) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] }); }, path.join(S, 'fixtures/mapa.png'));
  await win.click('text=Escolher foto'); await sleep(500);
  ok('foto aparece na prévia', await win.locator('.plan-dialog .plan-cover img').count() === 1);
  await shot(win, 'q00-nova-campanha');
  await win.click('.modal >> text=Criar campanha');
  await win.waitForSelector('.plan-screen');
  ok('campanha abre o quadro', (await win.locator('.plan-title').textContent()).includes('Cair da Noite'));
  // cria fichas pela barra
  const add = async (label) => { await win.click(`.plan-tool:has-text("${label}")`); await sleep(150); };
  await add('Personagem'); await win.keyboard.type('Vera Lins'); await sleep(100);
  await win.fill('.pp-body .field:has-text("Subtítulo") input', 'Detetive particular');
  await win.click('.pp-body button:has-text("Atributo")'); await win.fill('.attr-row input >> nth=0', 'Mira'); await win.fill('.attr-row input >> nth=1', '70');
  await add('Inimigo'); await win.keyboard.type('O Verme');
  await win.locator('.pp-body label.check:has-text("Chefe") input').check();
  await add('Local'); await win.keyboard.type('Porto Velho');
  await win.fill('.pp-text textarea', 'Covil do [[O Ve');
  await sleep(150);
  ok('sugestão ao digitar [[', (await win.locator('.pp-sugg button').first().textContent()).includes('O Verme'));
  await win.locator('.pp-text textarea').press('Enter');
  ok('link completado', (await win.locator('.pp-text textarea').inputValue()) === 'Covil do [[O Verme]]');
  await add('Nota'); await win.keyboard.type('Gancho');
  await win.fill('.pp-text textarea', 'Vera recebe uma carta anônima falando do [[Porto Velho]] e de [[Irmã Celeste]].');
  await add('Moldura'); await win.keyboard.type('Ato 1');
  await sleep(900);
  const pdir = path.join(S, 'dataq/docs/Planejador'); const pid = fs.readdirSync(pdir)[0];
  const plan = () => JSON.parse(fs.readFileSync(path.join(pdir, pid, 'plano.json'), 'utf8'));
  await until(() => plan().nodes.length === 5);
  ok('fichas gravadas no disco', plan().nodes.map((n) => n.type).sort().join() === 'inimigo,local,moldura,nota,personagem');
  // organiza: posiciona via teclado/arrasto real é difícil; usa a API para layout e reabre
  await win.click('.plan-tool[title="Enquadrar tudo"]'); await sleep(300);
  // arrastar uma ficha
  const card = win.locator('.pn-node.t-local'); const b = await card.boundingBox();
  await win.mouse.move(b.x + 40, b.y + 40); await win.mouse.down(); await win.mouse.move(b.x + 240, b.y + 140, { steps: 8 }); await win.mouse.up(); await sleep(300);
  const b2 = await card.boundingBox();
  ok('arrastar move a ficha', Math.abs(b2.x - b.x - 200) < 6 && Math.abs(b2.y - b.y - 100) < 6, `${b.x},${b.y} → ${b2.x},${b2.y}`);
  // ligar personagem → inimigo pela bolinha
  await win.click('.pn-node.t-personagem', { position: { x: 30, y: 60 } }); await sleep(150);
  const h = await win.locator('.pn-node.t-personagem .pn-handle.wire.right').boundingBox(); const tgt = await win.locator('.pn-node.t-inimigo').boundingBox();
  await win.mouse.move(h.x + 9, h.y + 9); await win.mouse.down(); await win.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 10 }); await win.mouse.up(); await sleep(200);
  ok('ligação criada arrastando a bolinha', await win.locator('.pc-link').count() === 1 && await win.locator('.pp-head:has-text("Ligação")').count() === 1);
  await win.fill('.pp-body .field:has-text("Legenda") input', 'caça'); await sleep(200);
  ok('legenda da ligação', (await win.locator('.pc-link-label').textContent()) === 'caça');
  // desfazer e refazer
  await win.click('.plan-canvas', { position: { x: 30, y: 30 } });
  await win.keyboard.press('Control+z'); await sleep(150);
  ok('desfazer tira a legenda', await win.locator('.pc-link-label').count() === 0);
  await win.keyboard.press('Control+y'); await sleep(150);
  ok('refazer devolve', await win.locator('.pc-link-label').count() === 1);
  // link [[ ]] clicável e citação pendente
  await win.locator('.pn-node.t-nota .pn-link:has-text("Porto Velho")').click(); await sleep(300);
  ok('clicar no [[link]] seleciona a ficha citada', (await win.locator('.pp-body .field:has-text("Nome") input').inputValue()) === 'Porto Velho');
  ok('painel mostra quem cita', await win.locator('.pp-conn.back:has-text("Gancho")').count() === 1);
  await win.locator('.pp-conn.back:has-text("Gancho")').click(); await sleep(300);
  await win.locator('.pp-conn.missing:has-text("Irmã Celeste")').click(); await sleep(200);
  ok('citação pendente cria a ficha', await until(() => plan().nodes.some((n) => n.title === 'Irmã Celeste')) && (await win.locator('.pn-link.missing').count()) === 0);
  // busca
  await win.keyboard.press('Control+f'); await win.keyboard.type('verme'); await sleep(200);
  ok('busca apaga o que não combina', await win.locator('.pn-node.dim').count() >= 3);
  await win.keyboard.press('Escape');
  // laço
  const cv = await win.locator('.plan-canvas').boundingBox();
  await win.mouse.move(cv.x + 5, cv.y + 5); await win.mouse.down(); await win.mouse.move(cv.x + cv.width - 5, cv.y + cv.height - 5, { steps: 6 }); await win.mouse.up(); await sleep(200);
  ok('laço seleciona várias', (await win.locator('.pp-head').textContent()).includes('selecionadas'));
  await win.keyboard.press('Escape');
  // imagem colada/arrastada (via API do quadro)
  await win.click('.plan-tool[title="Imagens do computador"]'); await sleep(500);
  ok('imagem do computador no quadro', await win.locator('.pn-node.t-imagem img').count() === 1);
  await win.click('.plan-tool[title="Enquadrar tudo"]'); await sleep(300);
  await shot(win, 'q01-quadro');
  // enfrentar no Bestiário
  await win.locator('.pn-node.t-inimigo').click({ position: { x: 30, y: 60 } }); await sleep(150);
  await shot(win, 'q02-ficha-inimigo');
  await win.click('text=Enfrentar no Bestiário'); await win.waitForSelector('.hunt-home');
  await sleep(500);
  ok('Bestiário abre com a criatura escolhida', (await win.locator('.hh-card.prey.on').count()) === 1);
  await win.click('.hh-card >> text=Vera Lins');
  await win.click('text=Começar o confronto'); await win.waitForSelector('.hunt');
  ok('confronto com fichas do quadro', await win.locator('.hunt-enemy').count() === 1 && await win.locator('.hud-item.usable').count() >= 1);
  await win.click('text=Sair');
  // voltar ao planejador: lista com capa
  await win.click('.mode-tab >> text=Planejador'); await win.waitForSelector('.pd-row');
  ok('lista mostra capa, ícone e descrição', await win.locator('.pd-row .pd-thumb img').count() === 1 && await win.locator('.pd-cover img').count() === 1 && (await win.locator('.pd-desc').textContent()).includes('Noir'));
  ok('detalhe conta as fichas por tipo', (await win.locator('.pd-tile').allTextContents()).join('|').includes('1Personagens'));
  await win.click('.pd-detail button:has-text("Abrir quadro")'); await win.waitForSelector('.plan-screen');
  await win.locator('.pn-node.t-personagem').dblclick({ position: { x: 100, y: 60 } }); await sleep(300);
  ok('dois cliques na carta abrem a ficha completa', (await win.locator('.ficha h2').textContent()) === 'Vera Lins' && (await win.locator('.fi-stats small').allTextContents()).join('|') === 'Vitalidade|Resiliência|Defesa|Alma|Ações de combate|Ações de movimento');
  await win.keyboard.press('Delete'); await win.keyboard.press('Escape'); await sleep(200);
  ok('Esc fecha a ficha sem apagar a carta', await win.locator('.ficha').count() === 0 && await win.locator('.pn-node.t-personagem').count() === 1);
  await win.click('.plan-top button:has-text("Campanhas")'); await win.waitForSelector('.pd-row');
  await shot(win, 'q03-lista');
  results.forEach((r) => console.log(r)); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { results.forEach((r) => console.log(r)); console.error(e); process.exit(1); });
