import test from 'node:test';
import assert from 'node:assert/strict';
import type { NormalizedRequest } from '../src/shared/context/NetworkContext.tsx';
import { mergeRequestWithDetail, mergeRequests } from '../src/shared/context/NetworkContext.tsx';

function createRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    id: 'req-1',
    method: 'POST',
    url: 'https://example.com/api',
    status: 200,
    statusText: 'OK',
    size: 128,
    timings: {
      dns: 1,
      tcp: 2,
      tls: 0,
      ttfb: 3,
      download: 4,
      total: 10,
    },
    headers: {
      request: { 'content-type': 'application/json' },
      response: { 'content-type': 'application/json' },
    },
    requestBody: null,
    response: null,
    rules: {
      style: { value: 'bg-color:#f0f9ff' },
    },
    sortTime: 1000,
    ...overrides,
  };
}

test('mergeRequests preserves URL and rich fields for partial tracked updates', () => {
  const previous = [
    createRequest(),
  ];
  const partialIncoming = [
    createRequest({
      url: '',
      method: 'GET',
      status: 0,
      statusText: '',
      size: 0,
      timings: {
        dns: 0, tcp: 0, tls: 0, ttfb: 0, download: 0, total: 0,
      },
      headers: { request: {}, response: {} },
      rules: {},
      sortTime: 0,
    }),
  ];

  const merged = mergeRequests(previous, partialIncoming, 10);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].url, 'https://example.com/api');
  assert.equal(merged[0].status, 200);
  assert.equal(merged[0].headers.request['content-type'], 'application/json');
});

test('mergeRequestWithDetail restores headers/rules from detail payload', () => {
  const summary = createRequest({
    headers: { request: {}, response: {} },
    rules: {},
  });
  const detail = createRequest({
    headers: {
      request: { authorization: 'token' },
      response: { server: 'nginx' },
    },
    rules: {
      host: { value: '127.0.0.1' },
    },
    requestBody: {
      content: '{"x":1}',
      headers: { 'content-type': 'application/json' },
    },
  });

  const merged = mergeRequestWithDetail(summary, detail);
  assert.equal(merged.headers.request.authorization, 'token');
  assert.equal((merged.rules as { host?: { value?: string } }).host?.value, '127.0.0.1');
  assert.equal(merged.requestBody?.content, '{"x":1}');
});
