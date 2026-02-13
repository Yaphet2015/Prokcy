import test from 'node:test';
import assert from 'node:assert/strict';

import {
  matchesFilterPatterns,
  filterRequestsByPatterns,
} from '../src/shared/utils/patternMatch.ts';

test('matches plain host pattern against request URL hostname', () => {
  assert.equal(
    matchesFilterPatterns('https://brook.pdd.net/api/v1/ping', ['brook.pdd.net']),
    true,
  );
});

test('matches path-only pattern against request URL pathname', () => {
  assert.equal(
    matchesFilterPatterns('https://example.com/api/health/check', ['/api/health*']),
    true,
  );
});

test('matches wildcard pattern against full URL', () => {
  assert.equal(
    matchesFilterPatterns('https://example.com/v1/analytics/beacon', ['*/analytics/*']),
    true,
  );
});

test('does not match unrelated hostname', () => {
  assert.equal(
    matchesFilterPatterns('https://api.pdd.net/data', ['brook.pdd.net']),
    false,
  );
});

test('filterRequestsByPatterns prunes already-captured requests when patterns change', () => {
  const requests = [
    { id: '1', url: 'https://brook.pdd.net/api/v1/ping' },
    { id: '2', url: 'https://example.com/ok' },
  ] as Array<{ id: string; url: string }>;

  const filtered = filterRequestsByPatterns(requests, ['brook.pdd.net']);

  assert.deepEqual(filtered, [{ id: '2', url: 'https://example.com/ok' }]);
});
