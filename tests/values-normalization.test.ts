import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeValuesResponse } from '../src/features/values/utils/normalizeValuesResponse.ts';

test('normalizes whistle values envelope list to key-value map', () => {
  const normalized = normalizeValuesResponse({
    ec: 0,
    list: [
      { name: 'alpha', data: '{"a":1}' },
      { name: 'beta', data: 123 },
    ],
  });

  assert.deepEqual(normalized, {
    alpha: '{"a":1}',
    beta: '123',
  });
});

test('throws when envelope contains API error code', () => {
  assert.throws(
    () => normalizeValuesResponse({ ec: 1, message: 'Service not running' }),
    /Service not running/,
  );
});

test('falls back to plain object normalization', () => {
  const normalized = normalizeValuesResponse({
    foo: 'bar',
    count: 5,
  });

  assert.deepEqual(normalized, {
    foo: 'bar',
    count: '5',
  });
});

