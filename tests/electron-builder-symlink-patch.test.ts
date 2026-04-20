import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const patchModulePath = path.join(process.cwd(), 'tools', 'patch-electron-builder-symlink-race.cjs');

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
const { applySymlinkRacePatch } = require(patchModulePath);

test('applySymlinkRacePatch rewrites concurrent ensureSymlink calls to sequential awaits', () => {
  const originalSource = `
async function copyAppFiles() {
  if (links.length > 0) {
    await bluebird_lst_1.default.map(links, it => (0, fs_extra_1.ensureSymlink)(it.link, it.file), fs_1.CONCURRENCY);
  }
}
`;

  const patchedSource = applySymlinkRacePatch(originalSource);

  assert.match(patchedSource, /const pendingLinks = \[\.\.\.links\]/);
  assert.match(patchedSource, /await \(0, fs_extra_1\.ensureSymlink\)\(link\.link, link\.file\)/);
  assert.match(patchedSource, /if \(error\?\.code === "ENOENT"\)/);
  assert.doesNotMatch(patchedSource, /bluebird_lst_1\.default\.map\(links/);
});

test('applySymlinkRacePatch is idempotent', () => {
  const currentSource = fs.readFileSync(
    path.join(process.cwd(), 'node_modules', 'electron-builder', 'node_modules', 'app-builder-lib', 'out', 'util', 'appFileCopier.js'),
    'utf8',
  );

  const once = applySymlinkRacePatch(currentSource);
  const twice = applySymlinkRacePatch(once);

  assert.equal(twice, once);
});
