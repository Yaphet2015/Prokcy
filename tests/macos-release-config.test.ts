import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('macOS build scripts explicitly disable auto-discovered signing identities', () => {
  const packageJson = JSON.parse(readText('package.json'));

  assert.equal(
    packageJson.build.afterPack,
    'tools/normalize-macos-unsigned-app.cjs',
    'macOS packaging should normalize unsigned app bundles before dmg/dir artifacts are created',
  );

  assert.match(
    packageJson.scripts['build:mac'],
    /patch:electron-builder/,
    'build:mac should patch electron-builder before packaging on macOS',
  );

  assert.match(
    packageJson.scripts['build:mac'],
    /CSC_IDENTITY_AUTO_DISCOVERY=false/,
    'build:mac should avoid broken ad-hoc signatures when no Apple signing identity is configured',
  );

  assert.match(
    packageJson.scripts['release:mac'],
    /patch:electron-builder/,
    'release:mac should patch electron-builder before packaging on macOS',
  );

  assert.match(
    packageJson.scripts['release:mac'],
    /CSC_IDENTITY_AUTO_DISCOVERY=false/,
    'release:mac should publish unsigned artifacts instead of broken ad-hoc signed artifacts',
  );
});

test('GitHub release workflow marks macOS artifacts as unsigned when no Apple credentials are configured', () => {
  const workflow = readText('.github/workflows/release.yml');

  assert.match(
    workflow,
    /npm run patch:electron-builder/,
    'release workflow should patch electron-builder before macOS packaging',
  );

  assert.match(
    workflow,
    /CSC_IDENTITY_AUTO_DISCOVERY:\s*['"]?false['"]?/,
    'release workflow should explicitly disable auto-discovered macOS code signing',
  );
});

test('setup guide documents the macOS signing limitation', () => {
  const docs = readText('GITHUB_ACTIONS_SETUP.md');

  assert.match(
    docs,
    /Apple Developer/i,
    'setup guide should explain that signed and notarized macOS builds require Apple Developer credentials',
  );
});
