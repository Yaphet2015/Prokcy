import test from 'node:test';
import assert from 'node:assert/strict';

type RulesNavigationModule = {
  getRulesNavigationTarget?: (line: string, column: number) => {
    type: 'file-path';
    target: string;
  } | {
    type: 'value-ref';
    key: string;
  } | null;
};

let rulesNavigationModulePromise: Promise<RulesNavigationModule> | null = null;

async function loadRulesNavigationModule(): Promise<RulesNavigationModule> {
  if (!rulesNavigationModulePromise) {
    rulesNavigationModulePromise = import('../src/features/rules/utils/navigationTarget.ts')
      .then((module) => module as RulesNavigationModule)
      .catch(() => ({}));
  }

  return rulesNavigationModulePromise;
}

test('parses a literal file protocol token as a file target', async () => {
  const { getRulesNavigationTarget } = await loadRulesNavigationModule();
  assert.equal(typeof getRulesNavigationTarget, 'function');

  assert.deepEqual(
    getRulesNavigationTarget?.('example.com file:///Users/test/a%20b.js', 28),
    {
      type: 'file-path',
      target: 'file:///Users/test/a%20b.js',
    },
  );
});

test('parses protocol value references wrapped in braces as Values targets', async () => {
  const { getRulesNavigationTarget } = await loadRulesNavigationModule();
  assert.equal(typeof getRulesNavigationTarget, 'function');

  assert.deepEqual(
    getRulesNavigationTarget?.('example.com reqHeaders://{mockHeaders}', 31),
    {
      type: 'value-ref',
      key: 'mockHeaders',
    },
  );
});

test('treats file protocol value references as Values targets instead of files', async () => {
  const { getRulesNavigationTarget } = await loadRulesNavigationModule();
  assert.equal(typeof getRulesNavigationTarget, 'function');

  assert.deepEqual(
    getRulesNavigationTarget?.('example.com file://{mockFile}', 22),
    {
      type: 'value-ref',
      key: 'mockFile',
    },
  );
});

test('ignores comment lines and plain URL values', async () => {
  const { getRulesNavigationTarget } = await loadRulesNavigationModule();
  assert.equal(typeof getRulesNavigationTarget, 'function');

  assert.equal(
    getRulesNavigationTarget?.('# file:///Users/test/a.js', 10) ?? null,
    null,
  );
  assert.equal(
    getRulesNavigationTarget?.('example.com https://example.com', 22) ?? null,
    null,
  );
});

test('returns null when clicking outside a token', async () => {
  const { getRulesNavigationTarget } = await loadRulesNavigationModule();
  assert.equal(typeof getRulesNavigationTarget, 'function');

  assert.equal(
    getRulesNavigationTarget?.('example.com file:///Users/test/a.js', 12) ?? null,
    null,
  );
});
