import test from 'node:test';
import assert from 'node:assert/strict';

type PendingValuesNavigationModule = {
  resolveValuesSelectionFromPendingNavigation?: (params: {
    keys: string[];
    selectedKey: string | null;
    pendingKey: string | null;
    suppressAutoSelectOnce?: boolean;
  }) => {
    nextSelectedKey: string | null;
    consumedPendingKey: string | null;
    shouldAutoSelectFirst: boolean;
    suppressAutoSelectOnce: boolean;
  };
};

let pendingValuesNavigationModulePromise: Promise<PendingValuesNavigationModule> | null = null;

async function loadPendingValuesNavigationModule(): Promise<PendingValuesNavigationModule> {
  if (!pendingValuesNavigationModulePromise) {
    pendingValuesNavigationModulePromise = import('../src/features/values/utils/pendingNavigation.ts')
      .then((module) => module as PendingValuesNavigationModule)
      .catch(() => ({}));
  }

  return pendingValuesNavigationModulePromise;
}

test('selects the pending key and consumes navigation when the key exists', async () => {
  const { resolveValuesSelectionFromPendingNavigation } = await loadPendingValuesNavigationModule();
  assert.equal(typeof resolveValuesSelectionFromPendingNavigation, 'function');

  assert.deepEqual(
    resolveValuesSelectionFromPendingNavigation?.({
      keys: ['alpha', 'beta'],
      selectedKey: null,
      pendingKey: 'beta',
    }),
    {
      nextSelectedKey: 'beta',
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: false,
    },
  );
});

test('keeps selection empty and suppresses auto-select when the pending key is missing', async () => {
  const { resolveValuesSelectionFromPendingNavigation } = await loadPendingValuesNavigationModule();
  assert.equal(typeof resolveValuesSelectionFromPendingNavigation, 'function');

  assert.deepEqual(
    resolveValuesSelectionFromPendingNavigation?.({
      keys: ['alpha', 'beta'],
      selectedKey: null,
      pendingKey: 'missing',
    }),
    {
      nextSelectedKey: null,
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: true,
    },
  );
});

test('auto-selects the first key only when there is no pending navigation', async () => {
  const { resolveValuesSelectionFromPendingNavigation } = await loadPendingValuesNavigationModule();
  assert.equal(typeof resolveValuesSelectionFromPendingNavigation, 'function');

  assert.deepEqual(
    resolveValuesSelectionFromPendingNavigation?.({
      keys: ['alpha', 'beta'],
      selectedKey: null,
      pendingKey: null,
    }),
    {
      nextSelectedKey: 'alpha',
      consumedPendingKey: null,
      shouldAutoSelectFirst: true,
      suppressAutoSelectOnce: false,
    },
  );
});

test('suppresses one auto-select cycle after a missing pending key', async () => {
  const { resolveValuesSelectionFromPendingNavigation } = await loadPendingValuesNavigationModule();
  assert.equal(typeof resolveValuesSelectionFromPendingNavigation, 'function');

  assert.deepEqual(
    resolveValuesSelectionFromPendingNavigation?.({
      keys: ['alpha', 'beta'],
      selectedKey: null,
      pendingKey: null,
      suppressAutoSelectOnce: true,
    }),
    {
      nextSelectedKey: null,
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: false,
    },
  );
});
