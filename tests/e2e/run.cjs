/*
 * Executor dos testes de interface. Roda cada roteiro de tests/e2e em sequência (um app por vez) e falha se algum
 * roteiro terminar com erro, imprimir "FAIL" ou não imprimir nenhum "PASS".
 *
 *   npm run test:e2e                 todos
 *   npm run test:e2e -- bestiario    só os roteiros cujo nome contém "bestiario"
 *
 * Pede o app compilado (npm run build). No Linux sem tela, rode com xvfb-run -a.
 * Ferramentas externas usadas por alguns roteiros: pdftotext/pdfinfo/pdfimages/pdftoppm (poppler) e unzip.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const filter = process.argv.slice(2);
const files = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.cjs') && f !== 'run.cjs' && f !== 'lib.cjs')
  .filter((f) => !filter.length || filter.some((x) => f.includes(x)))
  .sort();
if (!fs.existsSync(path.join(__dirname, '..', '..', 'dist', 'index.html'))) {
  console.error('Falta o build do app: rode "npm run build" antes.');
  process.exit(1);
}

const summary = [];
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 6 * 60 * 1000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const pass = out.split('\n').filter((l) => l.startsWith('PASS')).length;
  const fails = out.split('\n').filter((l) => l.startsWith('FAIL'));
  const ok = r.status === 0 && !fails.length && pass > 0;
  summary.push({ f, ok, pass, fails: fails.length, s: Math.round((Date.now() - t0) / 1000) });
  console.log(`${ok ? 'ok    ' : 'FALHOU'} ${f} — ${pass} verificações, ${fails.length} falhas (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (!ok) {
    for (const l of fails) console.log(`         ${l}`);
    if (r.status !== 0 || !pass) console.log(out.split('\n').filter((l) => !/^\s+at /.test(l)).slice(-15).map((l) => `         ${l}`).join('\n'));
  }
}
const bad = summary.filter((x) => !x.ok);
console.log(`\n${summary.length - bad.length}/${summary.length} roteiros passaram.`);
process.exit(bad.length ? 1 : 0);
