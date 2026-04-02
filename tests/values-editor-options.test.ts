import test from 'node:test';
import assert from 'node:assert/strict';

import { VALUE_EDITOR_OPTIONS } from '../src/features/values/utils/valueEditorOptions.ts';

test('ValueEditor disables format on type and paste while editing', () => {
  assert.equal(VALUE_EDITOR_OPTIONS.formatOnType, false);
  assert.equal(VALUE_EDITOR_OPTIONS.formatOnPaste, false);
});
