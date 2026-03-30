import test from 'node:test';
import assert from 'node:assert/strict';

type ServicesModule = {
  createMonacoOverrideServices?: () => Record<string, unknown>;
};

let servicesModulePromise: Promise<ServicesModule> | null = null;

async function loadServicesModule(): Promise<ServicesModule> {
  if (!servicesModulePromise) {
    servicesModulePromise = import('../src/shared/ui/monaco-services.ts')
      .then((module) => module as ServicesModule)
      .catch(() => ({}));
  }

  return servicesModulePromise;
}

test('createMonacoOverrideServices provides a minimal productService stub', async () => {
  const { createMonacoOverrideServices } = await loadServicesModule();
  assert.equal(typeof createMonacoOverrideServices, 'function');

  const services = createMonacoOverrideServices?.();
  assert.ok(services);
  assert.deepEqual(services?.productService, { quality: 'stable' });
});
