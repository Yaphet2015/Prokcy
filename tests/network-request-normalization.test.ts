import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRequestSummary,
  normalizeRequestDetail,
} from '../src/features/network/utils/requestNormalization.ts';

const SAMPLE_ITEM = {
  id: 'req-1',
  url: 'https://example.com/api',
  req: {
    method: 'post',
    headers: { 'content-type': 'application/json' },
    base64: Buffer.from('{"hello":"world"}', 'utf8').toString('base64'),
  },
  res: {
    statusCode: 200,
    statusMessage: 'OK',
    headers: { 'content-type': 'application/json' },
    base64: Buffer.from('{"ok":true}', 'utf8').toString('base64'),
    size: 11,
  },
  rules: { host: { value: '127.0.0.1' } },
  startTime: Date.now() - 100,
  dnsTime: Date.now() - 90,
  requestTime: Date.now() - 60,
  responseTime: Date.now() - 30,
  endTime: Date.now(),
};

test('normalizeRequestSummary strips request/response bodies to avoid memory retention', () => {
  const normalized = normalizeRequestSummary(SAMPLE_ITEM);

  assert.ok(normalized);
  assert.equal(normalized.requestBody, null);
  assert.equal(normalized.response, null);
  assert.equal(normalized.method, 'POST');
  assert.equal(normalized.status, 200);
});

test('normalizeRequestDetail decodes bodies for selected request only', () => {
  const normalized = normalizeRequestDetail(SAMPLE_ITEM);

  assert.ok(normalized);
  assert.equal(normalized.requestBody?.content, '{"hello":"world"}');
  assert.equal(normalized.response?.body, '{"ok":true}');
  assert.equal(normalized.response?.size, 11);
});

test('normalizeRequestDetail truncates oversized text body', () => {
  const hugeText = 'a'.repeat(400_000);
  const item = {
    ...SAMPLE_ITEM,
    res: {
      ...SAMPLE_ITEM.res,
      headers: { 'content-type': 'text/plain' },
      base64: Buffer.from(hugeText, 'utf8').toString('base64'),
      size: hugeText.length,
    },
  };

  const normalized = normalizeRequestDetail(item);

  assert.ok(normalized);
  assert.equal(normalized.response?.body, '[Response body omitted: too large]');
});
