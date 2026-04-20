#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const TARGET_RELATIVE_PATHS = [
  path.join('node_modules', 'electron-builder', 'node_modules', 'app-builder-lib', 'out', 'util', 'appFileCopier.js'),
  path.join('node_modules', 'dmg-builder', 'node_modules', 'app-builder-lib', 'out', 'util', 'appFileCopier.js'),
  path.join('node_modules', 'electron-builder-squirrel-windows', 'node_modules', 'app-builder-lib', 'out', 'util', 'appFileCopier.js'),
];

const LOCAL_PATCH_MARKER = 'const pendingLinks = [...links];';

const CONCURRENT_BLOCK_PATTERN =
  /([ \t]*)if\s*\(links\.length\s*>\s*0\)\s*\{\s*await bluebird_lst_1\.default\.map\(links, it => \(0, fs_extra_1\.ensureSymlink\)\(it\.link, it\.file\), fs_1\.CONCURRENCY\);\s*\}/m;

function buildSequentialBlock(indent) {
  return `${indent}if (links.length > 0) {
${indent}    const pendingLinks = [...links];
${indent}    while (pendingLinks.length > 0) {
${indent}        let createdLinkCount = 0;
${indent}        for (let index = 0; index < pendingLinks.length;) {
${indent}            const link = pendingLinks[index];
${indent}            try {
${indent}                await (0, fs_extra_1.ensureSymlink)(link.link, link.file);
${indent}                pendingLinks.splice(index, 1);
${indent}                createdLinkCount++;
${indent}            }
${indent}            catch (error) {
${indent}                if (error?.code === "ENOENT") {
${indent}                    index++;
${indent}                    continue;
${indent}                }
${indent}                throw error;
${indent}            }
${indent}        }
${indent}        if (pendingLinks.length > 0 && createdLinkCount === 0) {
${indent}            const firstPendingLink = pendingLinks[0];
${indent}            throw new Error(\`Unable to create symlink \${firstPendingLink.file} -> \${firstPendingLink.link}: unresolved link dependency\`);
${indent}        }
${indent}    }
${indent}}`;
}

function applySymlinkRacePatch(source) {
  if (source.includes(LOCAL_PATCH_MARKER)) {
    return source;
  }

  const match = source.match(CONCURRENT_BLOCK_PATTERN);
  if (match == null) {
    throw new Error('Could not find the electron-builder symlink creation block to patch');
  }

  return source.replace(CONCURRENT_BLOCK_PATTERN, buildSequentialBlock(match[1] ?? ''));
}

function patchFile(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return false;
  }

  const originalSource = fs.readFileSync(targetPath, 'utf8');
  const patchedSource = applySymlinkRacePatch(originalSource);

  if (patchedSource !== originalSource) {
    fs.writeFileSync(targetPath, patchedSource);
  }

  return true;
}

function patchElectronBuilderSymlinkRace(repoRoot = process.cwd()) {
  let patchedAnyFile = false;

  for (const relativePath of TARGET_RELATIVE_PATHS) {
    const absolutePath = path.join(repoRoot, relativePath);
    patchedAnyFile = patchFile(absolutePath) || patchedAnyFile;
  }

  if (!patchedAnyFile) {
    throw new Error('Could not find any appFileCopier.js file to patch');
  }
}

if (require.main === module) {
  patchElectronBuilderSymlinkRace();
}

module.exports = {
  applySymlinkRacePatch,
  patchElectronBuilderSymlinkRace,
};
