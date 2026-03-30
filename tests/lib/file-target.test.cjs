const test = require('node:test');
const assert = require('node:assert/strict');

let fileTargetModulePromise = null;

async function loadFileTargetModule() {
  if (!fileTargetModulePromise) {
    fileTargetModulePromise = import('../../lib/file-target')
      .then((module) => module)
      .catch(() => ({}));
  }

  return fileTargetModulePromise;
}

test('normalizes a POSIX file URL for shell.openPath', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file:///Users/test/a%20b.js'),
    {
      kind: 'local-file',
      path: '/Users/test/a b.js',
    },
  );
});

test('normalizes a Windows file URL for shell.openPath', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file:///C:/tmp/demo.txt'),
    {
      kind: 'local-file',
      path: 'C:\\tmp\\demo.txt',
    },
  );
});

test('expands home shorthand file targets', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file://~/demo.txt', {
      homeDir: '/Users/tester',
    }),
    {
      kind: 'local-file',
      path: '/Users/tester/demo.txt',
    },
  );
});

test('marks whistle temp targets as unsupported external file targets', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file://temp/demo.txt'),
    {
      kind: 'unsupported-target',
      code: 'unsupported_target',
      message: 'This Whistle file target is not a local file path.',
    },
  );
});

test('marks remote URLs wrapped by file protocol as unsupported external file targets', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file://https://example.com/a.txt'),
    {
      kind: 'unsupported-target',
      code: 'unsupported_target',
      message: 'This Whistle file target is not a local file path.',
    },
  );
});

test('marks malformed file protocol targets as unsupported external file targets', async () => {
  const { resolveFileProtocolTarget } = await loadFileTargetModule();
  assert.equal(typeof resolveFileProtocolTarget, 'function');

  assert.deepEqual(
    resolveFileProtocolTarget('file://not-valid-host/path.txt'),
    {
      kind: 'unsupported-target',
      code: 'unsupported_target',
      message: 'This Whistle file target is not a local file path.',
    },
  );
});
