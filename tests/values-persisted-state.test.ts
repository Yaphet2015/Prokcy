import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPersistedValueState,
  deletePersistedValueState,
  renamePersistedValueState,
} from '../src/features/values/utils/persistedState.ts';

test('create persists the new key without clearing unrelated dirty drafts', () => {
  const next = createPersistedValueState({
    values: {
      alpha: '{',
    },
    originalValues: {
      alpha: '{}',
    },
    key: 'beta',
    value: '{}',
  });

  assert.deepEqual(next.values, {
    alpha: '{',
    beta: '{}',
  });
  assert.deepEqual(next.originalValues, {
    alpha: '{}',
    beta: '{}',
  });
  assert.equal(next.isDirty, true);
});

test('delete removes the key from both snapshots without clearing unrelated dirty drafts', () => {
  const next = deletePersistedValueState({
    values: {
      alpha: '{"edited":true}',
      beta: '{}',
    },
    originalValues: {
      alpha: '{}',
      beta: '{}',
    },
    key: 'beta',
  });

  assert.deepEqual(next.values, {
    alpha: '{"edited":true}',
  });
  assert.deepEqual(next.originalValues, {
    alpha: '{}',
  });
  assert.equal(next.isDirty, true);
});

test('delete discards dirty drafts for the deleted key and clears dirty when nothing else changed', () => {
  const next = deletePersistedValueState({
    values: {
      alpha: '{',
    },
    originalValues: {
      alpha: '{}',
    },
    key: 'alpha',
  });

  assert.deepEqual(next.values, {});
  assert.deepEqual(next.originalValues, {});
  assert.equal(next.isDirty, false);
});

test('rename persists the current value under the new key without leaving dirty residue for the old key', () => {
  const next = renamePersistedValueState({
    values: {
      alpha: '{"edited":true}',
    },
    originalValues: {
      alpha: '{}',
    },
    oldKey: 'alpha',
    newKey: 'beta',
  });

  assert.deepEqual(next.values, {
    beta: '{"edited":true}',
  });
  assert.deepEqual(next.originalValues, {
    beta: '{"edited":true}',
  });
  assert.equal(next.isDirty, false);
});
