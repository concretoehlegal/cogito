'use strict';
// Modo de desenvolvimento: sobe o Vite e abre o Electron apontando para ele.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const root = path.join(__dirname, '..');
const bin = (name) => path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
const URL = 'http://localhost:5173';
const vite = spawn(bin('vite'), [], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
function wait(cb, tries = 0) {
  http.get(URL, () => cb()).on('error', () => (tries > 100 ? process.exit(1) : setTimeout(() => wait(cb, tries + 1), 200)));
}
wait(() => {
  const el = spawn(bin('electron'), ['.'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, COGITO_DEV_URL: URL } });
  el.on('exit', () => { vite.kill(); process.exit(0); });
});
