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

function walkFiles(rootPath) {
  const pending = [rootPath];
  const files = [];

  while (pending.length > 0) {
    const currentPath = pending.pop();
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
      } else if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function isCodesignCandidate(filePath) {
  if (filePath.endsWith('.dylib') || filePath.endsWith('.node')) {
    return true;
  }

  try {
    const stat = fs.statSync(filePath);
    return (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

function stripUnsignedMacAppSignatures(appPath) {
  const candidateFiles = walkFiles(appPath).filter(isCodesignCandidate);

  for (const candidateFile of candidateFiles) {
    try {
      execFileSync('codesign', ['--remove-signature', candidateFile], { stdio: 'ignore' });
    } catch {
      // Ignore unsigned files; we only need to clear linker/ad-hoc signatures when present.
    }
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

  stripUnsignedMacAppSignatures(appPath);
}

module.exports = afterPack;
module.exports.default = afterPack;
module.exports.shouldNormalizeUnsignedMacApp = shouldNormalizeUnsignedMacApp;
module.exports.stripUnsignedMacAppSignatures = stripUnsignedMacAppSignatures;
