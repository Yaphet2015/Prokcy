import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef,
} from 'react';
import type { ReactNode } from 'react';
import { useService } from './ServiceContext';
import {
  normalizeRequestSummary,
  normalizeRequestDetail,
} from '../../features/network/utils/requestNormalization';
import type {
  RawRequestItem,
  RequestTimings,
  NormalizedRequest,
} from '../../features/network/utils/requestNormalization';
import {
  filterRequestsByPatterns,
  parseFilterPatterns,
} from '../utils/patternMatch';

export type { RequestTimings, NormalizedRequest };

export interface RequestFilter {
  method?: string;
  status?: number;
  search?: string;
}

interface NetworkContextValue {
  requests: NormalizedRequest[];
  selectedRequest: NormalizedRequest | null;
  filters: RequestFilter;
  searchQuery: string;
  isConnected: boolean;
  isStreaming: boolean;
  selectRequest: (request: NormalizedRequest | null) => void;
  setFilters: (filters: Partial<RequestFilter>) => void;
  setSearchQuery: (query: string) => void;
  clearRequests: () => void;
  refreshRequests: () => Promise<void>;
}

// Constants
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '8888';
const ACTIVE_POLL_INTERVAL = 1000;
const INACTIVE_POLL_INTERVAL = 5000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_FETCH_COUNT = 100;
const DEFAULT_FETCH_COUNT = 50;
const MIN_FETCH_COUNT = 10;
const DEFAULT_TRACKED_IDS_COUNT = 50;
const MIN_TRACKED_IDS_COUNT = 0;
const MAX_TRACKED_IDS_COUNT = 200;
const DEFAULT_REQUEST_LIST_LIMIT = 600;
const DETAIL_CACHE_LIMIT = 10;
const DETAIL_CACHE_BYTES_LIMIT = 4 * 1024 * 1024;
const TRACKED_STATUS_TRIM_MARKER = '999999999-999999999';

// Helper functions
function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (value == null) {
    return fallback;
  }
  return String(value);
}

export function mergeRequestWithDetail(
  summary: NormalizedRequest,
  detail: NormalizedRequest
): NormalizedRequest {
  return {
    ...summary,
    headers: detail.headers,
    rules: detail.rules,
    requestBody: detail.requestBody,
    response: detail.response,
  };
}

function mergeSummaryRequest(
  previous: NormalizedRequest,
  incoming: NormalizedRequest,
): NormalizedRequest {
  const isPartial = !incoming.url && !!previous.url;
  if (!isPartial) {
    return incoming;
  }

  const hasIncomingHeaders = Object.keys(incoming.headers.request || {}).length > 0
    || Object.keys(incoming.headers.response || {}).length > 0;
  const hasIncomingRules = Object.keys(incoming.rules || {}).length > 0;

  return {
    ...incoming,
    url: previous.url,
    method: incoming.method || previous.method,
    status: incoming.status || previous.status,
    statusText: incoming.statusText || previous.statusText,
    size: incoming.size || previous.size,
    timings: (incoming.timings?.total || 0) > 0 ? incoming.timings : previous.timings,
    headers: hasIncomingHeaders ? incoming.headers : previous.headers,
    rules: hasIncomingRules ? incoming.rules : previous.rules,
    sortTime: incoming.sortTime || previous.sortTime,
  };
}

export function mergeRequests(
  previous: NormalizedRequest[],
  incoming: NormalizedRequest[],
  maxRequests: number
): NormalizedRequest[] {
  if (!incoming.length) {
    return previous.slice(0, maxRequests);
  }
  const nextById = new Map(previous.slice(0, maxRequests).map((request) => [request.id, request]));

  for (const incomingRequest of incoming) {
    const previousRequest = nextById.get(incomingRequest.id);
    nextById.set(
      incomingRequest.id,
      previousRequest ? mergeSummaryRequest(previousRequest, incomingRequest) : incomingRequest,
    );
  }

  return [...nextById.values()]
    .sort((a, b) => b.sortTime - a.sortTime)
    .slice(0, maxRequests);
}

