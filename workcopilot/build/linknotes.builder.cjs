// electron-builder config for the LinkNotes desktop app (the individuals
// product, linknotes.com). Same code as WorkCoPilot; this only changes what
// differs: the name, app id, update feed, installer names, icon, its own MSI
// upgrade code (so it installs side by side with WorkCoPilot), and the brand
// stamped into the packaged package.json, which brand.js reads at start.
//   npm run dist:linknotes     (signs with the same certificate as WorkCoPilot)
const base = require('../package.json').build

module.exports = {
  ...base,
  appId: 'com.linknotes.desktop',
  productName: 'LinkNotes',
  extraMetadata: { brand: 'linknotes', description: 'LinkNotes desktop: a floating guide that helps you do and finish your work, one exact step at a time, on your own screen.' },
  publish: [{ provider: 'generic', url: 'https://linknotes.com/work-updates/' }],
  directories: { ...base.directories, output: 'release-linknotes' },
  win: { ...base.win, icon: 'build/linknotes/icon.png' },
  nsis: { ...base.nsis, artifactName: 'LinkNotes-Setup.exe' },
  msi: { ...base.msi, artifactName: 'LinkNotes-Setup.msi', upgradeCode: '745B4A30-FB47-4780-A886-B16FE459453C' },
}
