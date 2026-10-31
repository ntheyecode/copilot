// electron-builder config for MyTaskPilot by LinkNotes (the individuals
// product, linknotes.com). Same code as WorkCoPilot; this only changes what
// differs: the product name, app id, update feed, installer names, icon, its
// own MSI upgrade code (so it installs side by side with WorkCoPilot), and the
// brand stamped into the packaged package.json, which brand.js reads at start.
//   npm run dist:linknotes     (signs with the same certificate as WorkCoPilot)
const base = require('../package.json').build

module.exports = {
  ...base,
  appId: 'com.linknotes.mytaskpilot',
  productName: 'MyTaskPilot',
  extraMetadata: { brand: 'linknotes', description: 'MyTaskPilot by LinkNotes: a floating guide that helps you do and finish your work, one exact step at a time, on your own screen.' },
  publish: [{ provider: 'generic', url: 'https://linknotes.com/work-updates/' }],
  directories: { ...base.directories, output: 'release-mytaskpilot' },
  // WC_UNSIGNED=1 makes a verification build without touching the certificate
  // (no PIN prompt); the release build is always signed.
  win: { ...base.win, icon: 'build/linknotes/icon.png', ...(process.env.WC_UNSIGNED === '1' ? { signtoolOptions: undefined } : {}) },
  nsis: { ...base.nsis, artifactName: 'MyTaskPilot-Setup.exe' },
  msi: { ...base.msi, artifactName: 'MyTaskPilot-Setup.msi', upgradeCode: '745B4A30-FB47-4780-A886-B16FE459453C' },
}
