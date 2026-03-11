import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCachedLoader,
  scheduleMonacoWarmup,
  resetMonacoWarmupStateForTests,
} from '../src/shared/ui/monaco-loader.ts';

test('createCachedLoader only invokes importer once and shares the same promise', async () => {
  let calls = 0;
  const loader = createCachedLoader(async () => {
    calls += 1;
    return { default: 'loaded' };
  });

  const [first, second] = await Promise.all([loader(), loader()]);

  assert.equal(calls, 1);
  assert.equal(first.default, 'loaded');
  assert.equal(second.default, 'loaded');
  assert.equal(first, second);
});

test('scheduleMonacoWarmup waits for first paint, then idle, and schedules only once', () => {
  resetMonacoWarmupStateForTests();

  const events: string[] = [];
  let warmups = 0;
  let rafCallback: FrameRequestCallback | undefined;
  let idleCallback: IdleRequestCallback | undefined;

  const cleanup = scheduleMonacoWarmup(
    () => {
      warmups += 1;
    },
    {
      requestAnimationFrame: (callback) => {
        events.push('raf');
        rafCallback = callback;
        return 1;
      },
      cancelAnimationFrame: () => {},
      requestIdleCallback: (callback) => {
        events.push('idle');
        idleCallback = callback;
        return 2;
      },
      cancelIdleCallback: () => {},
      setTimeout: () => {
        throw new Error('setTimeout fallback should not be used when requestIdleCallback exists');
      },
      clearTimeout: () => {},
    },
  );

  scheduleMonacoWarmup(() => {
    warmups += 1;
  }, {
    requestAnimationFrame: () => {
      throw new Error('warmup should only schedule once');
    },
    cancelAnimationFrame: () => {},
    requestIdleCallback: () => {
      throw new Error('warmup should only schedule once');
    },
    cancelIdleCallback: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
  });

  assert.deepEqual(events, ['raf']);
  assert.equal(warmups, 0);

  rafCallback?.(0);
  assert.deepEqual(events, ['raf', 'idle']);
  assert.equal(warmups, 0);

  idleCallback?.({
    didTimeout: false,
    timeRemaining: () => 16,
  } as IdleDeadline);

  assert.equal(warmups, 1);
  cleanup();
});
