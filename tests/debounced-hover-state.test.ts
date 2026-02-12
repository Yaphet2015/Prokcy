import test from 'node:test';
import assert from 'node:assert/strict';

import { createDebouncedHoverState } from '../src/features/network/utils/debouncedHoverState.ts';

// Node tests do not have a DOM window; provide the timer surface used by the util.
if (!(globalThis as { window?: typeof globalThis }).window) {
  (globalThis as { window?: typeof globalThis }).window = globalThis;
}

test('createDebouncedHoverState setNow updates immediately', () => {
  let current = 'initial';
  const hoverState = createDebouncedHoverState((next) => {
    current = next;
  }, 30);

  hoverState.setNow('request-1');
  assert.equal(current, 'request-1');
});

test('createDebouncedHoverState debounces intermediate values', async () => {
  let current = null;
  const hoverState = createDebouncedHoverState((next) => {
    current = next;
  }, 40);

  hoverState.schedule('request-1');
  await new Promise((resolve) => setTimeout(resolve, 20));
  hoverState.schedule('request-2');

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(current, null);

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(current, 'request-2');
});

test('createDebouncedHoverState cancel prevents pending updates', async () => {
  let current = null;
  const hoverState = createDebouncedHoverState((next) => {
    current = next;
  }, 30);

  hoverState.schedule('request-1');
  hoverState.cancel();

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(current, null);
});

test('createDebouncedHoverState setNow cancels pending scheduled update', async () => {
  let current = 'request-1';
  const hoverState = createDebouncedHoverState((next) => {
    current = next;
  }, 30);

  hoverState.schedule(null);
  hoverState.setNow('request-2');

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(current, 'request-2');
});
