/* Imprime as notas de uma versão a partir do CHANGELOG.md (usado pelo GitHub Actions ao publicar uma Release). */
const fs = require('fs');
const path = require('path');

const tag = String(process.argv[2] || '').replace(/^v/, '');
const text = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
const lines = text.split(/\r?\n/);
const start = lines.findIndex((l) => new RegExp(`^## \\[?${tag.replace(/\./g, '\\.')}\\]?(\\s|$)`).test(l));
let body = '';
if (start >= 0) {
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l) || /^\[[^\]]+\]:/.test(l));
  body = (end >= 0 ? rest.slice(0, end) : rest).join('\n').trim();
}
const download = [
  '### ⬇️ Como baixar',
  '- **COGITO-Instalador-' + tag + '.exe**: instala com atalhos no menu Iniciar e na área de trabalho.',
  '- **COGITO-' + tag + '-windows-x64.zip**: versão portátil, é só extrair e abrir o `COGITO.exe`.',
  '',
  'Na primeira vez, se o Windows mostrar "O Windows protegeu o computador", clique em **Mais informações › Executar assim mesmo**.',
  '',
  'Encontrou um problema? [Reporte um bug](../../issues/new?template=bug.yml). Tem uma ideia? [Sugira aqui](../../issues/new?template=ideia.yml).',
].join('\n');
process.stdout.write((body || 'Veja o CHANGELOG.md para os detalhes desta versão.') + '\n\n' + download + '\n');
