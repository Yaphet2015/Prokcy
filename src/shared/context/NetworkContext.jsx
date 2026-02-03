import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useService } from './ServiceContext';

const NetworkContext = createContext({
  requests: [],
  selectedRequest: null,
  filters: {},
  searchQuery: '',
  isConnected: false,
  isStreaming: false,
  selectRequest: () => {},
  setFilters: () => {},
  setSearchQuery: () => {},
  clearRequests: () => {},
  refreshRequests: () => {},
});

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '8888';
const POLL_INTERVAL = 1000;
const MAX_RECONNECT_DELAY = 30000;
const FETCH_COUNT = 120;
const TRACKED_IDS_COUNT = 200;
const MAX_REQUESTS = 500;

function toStringValue(value, fallback = '') {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return String(value);
}

function getHeaderValue(headers, name) {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const target = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === target);
  if (!key) {
    return '';
  }
  const value = headers[key];
  return Array.isArray(value) ? value.join(', ') : toStringValue(value, '');
}

function estimateBase64Size(base64) {
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

function decodeBase64ToText(base64) {
  if (!base64 || typeof base64 !== 'string') {
    return '';
  }
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function clamp(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getTimings(item) {
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

function normalizeRequest(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id = toStringValue(item.id, '');
  if (!id) {
    return null;
  }

  const requestHeaders = item.req?.headers && typeof item.req.headers === 'object' ? item.req.headers : {};
  const responseHeaders = item.res?.headers && typeof item.res.headers === 'object' ? item.res.headers : {};
  const responseContentType = getHeaderValue(responseHeaders, 'content-type');

  const requestBodyText = decodeBase64ToText(item.req?.base64);
  const responseBodyBase64 = toStringValue(item.res?.base64, '');
  const responseBody = responseContentType.startsWith('image/')
    ? responseBodyBase64
    : decodeBase64ToText(responseBodyBase64);

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
    requestBody: requestBodyText
      ? {
          content: requestBodyText,
          headers: requestHeaders,
        }
      : null,
    response: item.res
      ? {
          body: responseBody,
          headers: responseHeaders,
          size: responseSize,
        }
      : null,
    _sortTime: Number(item.startTime) || Date.now(),
  };
}

function mergeRequests(previous, incoming) {
  if (!incoming.length) {
    return previous;
  }

  const merged = new Map(previous.map((req) => [req.id, req]));
  incoming.forEach((req) => {
    merged.set(req.id, req);
  });

  return Array.from(merged.values())
    .sort((a, b) => b._sortTime - a._sortTime)
    .slice(0, MAX_REQUESTS);
}

async function getRuntimeConfig() {
  if (!window.electron?.getRuntimeConfig) {
    return {
      running: false,
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      username: '',
      password: '',
    };
  }

  try {
    const config = await window.electron.getRuntimeConfig();
    return {
      running: !!config?.running,
      host: toStringValue(config?.host, DEFAULT_HOST),
      port: toStringValue(config?.port, DEFAULT_PORT),
      username: toStringValue(config?.username, ''),
      password: toStringValue(config?.password, ''),
    };
  } catch (error) {
    console.error('Failed to load runtime config:', error);
    return {
      running: false,
      host: DEFAULT_HOST,
      port: DEFAULT_PORT,
      username: '',
      password: '',
    };
  }
}

export function NetworkProvider({ children }) {
  const { isApiAvailable } = useService();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFiltersState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const requestsRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const lastIdRef = useRef('');

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    setSelectedRequest((prev) => {
      if (!prev) {
        return prev;
      }
      const updated = requests.find((req) => req.id === prev.id);
      return updated || null;
    });
  }, [requests]);

  const fetchNetworkData = useCallback(async ({ initial = false } = {}) => {
    const config = await getRuntimeConfig();

    if (!config.running) {
      setIsConnected(false);
      setIsStreaming(false);
      return;
    }

    const params = new URLSearchParams();
    params.set('count', String(FETCH_COUNT));

    if (!initial && lastIdRef.current) {
      params.set('startTime', lastIdRef.current);
    }

    const trackedIds = requestsRef.current
      .slice(0, TRACKED_IDS_COUNT)
      .map((request) => request.id)
      .join(',');

    if (trackedIds) {
      params.set('ids', trackedIds);
    }

    const payload = window.electron?.getNetworkData
      ? await window.electron.getNetworkData(Object.fromEntries(params.entries()))
      : await (async () => {
          const response = await fetch(`http://${config.host}:${config.port}/cgi-bin/get-data?${params.toString()}`);
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return response.json();
        })();
    if (payload?.ec && payload.ec !== 0) {
      throw new Error(`API error: ${payload.ec}`);
    }

    const data = payload?.data;
    const dataMap = data?.data && typeof data.data === 'object' ? data.data : {};
    const incoming = Object.values(dataMap)
      .map(normalizeRequest)
      .filter(Boolean);

    setRequests((prev) => mergeRequests(prev, incoming));

    const nextLastId = toStringValue(data?.lastId || data?.endId, '');
    if (nextLastId) {
      lastIdRef.current = nextLastId;
    }

    setIsConnected(true);
    setIsStreaming(true);
  }, []);

  const refreshRequests = useCallback(async () => {
    lastIdRef.current = '';
    await fetchNetworkData({ initial: true });
  }, [fetchNetworkData]);

  const clearRequests = useCallback(() => {
    lastIdRef.current = '';
    setRequests([]);
    setSelectedRequest(null);
  }, []);

  useEffect(() => {
    if (!isApiAvailable) {
      setIsConnected(false);
      setIsStreaming(false);
      return;
    }

    let stopped = false;

    const scheduleReconnect = () => {
      const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current), MAX_RECONNECT_DELAY);
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!stopped) {
          poll(false);
        }
      }, delay);
    };

    const poll = async (initial) => {
      try {
        await fetchNetworkData({ initial });
        reconnectAttemptsRef.current = 0;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!stopped) {
            poll(false);
          }
        }, POLL_INTERVAL);
      } catch (error) {
        console.error('Failed to fetch network requests:', error);
        setIsConnected(false);
        setIsStreaming(false);
        scheduleReconnect();
      }
    };

    poll(true);

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchNetworkData, isApiAvailable]);

  const selectRequest = useCallback((request) => {
    setSelectedRequest(request);
  }, []);

  const setFilters = useCallback((newFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const value = useMemo(() => ({
    requests,
    selectedRequest,
    filters,
    searchQuery,
    isConnected,
    isStreaming,
    selectRequest,
    setFilters,
    setSearchQuery,
    clearRequests,
    refreshRequests,
  }), [
    requests,
    selectedRequest,
    filters,
    searchQuery,
    isConnected,
    isStreaming,
    selectRequest,
    setFilters,
    setSearchQuery,
    clearRequests,
    refreshRequests,
  ]);

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

NetworkContext.displayName = 'NetworkContext';
