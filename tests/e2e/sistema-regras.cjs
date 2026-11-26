// 0.17: sistema de regras por campanha (D&D → editar → Call of Cthulhu → ataque em porcentagem na ficha).
const { launch, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x = '') => res.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
const OUT = path.join(S, 'sy'); fs.mkdirSync(OUT, { recursive: true });
const snap = (win, name, opt = {}) => win.screenshot({ path: path.join(OUT, name + '.png'), ...opt });
(async () => {
  fs.rmSync(S + '/datasy', { recursive: true, force: true });
  const { app, win, logs } = await launch('datasy');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 1000));
  await win.waitForSelector('.home h1');
  await win.click('.mode-tab >> text=Planejador'); await sleep(300);
  await win.click('text=Nova campanha >> nth=0');
  await win.fill('.plan-dialog-form input >> nth=0', 'A Mina Perdida');
  const sysSel = win.locator('select[aria-label="Sistema de regras"]');
  ok('nova campanha oferece os 7 modelos', (await sysSel.locator('option').count()) === 7, (await sysSel.locator('option').allTextContents()).join(', '));
  await sysSel.selectOption('dnd5e');
  await win.click('.modal >> text=Criar campanha');
  await win.waitForSelector('.plan-screen'); await sleep(500);
  const tools = (await win.locator('.plan-tool span').allTextContents()).slice(0, 8).join('|');
  ok('barra do quadro usa os nomes do D&D', tools.includes('Personagem') && tools.includes('Monstro'), tools);
  ok('painel da campanha mostra o sistema', (await win.locator('.pp-sys b').first().textContent()) === 'D&D 5ª edição');

  // ── ficha D&D ──
  await win.click('.plan-tool:has-text("Personagem")'); await sleep(400);
  await win.keyboard.press('Escape').catch(() => {});
  const numLabels = (await win.locator('.pp-nums .field > span').allTextContents()).map((t) => t.trim());
  ok('ficha D&D: PV, CA, Espaços de Magia, Proficiência, Iniciativa', ['Pontos de Vida', 'Classe de Armadura', 'Espaços de Magia', 'Bônus de Proficiência', 'Iniciativa'].every((x) => numLabels.includes(x)), numLabels.join('|'));
  const identLabels = (await win.locator('.pp-ident .field > span').allTextContents()).map((t) => t.trim());
  ok('identidade D&D: espécie, classe, nível, antecedente, alinhamento', ['Espécie', 'Classe', 'Nível', 'Antecedente', 'Alinhamento'].every((x) => identLabels.includes(x)), identLabels.join('|'));
  const heads = (await win.locator('.pp-listhead').allTextContents()).map((t) => t.trim());
  ok('listas D&D: Atributos, Testes de Resistência, Perícias', heads.join('|') === 'Atributos|Testes de Resistência|Perícias', heads.join('|'));
  await win.fill('.pp-body input[value="Personagem"] >> nth=0', 'Thorin').catch(() => {});
  await win.locator('.pp-ident .field:has-text("Classe") input').first().fill('Guerreiro');
  await win.locator('.pp-nums .field:has-text("Classe de Armadura") input').fill('18');
  await win.locator('.pp-nums .field:has-text("Pontos de Vida") input').fill('28');
  // item da lista: valor, novo nome e novo ícone
  const forca = win.locator('.attr-row.with-icon').first();
  await forca.locator('input').nth(1).fill('16 (+3)');
  await forca.locator('input').first().fill('Força bruta');
  await forca.locator('.effect-icon').click(); await sleep(200);
  await win.locator('.icon-pop button[title="Martelo"]').click(); await sleep(300);
  await sleep(1200);
  const planDir = path.join(S, 'datasy/docs/Planejador'); const pid = fs.readdirSync(planDir)[0];
  const disk = () => JSON.parse(fs.readFileSync(path.join(planDir, pid, 'plano.json'), 'utf8'));
  let d = disk(); let pc = d.nodes.find((n) => n.type === 'personagem');
  ok('valores, nome e ícone do item gravados', pc.sheet.vals.ca === '18' && pc.sheet.vals.classe === 'Guerreiro' && pc.sheet.lists.atributos[0].k === 'Força bruta' && pc.sheet.lists.atributos[0].icon === 'martelo' && pc.sheet.lists.atributos[0].v === '16 (+3)', JSON.stringify(pc.sheet.lists.atributos[0]));
  await win.mouse.move(800, 990);
  await snap(win, 'sy01-ficha-dnd');

  // ── editor do sistema ──
  await win.click('.pp-sys button:has-text("Editar sistema")'); await win.waitForSelector('.sys-editor');
  ok('editor abre com os campos do sistema', (await win.locator('.se-row .se-name').count()) >= 10);
  await snap(win, 'sy02-editor-campos');
  // renomeia a CA, cria uma barra "Corrupção" na carta
  const caRow = win.locator('.se-row').filter({ has: win.locator('input.se-name[value="Classe de Armadura"]') });
  await caRow.locator('input.se-name').fill('Armadura Natural');
  await win.click('.se-add button:has-text("Barra")'); await sleep(100);
  const last = win.locator('.se-row').last();
  await last.locator('input.se-name').fill('Corrupção');
  await last.locator('input.se-short').fill('COR');
  await last.locator('.se-def input').first().fill('3');
  // nomes
  await win.click('.se-tabs button:has-text("Nomes")');
  await win.locator('.se-pane .field:has-text("Personagem") input').first().fill('Aventureiro');
  await win.locator('.se-pane .field:has-text("Habilidades de origem") input').fill('Traços de Espécie');
  await snap(win, 'sy03-editor-nomes');
  await win.click('.se-tabs button:has-text("Listas")'); await sleep(150);
  await snap(win, 'sy04-editor-listas');
  await win.click('.se-tabs button:has-text("Rolagens")'); await sleep(150);
  ok('aba de rolagens só com o que a ficha usa', await win.locator('.se-pane .field:has-text("Como o ataque acerta")').count() === 1 && await win.locator('.se-pane .field:has-text("Crítico")').count() === 0 && await win.locator('text=Bestiário').count() === 0);
  await snap(win, 'sy05-editor-rolagens');
  await win.click('.modal button:has-text("Salvar sistema")'); await sleep(600);
  const numLabels2 = (await win.locator('.pp-nums .field > span').allTextContents()).map((t) => t.trim());
  ok('ficha passa a ter o campo novo e o nome novo', numLabels2.includes('Armadura Natural') && numLabels2.includes('Corrupção'), numLabels2.join('|'));
  const tools2 = (await win.locator('.plan-tool span').allTextContents()).join('|');
  ok('barra usa o nome novo do tipo', tools2.includes('Aventureiro'), tools2);
  await win.locator('.pp-nums .field:has-text("Corrupção") input').fill('2'); await sleep(200);
  // carta do quadro mostra a barra nova
  await win.click('.plan-tool:has-text("Monstro")'); await sleep(400);
  await win.locator('.pp-nums .field:has-text("Pontos de Vida") input').fill('30');
  await win.click('.plan-tool[title="Enquadrar tudo"]'); await sleep(500);
  const chips = await win.locator('.pn-node.t-personagem .bc-chip').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
  ok('carta do personagem mostra PV, CA renomeada e Corrupção', chips.includes('Pontos de Vida') && chips.includes('Armadura Natural') && chips.includes('Corrupção'), chips.join('|'));
  await win.keyboard.press('Escape'); await sleep(200);
  await win.mouse.move(700, 900);
  await snap(win, 'sy06-quadro-dnd');

  // ── troca para Call of Cthulhu ──
  await win.click('.pp-sys button:has-text("Editar sistema")').catch(async () => { await win.click('.pp-sys button'); });
  await win.waitForSelector('.sys-editor');
  await win.locator('.se-top select').first().selectOption('coc7'); await sleep(200);
  await win.click('button:has-text("Usar o modelo")'); await sleep(200);
  await win.click('.modal button:has-text("Salvar sistema")'); await sleep(1500);
  d = disk(); pc = d.nodes.find((n) => n.type === 'personagem');
  ok('trocou para Call of Cthulhu mantendo o que tinha valor', d.system.base === 'coc7' && pc.sheet.vals.ca === '18' && pc.sheet.vals.sanidade === '55' && pc.sheet.lists.caracteristicas.length === 8 && pc.sheet.lists.atributos.some((x) => x.k === 'Força bruta' && x.v === '16 (+3)'), JSON.stringify(pc.sheet.vals));
  // ataque em porcentagem
  await win.locator('.pn-node.t-personagem').click({ position: { x: 60, y: 30 } }); await sleep(300);
  const hitInput = win.locator('.combat-row input').nth(1);
  await hitInput.fill('70');
  await win.locator('.combat-row input').nth(2).fill('1d10+2');
  await sleep(1300);

  d = disk(); pc = d.nodes.find((n) => n.type === 'personagem');
  ok('ataque em porcentagem guardado na ficha', pc.sheet.actions.some((x) => x.hit === '70' && x.dmg === '1d10+2'), JSON.stringify(pc.sheet.actions));
  const cardText = await win.locator('.pn-node.t-personagem').first().textContent();
  ok('carta do quadro usa os nomes do sistema', cardText.includes('Investigador') && cardText.includes('Características'), cardText);
  await snap(win, 'sy07-ficha-coc');
  res.forEach((r) => console.log(r)); console.log('LOGS', JSON.stringify(logs));
  await app.close();
})().catch((e) => { res.forEach((r) => console.log(r)); console.error(e); process.exit(1); });
