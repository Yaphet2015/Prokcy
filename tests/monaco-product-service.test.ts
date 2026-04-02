import test from 'node:test';
import assert from 'node:assert/strict';

import { getSingletonServiceDescriptors } from 'monaco-editor/esm/vs/platform/instantiation/common/extensions.js';

type MonacoProductServiceModule = {
  ensureMonacoProductServiceRegistered?: () => void;
};

let monacoProductServiceModulePromise: Promise<MonacoProductServiceModule> | null = null;

async function loadMonacoProductServiceModule(): Promise<MonacoProductServiceModule> {
  if (!monacoProductServiceModulePromise) {
    monacoProductServiceModulePromise = import('../src/shared/ui/monaco-product-service.ts')
      .then((module) => module as MonacoProductServiceModule)
      .catch(() => ({}));
  }

  return monacoProductServiceModulePromise;
}

function countProductServiceDescriptors(): number {
  return getSingletonServiceDescriptors()
    .filter(([serviceId]) => serviceId.toString() === 'productService')
    .length;
}

test('ensureMonacoProductServiceRegistered registers productService once', async () => {
  const { ensureMonacoProductServiceRegistered } = await loadMonacoProductServiceModule();
  assert.equal(typeof ensureMonacoProductServiceRegistered, 'function');

  const beforeCount = countProductServiceDescriptors();
  ensureMonacoProductServiceRegistered?.();
  const afterFirstCallCount = countProductServiceDescriptors();
  ensureMonacoProductServiceRegistered?.();
  const afterSecondCallCount = countProductServiceDescriptors();

  assert.equal(afterFirstCallCount, beforeCount + 1);
  assert.equal(afterSecondCallCount, afterFirstCallCount);
});
