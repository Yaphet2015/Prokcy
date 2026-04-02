import test from 'node:test';
import assert from 'node:assert/strict';

import {
  InvalidValueJson5Error,
  persistValuesSave,
  prepareValuesForSave,
} from '../src/features/values/utils/valueJson5.ts';

test('prepareValuesForSave formats only dirty values before persistence', () => {
  const next = prepareValuesForSave({
    values: {
      alpha: '{"keep":"same"}',
      beta: '{"items":[1,2,],}',
    },
    originalValues: {
      alpha: '{"keep":"same"}',
      beta: '{}',
    },
  });

  assert.deepEqual(next.dirtyKeys, ['beta']);
  assert.deepEqual(next.values, {
    alpha: '{"keep":"same"}',
    beta: '{\n  "items": [\n    1,\n    2,\n  ],\n}',
  });
});

test('prepareValuesForSave aborts the whole save when one dirty value is invalid', () => {
  assert.throws(
    () => prepareValuesForSave({
      values: {
        alpha: '{"valid":true}',
        beta: '{',
      },
      originalValues: {
        alpha: '{}',
        beta: '{}',
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidValueJson5Error);
      assert.equal(error.key, 'beta');
      return true;
    },
  );
});

test('persistValuesSave does not call persistence APIs when one dirty value is invalid', async () => {
  const deletedKeys: string[] = [];
  const savedEntries: Array<[string, string]> = [];

  await assert.rejects(
    () => persistValuesSave({
      values: {
        alpha: '{"valid":true}',
        beta: '{',
      },
      originalValues: {
        alpha: '{}',
        beta: '{}',
      },
      deleteValue: async (key) => {
        deletedKeys.push(key);
      },
      setValue: async (key, value) => {
        savedEntries.push([key, value]);
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidValueJson5Error);
      assert.equal(error.key, 'beta');
      return true;
    },
  );

  assert.deepEqual(deletedKeys, []);
  assert.deepEqual(savedEntries, []);
});

test('persistValuesSave formats dirty values before persistence', async () => {
  const savedEntries: Array<[string, string]> = [];

  const nextValues = await persistValuesSave({
    values: {
      alpha: '{"keep":"same"}',
      beta: '{"items":[1,2,],}',
    },
    originalValues: {
      alpha: '{"keep":"same"}',
      beta: '{}',
    },
    deleteValue: async () => {},
    setValue: async (key, value) => {
      savedEntries.push([key, value]);
    },
  });

  assert.deepEqual(savedEntries, [[
    'beta',
    '{\n  "items": [\n    1,\n    2,\n  ],\n}',
  ]]);
  assert.deepEqual(nextValues, {
    alpha: '{"keep":"same"}',
    beta: '{\n  "items": [\n    1,\n    2,\n  ],\n}',
  });
});
