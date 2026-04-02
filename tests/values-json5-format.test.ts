import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatValueJson5,
  InvalidValueJson5Error,
} from '../src/features/values/utils/valueJson5.ts';

test('formatValueJson5 formats valid JSON5 with trailing commas', () => {
  const formatted = formatValueJson5('{"name":"Prokcy","items":[1,2,],}');

  assert.equal(formatted, '{\n  "name": "Prokcy",\n  "items": [\n    1,\n    2,\n  ],\n}');
});

test('formatValueJson5 preserves comments while normalizing indentation', () => {
  const formatted = formatValueJson5('{// comment\n"enabled":true,\n}');

  assert.match(formatted, /\/\/ comment/);
  assert.match(formatted, /"enabled": true/);
  assert.match(formatted, /\n}/);
});

test('formatValueJson5 throws InvalidValueJson5Error for invalid JSON5', () => {
  assert.throws(
    () => formatValueJson5('{'),
    (error: unknown) => {
      assert.ok(error instanceof InvalidValueJson5Error);
      assert.match(error.message, /CloseBraceExpected/);
      return true;
    },
  );
});
