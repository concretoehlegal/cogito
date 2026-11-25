const { launch, shot, S } = require('./lib.cjs');
const fs = require('fs'); const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await fn()) return true; } catch { /* */ } await sleep(120); } return false; };
const results = []; const ok = (n, c, x = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`);
(async () => {
  fs.rmSync(S + '/datah', { recursive: true, force: true });
  const { app, win, logs } = await launch('datah');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 960));
  await win.waitForSelector('.home h1');
  ok('três áreas na tela inicial', (await win.locator('.mode-tab strong').allTextContents()).join('|') === 'Escritor|Planejador de Campanhas|Bestiário');
  await shot(win, 'h00-areas');
  // fichas criadas num quadro do Planejador
  const card = (p) => ({ id: 'c' + Math.random().toString(36).slice(2, 8), type: 'item', name: 'Carta', icon: '', image: null, color: '#c27a33', rarity: 'comum', cost: '', roll: '', tags: '', description: '', qty: 1, consumable: false, equipped: false, mode: 'ativo', cooldown: '', stats: [], hunt: '', ...p });
  const node = (type, title, sheet, extra = {}) => ({ id: 'n-' + title.replace(/\W/g, ''), type, x: 0, y: 0, w: 200, h: 273, title, subtitle: '', color: extra.color || '#c27a33', icon: extra.icon || 'pessoa', image: null, body: '', tags: [], sheet: { life: 10, defense: 10, resilience: 0, soul: 0, boss: false, attrs: [], actions: [], cards: [], ai: 'agressiva', ...sheet } });
  const nodes = [
    node('personagem', 'Vera Lins', { life: 30, defense: 14, resilience: 3, soul: 8, attrs: [{ k: 'Mira', v: '70' }], actions: [{ name: 'Soco', hit: '1d20+5', dmg: '1d4+1' }], cards: [
      card({ type: 'item', name: 'Revólver .38', icon: 'revolver', roll: '2d6+2', hunt: 'dano', mode: 'ativo', equipped: true }),
      card({ type: 'item', name: 'Remédio', icon: 'pilula', roll: '2d4+2', hunt: 'cura', consumable: true, qty: 2, mode: 'ativo' }),
      card({ type: 'item', name: 'Colete', icon: 'escudo', roll: '1d4+1', hunt: 'defesa', mode: 'ativo', cooldown: '2 turnos', equipped: true }),
      card({ type: 'feitico', name: 'Sussurro do Abismo', icon: 'vela', roll: '3d8', hunt: 'dano', cost: '2 Alma', cooldown: '3 turnos', mode: 'ativo', rarity: 'epico' }),
      card({ type: 'habilidade', name: 'Faro', icon: 'olho', mode: 'passivo' }),
    ] }, { icon: 'detetive' }),
    node('inimigo', 'Cultista', { life: 14, defense: 11, actions: [{ name: 'Faca ritual', hit: '1d20+4', dmg: '1d6+2' }, { name: 'Prece profana', hit: '1d20', dmg: '2d10' }] }, { color: '#d8463a', icon: 'olho' }),
    node('inimigo', 'O Verme', { life: 40, defense: 13, boss: true, actions: [{ name: 'Tentáculo', hit: '1d20+6', dmg: '2d6+3' }, { name: 'Engolir', hit: '1d20+2', dmg: '4d8' }] }, { color: '#8d5aa3', icon: 'tentaculo' }),
  ];
  const planId = await win.evaluate(async (ns) => { const m = await window.cogito.planCreate({ name: 'Cair da Noite' }); const p = await window.cogito.planLoad(m.id); p.nodes = ns; await window.cogito.planSave(p); return m.id; }, nodes);
  const planFile = path.join(S, 'datah/docs/Planejador', planId, 'plano.json');
  const plan = () => JSON.parse(fs.readFileSync(planFile, 'utf8'));
  await win.click('.mode-tab >> text=Bestiário'); await win.waitForSelector('.hunt-home .hh-card');
  await win.click('.hh-card >> text=Vera Lins');
  const prey = win.locator('.hh-card.prey');
  await prey.filter({ hasText: 'Cultista' }).locator('button[aria-label="Mais"]').click();
  await prey.filter({ hasText: 'Cultista' }).locator('button[aria-label="Mais"]').click();
  await prey.filter({ hasText: 'O Verme' }).locator('button[aria-label="Mais"]').click();
  await shot(win, 'h01-preparacao');
  await win.click('text=Começar o confronto'); await win.waitForSelector('.hunt');
  const keyed = await win.evaluate(() => [...document.querySelectorAll('.hud-left .hud-item.usable')].map((el) => [Number(el.querySelector('.hi-key')?.textContent), el.querySelector('strong').textContent.replace(/ ×\d+$/, '')]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('|'));
  ok('caçada abre com 3 presas e as ações da ficha no painel (teclas 1–5)', await win.locator('.hunt-enemy').count() === 3 && keyed === 'Soco|Revólver .38|Remédio|Colete|Sussurro do Abismo', keyed);
  ok('HUD: seções, inimigo na mira, PV/PA, atalhos e instrumento', (await win.locator('.hud-sec h3').allTextContents()).join('|') === 'Habilidades de Origem|Habilidades|Ocultos|Equipamentos|Ataques|Atributos|Capacidades' && await win.locator('.hud-foe').count() === 1 && (await win.locator('.hud-hero .hb-bar b').allTextContents()).join('|') === '30 / 30 PV|8 / 8 PA' && (await win.locator('.hin-name').textContent()).includes('Revólver .38') && await win.locator('.hk-slot').count() === 5);
  // Os dados são aleatórios: se as criaturas começam e acertam um crítico, a caçadora pode cair antes da vez dela.
  // O jogo encerra certo ("Derrota"); o teste recomeça o confronto, como faria um jogador.
  const turn = () => win.locator('.hunt-turn').textContent();
  for (let tries = 0; tries < 6; tries++) {
    await until(async () => ['Sua vez', 'Derrota'].includes(await turn()), 20000);
    if ((await turn()) === 'Sua vez') break;
    await win.click('text=Enfrentar de novo'); await sleep(600);
  }
  await shot(win, 'h02-sua-vez');
  // escreve a ação no quadro
  await win.click('#action-text'); await win.keyboard.type('Sussurro as palavras proibidas contra o chefe');
  await sleep(200);
  ok('quadro interpreta a ação escrita', (await win.locator('.ab-reading').textContent()).includes('Sussurro do Abismo em O Verme'), await win.locator('.ab-reading').textContent());
  await shot(win, 'h02b-quadro-acao');
  await win.keyboard.press('Enter'); await sleep(300);
  ok('fala do jogador vai para o registro', (await win.locator('.hl.fala').first().textContent()).includes('Sussurro as palavras proibidas'));
  ok('feitiço gastou Alma e entrou em recarga', (await win.locator('.hud-hero .hb-bar >> nth=1').locator('b').textContent()).includes('6 / 8'));
  await until(async () => (await win.locator('.hunt-log-list').textContent()).includes('▸') || (await win.locator('.hl.intencao').count()) > 0, 6000);
  await sleep(500);
  await shot(win, 'h03-presas-agindo');
  await until(async () => (await win.locator('.hunt-turn').textContent()) === 'Sua vez' || await win.locator('.hunt-end').count() === 1, 15000);
  ok('IA anuncia o golpe escolhido no registro', await win.locator('.hl.intencao').count() >= 1, (await win.locator('.hl.intencao').first().textContent()).slice(0, 120));
  ok('recarga aparece no painel', (await win.locator('.hud-item.usable:has-text("Sussurro do Abismo") .hi-cd').count()) === 1);
  // joga até acabar: Revólver (2) sempre; cura quando estiver baixo
  for (let i = 0; i < 160; i++) {
    if (await win.locator('.hunt-end').count()) break;
    if ((await win.locator('.hunt-turn').textContent()) !== 'Sua vez') { await sleep(400); continue; }
    const life = Number((await win.locator('.hud-hero .hb-bar >> nth=0').locator('b').textContent()).match(/(\d+) \//)[1]);
    const remedy = win.locator('.hud-item.usable:has-text("Remédio")');
    const heal = life < 12 && !(await remedy.getAttribute('class')).includes('off');
    await win.click('#action-text'); await win.keyboard.type(heal ? 'tomo o remédio' : 'atiro no cultista mais ferido'); await win.keyboard.press('Enter');
    await sleep(600);
  }
  await until(async () => await win.locator('.hunt-end').count() === 1, 20000);
  await sleep(400);
  ok('a caçada termina com resultado', await win.locator('.hunt-end-card').count() === 1, await win.locator('.hunt-end-card h2').textContent().catch(() => ''));
  await shot(win, 'h04-fim');
  await win.click('text=Enfrentar de novo'); await sleep(400);
  ok('caçar de novo recomeça', await win.locator('.hunt-end').count() === 0 && (await win.locator('.hud-round').textContent()) === 'Rodada 1');
  ok('fichas do quadro não mudaram', plan().nodes[0].sheet.life === 30 && plan().nodes[0].sheet.cards.find((c) => c.name === 'Remédio').qty === 2);
  results.forEach((r) => console.log(r)); console.log('LOGS', logs);
  await app.evaluate(({ app }) => app.exit(0));
})().catch((e) => { results.forEach((r) => console.log(r)); console.error(e); process.exit(1); });
