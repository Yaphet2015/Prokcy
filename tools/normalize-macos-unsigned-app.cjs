const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function hasSigningCredentials() {
  return Boolean(process.env.CSC_LINK || process.env.CSC_NAME || process.env.APPLE_ID || process.env.APPLE_API_KEY || process.env.APPLE_API_KEY_ID);
}

function shouldNormalizeUnsignedMacApp(context) {
  if (context.electronPlatformName !== 'darwin') {
    return false;
  }

  if (hasSigningCredentials()) {
    return false;
  }

  return String(process.env.CSC_IDENTITY_AUTO_DISCOVERY).toLowerCase() === 'false';
}

function isMachOFile(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const header = Buffer.alloc(4);
      const bytesRead = fs.readSync(fd, header, 0, 4, 0);
      if (bytesRead < 4) return false;
      const magic = header.readUInt32BE(0);
      // Mach-O magics (BE view): MH_MAGIC / MH_CIGAM / MH_MAGIC_64 / MH_CIGAM_64 / FAT_MAGIC / FAT_CIGAM
      return (
        magic === 0xfeedface ||
        magic === 0xcefaedfe ||
        magic === 0xfeedfacf ||
        magic === 0xcffaedfe ||
        magic === 0xcafebabe ||
        magic === 0xbebafeca ||
        magic === 0xcafebabf ||
        magic === 0xbfbafeca
      );
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

function listAllFiles(rootPath) {
  const results = [];
  const pending = [rootPath];
  while (pending.length > 0) {
    const currentPath = pending.pop();
    let entries;
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isSymbolicLink()) {
        continue;
      }
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }
  return results;
}

function listNestedCodeContainers(appPath) {
  // Bundles that need their own post-leaf codesign pass, in deepest-first order.
  // Covers *.framework version directories, nested *.app helpers, framework
  // containers themselves, and finally the outer .app bundle.
  const directories = [];
  const stack = [appPath];
  while (stack.length > 0) {
    const current = stack.pop();
    directories.push(current);
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      stack.push(path.join(current, entry.name));
    }
  }

  const containers = directories.filter((dir) => {
    const name = path.basename(dir);
    if (name.endsWith('.app') && dir !== appPath) return true;
    if (name.endsWith('.framework')) return true;
    const parentName = path.basename(path.dirname(dir));
    if (parentName === 'Versions' && path.basename(path.dirname(path.dirname(dir))).endsWith('.framework')) {
      return true;
    }
    return false;
  });

  containers.sort((a, b) => b.length - a.length);
  containers.push(appPath);
  return containers;
}

function runCodesign(args, target) {
  execFileSync('codesign', [...args, target], { stdio: ['ignore', 'ignore', 'pipe'] });
}

// Apply a full ad-hoc signing pass to every Mach-O leaf and every nested
// bundle/framework/helper, then seal the outer .app bundle.
//
// Why this is needed:
//   On Apple Silicon the kernel refuses to exec any Mach-O that has no code
//   signature, and dyld's library validation refuses to load any unsigned
//   dylib into a signed process. electron-builder's CSC_IDENTITY_AUTO_DISCOVERY
//   =false path leaves nested dylibs completely unsigned, and `codesign --deep`
//   does NOT descend into plain `Libraries/` directories inside a framework,
//   so a single `codesign --deep --sign - <App.app>` leaves e.g.
//   `Electron Framework.framework/Versions/A/Libraries/libffmpeg.dylib`
//   unsigned. The bundle then passes verify but crashes at launch with
//   "Library not loaded: ... Trying to load an unsigned library". Signing
//   Mach-O leaves explicitly, then each nested bundle deepest-first, then the
//   outer .app produces a fully ad-hoc-signed tree that runs on arm64 while
//   still showing the standard "unidentified developer" Gatekeeper flow.
function resignAdhocMacAppBundle(appPath) {
  const adhocArgs = ['--force', '--sign', '-', '--timestamp=none'];

  for (const filePath of listAllFiles(appPath)) {
    const ext = path.extname(filePath);
    const isLeafCandidate = ext === '.dylib' || ext === '.node' || ext === '.so' || ext === '';
    if (!isLeafCandidate) continue;
    if (!isMachOFile(filePath)) continue;
    runCodesign(adhocArgs, filePath);
  }

  for (const containerPath of listNestedCodeContainers(appPath)) {
    runCodesign(adhocArgs, containerPath);
  }
}

async function afterPack(context) {
  if (!shouldNormalizeUnsignedMacApp(context)) {
    return;
  }

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    return;
  }

  resignAdhocMacAppBundle(appPath);
}

module.exports = afterPack;
module.exports.default = afterPack;
module.exports.shouldNormalizeUnsignedMacApp = shouldNormalizeUnsignedMacApp;
module.exports.resignAdhocMacAppBundle = resignAdhocMacAppBundle;
// Legacy alias (older internal callers may still import the pre-fix name).
module.exports.stripUnsignedMacAppSignatures = resignAdhocMacAppBundle;
