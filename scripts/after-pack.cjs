'use strict';
// Depois de empacotar para Windows: aplica o ícone e os dados do COGITO ao executável.
// (Feito em JavaScript puro para que o instalador possa ser gerado em qualquer sistema.)
const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const info = context.packager.appInfo;
  const exePath = path.join(context.appOutDir, `${info.productFilename}.exe`);
  const icoPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const ResEdit = await import('resedit');
  const PE = await import('pe-library');

  const exe = PE.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = PE.NtExecutableResource.from(exe);

  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0] ?? { id: 1, lang: 1033 };
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, icon.icons.map((i) => i.data));

  const [version] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  if (version) {
    const [major = 0, minor = 0, patch = 0] = info.version.split('.').map((n) => parseInt(n, 10) || 0);
    version.setFileVersion(major, minor, patch, 0, 1033);
    version.setProductVersion(major, minor, patch, 0, 1033);
    version.setStringValues({ lang: 1033, codepage: 1200 }, {
      ProductName: info.productName, FileDescription: info.productName, CompanyName: 'COGITO',
      InternalName: info.productName, OriginalFilename: `${info.productFilename}.exe`,
      LegalCopyright: `© ${new Date().getFullYear()} COGITO`,
    });
    version.outputToResourceEntries(res.entries);
  }
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log(`  • ícone e informações aplicados a ${path.basename(exePath)}`);
};
