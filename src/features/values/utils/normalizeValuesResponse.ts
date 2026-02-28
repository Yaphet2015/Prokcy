type ValuesMap = Record<string, string>;

interface ValuesListItem {
  name?: unknown;
  data?: unknown;
}

interface ValuesEnvelope {
  ec?: unknown;
  message?: unknown;
  list?: unknown;
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
}

export function normalizeValuesResponse(payload: unknown): ValuesMap {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const envelope = payload as ValuesEnvelope;
  if (typeof envelope.ec === 'number' && envelope.ec !== 0) {
    const message = typeof envelope.message === 'string'
      ? envelope.message
      : `API error: ${envelope.ec}`;
    throw new Error(message);
  }

  if (Array.isArray(envelope.list)) {
    const result: ValuesMap = {};
    envelope.list.forEach((item) => {
      const entry = item as ValuesListItem;
      if (entry && typeof entry.name === 'string') {
        result[entry.name] = toStringValue(entry.data);
      }
    });
    return result;
  }

  const result: ValuesMap = {};
  Object.entries(payload as Record<string, unknown>).forEach(([key, value]) => {
    result[key] = toStringValue(value);
  });
  return result;
}

