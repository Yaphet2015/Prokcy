import type { HeaderValue, HeadersRecord, NormalizedRequest } from '../../utils/requestNormalization';

export interface ParsedCookie {
  name: string;
  value: string;
}

export interface ParsedSetCookie extends ParsedCookie {
  attributes: string[];
  raw: string;
}

export interface HeaderRow {
  name: string;
  value: string;
}

function toHeaderValues(value: HeaderValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value == null) {
    return [];
  }
  return [String(value)];
}

export function getHeaderValues(headers: HeadersRecord | undefined, name: string): string[] {
  if (!headers || typeof headers !== 'object') {
    return [];
  }

  const target = name.toLowerCase();
  const key = Object.keys(headers).find((headerName) => headerName.toLowerCase() === target);
  return key ? toHeaderValues(headers[key]) : [];
}

export function getHeaderValue(headers: HeadersRecord | undefined, name: string): string {
  return getHeaderValues(headers, name).join(', ');
}

function parseNameValue(raw: string): ParsedCookie | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) {
    return { name: trimmed, value: '' };
  }

  const name = trimmed.slice(0, separatorIndex).trim();
  if (!name) {
    return null;
  }

  return {
    name,
    value: trimmed.slice(separatorIndex + 1).trim(),
  };
}

export function parseRequestCookies(cookieHeader: HeaderValue | undefined): ParsedCookie[] {
  return toHeaderValues(cookieHeader)
    .flatMap((value) => value.split(';'))
    .map(parseNameValue)
    .filter((cookie): cookie is ParsedCookie => cookie !== null);
}

export function parseResponseSetCookies(setCookieHeader: HeaderValue | undefined): ParsedSetCookie[] {
  return toHeaderValues(setCookieHeader)
    .map((raw) => {
      const parts = raw.split(';').map((part) => part.trim()).filter(Boolean);
      const cookie = parseNameValue(parts[0] ?? '');
      if (!cookie) {
        return null;
      }

      return {
        ...cookie,
        attributes: parts.slice(1),
        raw,
      };
    })
    .filter((cookie): cookie is ParsedSetCookie => cookie !== null);
}

export function getHeaderRows(headers: HeadersRecord | undefined): HeaderRow[] {
  if (!headers || typeof headers !== 'object') {
    return [];
  }

  return Object.entries(headers).flatMap(([name, value]) =>
    toHeaderValues(value).map((headerValue) => ({ name, value: headerValue })));
}

export function buildRawHttpRequest(request: NormalizedRequest | null): string {
  if (!request) {
    return '';
  }

  const lines = [
    `${request.method || 'GET'} ${request.url || '/'} HTTP/${request.httpVersion || '1.1'}`,
    ...getHeaderRows(request.headers.request).map(({ name, value }) => `${name}: ${value}`),
    '',
  ];
  const body = request.requestBody?.content ?? '';

  return body ? [...lines, body].join('\r\n') : lines.join('\r\n');
}
