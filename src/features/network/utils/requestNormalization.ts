export interface RequestTimings {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

export interface NormalizedRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  size: number;
  timings: RequestTimings;
  headers: {
    request: Record<string, string>;
    response: Record<string, string>;
  };
  requestBody: {
    content: string;
    headers: Record<string, string>;
  } | null;
  response: {
    body: string;
    headers: Record<string, string>;
    size: number;
  } | null;
  rules: Record<string, unknown>;
  sortTime: number;
}

export interface RawRequestItem {
  id?: string;
  url?: string;
  req?: {
    method?: string;
    headers?: Record<string, string>;
    base64?: string;
  };
  res?: {
    statusCode?: number;
    statusMessage?: string;
    headers?: Record<string, string>;
    base64?: string;
    size?: number;
  };
  startTime?: number;
  dnsTime?: number;
  requestTime?: number;
  responseTime?: number;
  endTime?: number;
  rules?: Record<string, unknown>;
}

interface TimingItem {
  startTime?: number;
  dnsTime?: number;
  requestTime?: number;
  responseTime?: number;
  endTime?: number;
}

interface DecodeResult {
  text: string;
  omitted: boolean;
}

const MAX_DETAIL_TEXT_BODY_BYTES = 256 * 1024;
const MAX_DETAIL_IMAGE_BASE64_CHARS = 512 * 1024;

export const OMITTED_REQUEST_BODY_MESSAGE = '[Request body omitted: too large]';
export const OMITTED_RESPONSE_BODY_MESSAGE = '[Response body omitted: too large]';

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return String(value);
}

function getHeaderValue(headers: Record<string, string> | undefined, name: string): string {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const target = name.toLowerCase();
  const key = Object.keys(headers).find((headerName) => headerName.toLowerCase() === target);
  if (!key) {
    return '';
  }
  const value = headers[key];
  return Array.isArray(value) ? value.join(', ') : toStringValue(value, '');
}

function estimateBase64Size(base64: unknown): number {
  if (!base64 || typeof base64 !== 'string') {
    return 0;
  }
  let padding = 0;
  if (base64.endsWith('==')) {
    padding = 2;
  } else if (base64.endsWith('=')) {
    padding = 1;
  }
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

function decodeBase64ToText(base64: unknown, maxBytes = 0): DecodeResult {
  if (!base64 || typeof base64 !== 'string') {
    return { text: '', omitted: false };
  }

  if (maxBytes > 0 && estimateBase64Size(base64) > maxBytes) {
    return { text: '', omitted: true };
  }

  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    if (maxBytes > 0 && bytes.length > maxBytes) {
      return { text: '', omitted: true };
    }
    return {
      text: new TextDecoder('utf-8').decode(bytes),
      omitted: false,
    };
  } catch {
    return { text: '', omitted: false };
  }
}

function clamp(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getTimings(item: TimingItem): RequestTimings {
  const now = Date.now();
  const start = Number(item?.startTime) || now;
  const dnsTime = Number(item?.dnsTime) || start;
  const requestTime = Number(item?.requestTime) || dnsTime;
  const responseTime = Number(item?.responseTime) || requestTime;
  const endTime = Number(item?.endTime) || now;

  const dns = clamp(dnsTime - start);
  const tcp = clamp(requestTime - dnsTime);
  const ttfb = clamp(responseTime - requestTime);
  const download = clamp(endTime - responseTime);
  const total = clamp(endTime - start);

  return {
    dns,
    tcp,
    tls: 0,
    ttfb,
    download,
    total,
  };
}

function getCommonFields(item: RawRequestItem): Omit<NormalizedRequest, 'requestBody' | 'response'> | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id = toStringValue(item.id, '');
  if (!id) {
    return null;
  }

  const requestHeaders = item.req?.headers && typeof item.req.headers === 'object' ? item.req.headers : {};
  const responseHeaders = item.res?.headers && typeof item.res.headers === 'object' ? item.res.headers : {};
  const responseBodyBase64 = toStringValue(item.res?.base64, '');
  const responseSize = Number(item.res?.size) || estimateBase64Size(responseBodyBase64);

  return {
    id,
    method: toStringValue(item.req?.method, 'GET').toUpperCase(),
    url: toStringValue(item.url, ''),
    status: Number(item.res?.statusCode) || 0,
    statusText: toStringValue(item.res?.statusMessage, ''),
    size: responseSize,
    timings: getTimings(item),
    headers: {
      request: requestHeaders,
      response: responseHeaders,
    },
    rules: item.rules || {},
    sortTime: Number(item.startTime) || Date.now(),
  };
}

export function normalizeRequestSummary(item: RawRequestItem): NormalizedRequest | null {
  const common = getCommonFields(item);
  if (!common) {
    return null;
  }

  return {
    ...common,
    requestBody: null,
    response: null,
  };
}

export function normalizeRequestDetail(item: RawRequestItem): NormalizedRequest | null {
  const common = getCommonFields(item);
  if (!common) {
    return null;
  }

  const requestBodyDecoded = decodeBase64ToText(item.req?.base64, MAX_DETAIL_TEXT_BODY_BYTES);
  const requestBody = requestBodyDecoded.omitted
    ? OMITTED_REQUEST_BODY_MESSAGE
    : requestBodyDecoded.text;

  const responseHeaders = common.headers.response;
  const responseContentType = getHeaderValue(responseHeaders, 'content-type');
  const responseBodyBase64 = toStringValue(item.res?.base64, '');

  let responseBody = '';
  if (responseContentType.startsWith('image/')) {
    responseBody = responseBodyBase64.length > MAX_DETAIL_IMAGE_BASE64_CHARS
      ? OMITTED_RESPONSE_BODY_MESSAGE
      : responseBodyBase64;
  } else {
    const decoded = decodeBase64ToText(responseBodyBase64, MAX_DETAIL_TEXT_BODY_BYTES);
    responseBody = decoded.omitted ? OMITTED_RESPONSE_BODY_MESSAGE : decoded.text;
  }

  return {
    ...common,
    requestBody: requestBody
      ? {
        content: requestBody,
        headers: common.headers.request,
      }
      : null,
    response: item.res
      ? {
        body: responseBody,
        headers: responseHeaders,
        size: common.size,
      }
      : null,
  };
}
