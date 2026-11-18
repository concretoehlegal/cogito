'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('cogito', {
  info: call('app:info'),
  openDataFolder: call('app:openDataFolder'),
  showInFolder: call('app:showInFolder'),
  readyToClose: call('app:readyToClose'),
  setTheme: call('app:setTheme'),
  setSpellcheck: call('app:setSpellcheck'),
  setUiScale: call('app:setUiScale'),
  copyText: call('app:copyText'),
  listFonts: call('fonts:list'),
  openFontsFolder: call('fonts:openFolder'),
  onBeforeClose: (fn) => { ipcRenderer.removeAllListeners('app:before-close'); ipcRenderer.on('app:before-close', () => fn()); },

  listBooks: call('books:list'),
  loadBook: call('books:load'),
  saveBook: call('books:save'),
  createBook: call('books:create'),
  renameBook: call('books:rename'),
  deleteBook: call('books:delete'),
  listBackups: call('books:backups'),
  restoreBackup: call('books:restoreBackup'),
  backupNow: call('books:backupNow'),

  pickImages: call('images:pick'),
  saveImage: call('images:save'),
  readImage: call('images:read'),

  listRefs: call('refs:list'),
  addRefs: call('refs:add'),
  removeRef: call('refs:remove'),
  openRefExternal: call('refs:openExternal'),

  listLibrary: call('library:list'),
  addToLibrary: call('library:add'),
  renameLibraryItem: call('library:rename'),
  removeLibraryItem: call('library:remove'),

  planList: call('plan:list'),
  planCreate: call('plan:create'),
  planLoad: call('plan:load'),
  planSave: call('plan:save'),
  planUpdateMeta: call('plan:updateMeta'),
  planPickCover: call('plan:pickCover'),
  planRemoveCover: call('plan:removeCover'),
  planPickImages: call('plan:pickImages'),
  planPutFile: call('plan:putFile'),
  planDelete: call('plan:delete'),
  planOpenFolder: call('plan:openFolder'),
  huntPickBackground: call('hunt:pickBackground'),

  chooseExportPath: call('export:choosePath'),
  printPdf: call('export:printPdf'),
  writeExport: call('export:writeFile'),
});