function normalizeInRange(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function estimateRequestDetailBytes(request: NormalizedRequest): number {
  const requestBodyBytes = request.requestBody?.content.length || 0;
  const responseBodyBytes = request.response?.body.length || 0;
  const requestHeadersBytes = JSON.stringify(request.headers?.request || {}).length;
  const responseHeadersBytes = JSON.stringify(request.headers?.response || {}).length;
  return requestBodyBytes + responseBodyBytes + requestHeadersBytes + responseHeadersBytes;
}

interface NetworkDataPayload {
  data?: {
    data?: Record<string, RawRequestItem>;
    lastId?: string;
    endId?: string;
  };
  ec?: number;
}

function getPayloadData(payload: unknown): NetworkDataPayload['data'] {
  const parsed = payload as NetworkDataPayload;
  if (parsed?.ec && parsed.ec !== 0) {
    throw new Error(`API error: ${parsed.ec}`);
  }
  return parsed?.data;
}

async function getRuntimeConfig(): Promise<{
  running: boolean;
  host: string;
  port: string;
  username: string;
  password: string;
}> {
  // electronWin removed - using window.electron directly
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

// Context definition
const NetworkContext = createContext<NetworkContextValue>({
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
  refreshRequests: async () => {},
});

interface NetworkProviderProps {
  children: ReactNode;
  isActive?: boolean;
}

export function NetworkProvider({
  children,
  isActive = true,
}: NetworkProviderProps): React.JSX.Element {
  const { isApiAvailable } = useService();
  const [requests, setRequests] = useState<NormalizedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NormalizedRequest | null>(null);
  const [filters, setFiltersState] = useState<RequestFilter>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [requestListLimit, setRequestListLimit] = useState(DEFAULT_REQUEST_LIST_LIMIT);
  const [networkPollingCount, setNetworkPollingCount] = useState(DEFAULT_FETCH_COUNT);
  const [trackedRequestIdsLimit, setTrackedRequestIdsLimit] = useState(DEFAULT_TRACKED_IDS_COUNT);

  const requestsRef = useRef<NormalizedRequest[]>([]);
  const requestListLimitRef = useRef(DEFAULT_REQUEST_LIST_LIMIT);
  const networkPollingCountRef = useRef(DEFAULT_FETCH_COUNT);
  const trackedRequestIdsLimitRef = useRef(DEFAULT_TRACKED_IDS_COUNT);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const lastIdRef = useRef('');
  const detailCacheRef = useRef<Map<string, NormalizedRequest>>(new Map());
  const detailCacheBytesRef = useRef<Map<string, number>>(new Map());
  const detailCacheTotalBytesRef = useRef(0);
  const detailFetchTokenRef = useRef(0);
  const filterPatternsRef = useRef<string[]>([]);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  );

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    requestListLimitRef.current = requestListLimit;
  }, [requestListLimit]);

  useEffect(() => {
    networkPollingCountRef.current = networkPollingCount;
  }, [networkPollingCount]);

  useEffect(() => {
    trackedRequestIdsLimitRef.current = trackedRequestIdsLimit;
  }, [trackedRequestIdsLimit]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setRequests((prev) => (prev.length > requestListLimit ? prev.slice(0, requestListLimit) : prev));
  }, [requestListLimit]);

  useEffect(() => {
    setSelectedRequest((prev) => {
      if (!prev) {
        return prev;
      }
      const updated = requests.find((req) => req.id === prev.id);
      if (!updated) {
        return null;
      }
      const detail = detailCacheRef.current.get(updated.id);
      return detail ? mergeRequestWithDetail(updated, detail) : updated;
    });
  }, [requests]);

  const setRequestDetailCache = useCallback((request: NormalizedRequest) => {
    const entryBytes = estimateRequestDetailBytes(request);
    const previousBytes = detailCacheBytesRef.current.get(request.id) || 0;
    detailCacheTotalBytesRef.current -= previousBytes;
    detailCacheRef.current.delete(request.id);
    detailCacheBytesRef.current.delete(request.id);
    detailCacheRef.current.set(request.id, request);
    detailCacheBytesRef.current.set(request.id, entryBytes);
    detailCacheTotalBytesRef.current += entryBytes;

    while (
      detailCacheRef.current.size > DETAIL_CACHE_LIMIT
      || detailCacheTotalBytesRef.current > DETAIL_CACHE_BYTES_LIMIT
    ) {
      const oldestKey = detailCacheRef.current.keys().next().value;
      if (!oldestKey) {
        break;
      }
      detailCacheRef.current.delete(oldestKey);
      const removedBytes = detailCacheBytesRef.current.get(oldestKey) || 0;
      detailCacheBytesRef.current.delete(oldestKey);
      detailCacheTotalBytesRef.current -= removedBytes;
    }
  }, []);

  const applyRequestListLimit = useCallback((value: unknown) => {
    const parsed = Number(value);
    const nextLimit = Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_REQUEST_LIST_LIMIT;
    setRequestListLimit(nextLimit);
    setRequests((prev) => prev.slice(0, nextLimit));
  }, []);

  const applyRequestFilters = useCallback((filterString: unknown) => {
    const patterns = parseFilterPatterns(typeof filterString === 'string' ? filterString : '');
    filterPatternsRef.current = patterns;
    setRequests((prev) => filterRequestsByPatterns(prev, patterns));
  }, []);

  const applyNetworkPerformanceOptions = useCallback((
    pollingCount: unknown,
    trackedIdsLimit: unknown,
  ) => {
    setNetworkPollingCount(normalizeInRange(
      pollingCount,
      MIN_FETCH_COUNT,
      MAX_FETCH_COUNT,
      DEFAULT_FETCH_COUNT,
    ));
    setTrackedRequestIdsLimit(normalizeInRange(
      trackedIdsLimit,
      MIN_TRACKED_IDS_COUNT,
      MAX_TRACKED_IDS_COUNT,
      DEFAULT_TRACKED_IDS_COUNT,
    ));
  }, []);

  const loadRequestListLimit = useCallback(async () => {
    // electronWin removed - using window.electron directly
    if (!window.electron?.getSettings) {
      return;
    }
    try {
      const settings = await window.electron.getSettings();
      applyRequestListLimit(settings?.requestListLimit);
      applyRequestFilters(settings?.requestFilters);
      applyNetworkPerformanceOptions(settings?.networkPollingCount, settings?.trackedRequestIdsLimit);
    } catch (error) {
      console.error('Failed to load request list limit:', error);
    }
  }, [applyNetworkPerformanceOptions, applyRequestListLimit, applyRequestFilters]);

  useEffect(() => {
    loadRequestListLimit();
  }, [loadRequestListLimit]);

  useEffect(() => {
    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      applyRequestListLimit(customEvent?.detail?.requestListLimit);
      applyRequestFilters(customEvent?.detail?.requestFilters);
      applyNetworkPerformanceOptions(
        customEvent?.detail?.networkPollingCount,
        customEvent?.detail?.trackedRequestIdsLimit,
      );
    };
    window.addEventListener('prokcy-settings-updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('prokcy-settings-updated', handleSettingsUpdated);
    };
  }, [applyNetworkPerformanceOptions, applyRequestListLimit, applyRequestFilters]);

  const fetchNetworkData = useCallback(async ({ initial = false } = {}) => {
    const config = await getRuntimeConfig();

    if (!config.running) {
      setIsConnected(false);
      setIsStreaming(false);
      return;
    }

    const params = new URLSearchParams();
    const activeLimit = Math.max(1, requestListLimitRef.current);
    const activePollingCount = Math.max(
      1,
      Math.min(
        activeLimit,
        MAX_FETCH_COUNT,
        networkPollingCountRef.current,
      ),
    );
    params.set('count', String(activePollingCount));

    if (!initial && lastIdRef.current) {
      params.set('startTime', lastIdRef.current);
    }

    const trackedIdsList = requestsRef.current
      .slice(0, Math.min(trackedRequestIdsLimitRef.current, activeLimit))
      .map((request) => request.id)
      .filter(Boolean);
    const trackedIds = trackedIdsList.join(',');

    if (trackedIds) {
      params.set('ids', trackedIds);
      params.set('status', trackedIdsList.map(() => TRACKED_STATUS_TRIM_MARKER).join(','));
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

    const data = getPayloadData(payload);
    const dataMap = data?.data && typeof data.data === 'object' ? data.data : {};
    const normalizedIncoming = Object.values(dataMap)
      .map(normalizeRequestSummary)
      .filter((item): item is NormalizedRequest => item !== null);
    const incoming = filterRequestsByPatterns(normalizedIncoming, filterPatternsRef.current);

    setRequests((prev) => mergeRequests(prev, incoming, activeLimit));

    const nextLastId = toStringValue(data?.lastId || data?.endId, '');
    if (nextLastId) {
      lastIdRef.current = nextLastId;
    }

    setIsConnected(true);
    setIsStreaming(true);
  }, []);

  const fetchRequestDetail = useCallback(async (requestId: string): Promise<NormalizedRequest | null> => {
    const config = await getRuntimeConfig();
    if (!config.running || !requestId) {
      return null;
    }

    const payload = window.electron?.getNetworkData
      ? await window.electron.getNetworkData({ ids: requestId, count: '1' })
      : await (async () => {
        const params = new URLSearchParams({ ids: requestId, count: '1' });
        const response = await fetch(`http://${config.host}:${config.port}/cgi-bin/get-data?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })();

    const data = getPayloadData(payload);
    const dataMap = data?.data && typeof data.data === 'object' ? data.data : {};
    const exactMatch = Object.values(dataMap).find((item) => toStringValue(item.id, '') === requestId);
    const fallback = exactMatch || Object.values(dataMap)[0];
    return fallback ? normalizeRequestDetail(fallback) : null;
  }, []);

  const refreshRequests = useCallback(async () => {
    lastIdRef.current = '';
    await fetchNetworkData({ initial: true });
  }, [fetchNetworkData]);

  const clearRequests = useCallback(() => {
    // Prevent next poll from reloading old requests after a manual clear.
    lastIdRef.current = String(Date.now());
    detailCacheRef.current.clear();
    detailCacheBytesRef.current.clear();
    detailCacheTotalBytesRef.current = 0;
    detailFetchTokenRef.current += 1;
    setRequests([]);
    setSelectedRequest(null);
  }, []);

  useEffect(() => {
    if (!selectedRequest?.id) {
      return;
    }

    const requestId = selectedRequest.id;
    const cached = detailCacheRef.current.get(requestId);
    if (cached) {
      setSelectedRequest((prev) => (prev && prev.id === requestId ? mergeRequestWithDetail(prev, cached) : prev));
      return;
    }

    const token = detailFetchTokenRef.current + 1;
    detailFetchTokenRef.current = token;
    fetchRequestDetail(requestId)
      .then((detail) => {
        if (!detail) {
          return;
        }
        setRequestDetailCache(detail);
        setSelectedRequest((prev) => {
          if (!prev || prev.id !== requestId || detailFetchTokenRef.current !== token) {
            return prev;
          }
          return mergeRequestWithDetail(prev, detail);
        });
      })
      .catch((error) => {
        console.error('Failed to fetch request detail:', error);
      });
  }, [selectedRequest?.id, fetchRequestDetail, setRequestDetailCache]);

  useEffect(() => {
    if (!isApiAvailable) {
      setIsConnected(false);
      setIsStreaming(false);
      return undefined;
    }

    let stopped = false;

    const pollInterval = isActive && isDocumentVisible
      ? ACTIVE_POLL_INTERVAL
      : INACTIVE_POLL_INTERVAL;

    const scheduleReconnect = () => {
      const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current), MAX_RECONNECT_DELAY);
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!stopped) {
          poll(false);
        }
      }, delay);
    };

    const poll = async (initial: boolean) => {
      try {
        await fetchNetworkData({ initial });
        reconnectAttemptsRef.current = 0;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!stopped) {
            poll(false);
          }
        }, pollInterval);
      } catch (error) {
        console.error('Failed to fetch network requests:', error);
        setIsConnected(false);
        setIsStreaming(false);
        scheduleReconnect();
      }
    };

    const initialDelay = isActive && isDocumentVisible ? 0 : pollInterval;
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!stopped) {
        void poll(true);
      }
    }, initialDelay);

    return () => {
      stopped = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchNetworkData, isApiAvailable, isActive, isDocumentVisible]);

  const selectRequest = useCallback((request: NormalizedRequest | null) => {
    setSelectedRequest(request);
  }, []);

  const setFilters = useCallback((newFilters: Partial<RequestFilter>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const value = useMemo<NetworkContextValue>(() => ({
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

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

NetworkContext.displayName = 'NetworkContext';
