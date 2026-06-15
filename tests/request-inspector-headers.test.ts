import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRawHttpRequest,
  getHeaderValue,
  getHeaderValues,
  parseRequestCookies,
  parseResponseSetCookies,
} from '../src/features/network/components/request-inspector/headerDetails.ts';

test('getHeaderValue finds headers case-insensitively', () => {
  const headers = {
    Cookie: 'a=1; b=2',
    'X-Multi': ['one', 'two'],
  };

  assert.equal(getHeaderValue(headers, 'cookie'), 'a=1; b=2');
  assert.deepEqual(getHeaderValues(headers, 'x-multi'), ['one', 'two']);
});

test('parseRequestCookies keeps raw cookie values', () => {
  const cookies = parseRequestCookies('a=1; token=abc=def; empty=');

  assert.deepEqual(cookies, [
    { name: 'a', value: '1' },
    { name: 'token', value: 'abc=def' },
    { name: 'empty', value: '' },
  ]);
});

test('parseResponseSetCookies preserves each set-cookie header without comma splitting', () => {
  const cookies = parseResponseSetCookies([
    'session=abc; Path=/; HttpOnly; SameSite=Lax',
    'prefs=hello,world; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
  ]);

  assert.equal(cookies.length, 2);
  assert.deepEqual(cookies[0], {
    name: 'session',
    value: 'abc',
    attributes: ['Path=/', 'HttpOnly', 'SameSite=Lax'],
    raw: 'session=abc; Path=/; HttpOnly; SameSite=Lax',
  });
  assert.equal(cookies[1].name, 'prefs');
  assert.equal(cookies[1].value, 'hello,world');
  assert.deepEqual(cookies[1].attributes, ['Expires=Wed, 21 Oct 2026 07:28:00 GMT']);

  const singleExpiresCookie = parseResponseSetCookies(
    'expires_cookie=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
  );
  assert.equal(singleExpiresCookie.length, 1);
});

test('buildRawHttpRequest reconstructs request line, headers, blank line, and body', () => {
  const raw = buildRawHttpRequest({
    id: 'req-raw',
    method: 'POST',
    url: 'https://example.com/api',
    httpVersion: '1.1',
    status: 200,
    statusText: 'OK',
    size: 0,
    timings: {
      dns: 0,
      tcp: 0,
      tls: 0,
      ttfb: 0,
      download: 0,
      total: 0,
    },
    headers: {
      request: {
        Host: 'example.com',
        'content-type': 'text/plain',
        'x-test': ['one', 'two'],
      },
      response: {},
    },
    requestBody: {
      content: 'content xxxx',
      headers: {},
    },
    response: null,
    rules: {},
    sortTime: 0,
  });

  assert.equal(
    raw,
    [
      'POST https://example.com/api HTTP/1.1',
      'Host: example.com',
      'content-type: text/plain',
      'x-test: one',
      'x-test: two',
      '',
      'content xxxx',
    ].join('\r\n'),
  );
});
