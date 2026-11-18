'use strict';
// Copia os recursos do leitor de PDF (mapas de caracteres e fontes padrão) para dentro do app,
// para que a biblioteca funcione totalmente offline.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'pdfjs-dist');
const dest = path.join(root, 'public', 'pdfjs');
for (const dir of ['cmaps', 'standard_fonts']) {
  fs.rmSync(path.join(dest, dir), { recursive: true, force: true });
  fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
console.log('Recursos do leitor de PDF copiados.');
