import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getBaseUrl, getAuthHeaders } from '../api/config';

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

// Generate unique ID for requests
let requestIdCounter = 0;
function generateId() {
  return `req_${Date.now()}_${++requestIdCounter}`;
}

export function NetworkProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFiltersState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Add new request to state
  const addRequest = useCallback((requestData) => {
    const request = {
      id: generateId(),
      ...requestData,
    };
    setRequests((prev) => [request, ...prev]);
  }, []);

  // Update existing request
  const updateRequest = useCallback((id, updates) => {
    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, ...updates } : req
      )
    );
  }, []);

  // Fetch initial requests
  const refreshRequests = useCallback(async () => {
    try {
      const url = `${getBaseUrl()}/api/requests`;
      const headers = getAuthHeaders();
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const requestsWithIds = (data.requests || []).map((req) => ({
        id: generateId(),
        ...req,
      }));

      setRequests(requestsWithIds);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch network requests:', error);
      setIsConnected(false);
    }
  }, []);

  // Clear all requests
  const clearRequests = useCallback(() => {
    setRequests([]);
    setSelectedRequest(null);
  }, []);

  // Setup SSE connection
  useEffect(() => {
    const connectSSE = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const url = `${getBaseUrl()}/api/requests/stream`;
        const headers = getAuthHeaders();

        // Build URL with auth if needed
        const authHeader = headers.Authorization;
        const sseUrl = authHeader
          ? `${url}?${new URLSearchParams({
              token: authHeader.replace('Basic ', ''),
            })}`
          : url;

        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('SSE connection opened');
          setIsConnected(true);
          setIsStreaming(true);
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'request':
                // New request captured
                addRequest(data.request);
                break;
              case 'update':
                // Request updated (e.g., response received)
                updateRequest(data.id, data.updates);
                break;
              case 'complete':
                // Request completed
                updateRequest(data.id, { completed: true, ...data.updates });
                break;
              default:
                console.warn('Unknown SSE event type:', data.type);
            }
          } catch (error) {
            console.error('Failed to parse SSE event:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setIsConnected(false);
          setIsStreaming(false);
          eventSource.close();

          // Reconnect with exponential backoff
          const maxDelay = 30000;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
          reconnectAttemptsRef.current++;

          console.log(`Reconnecting in ${delay}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, delay);
        };
      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        setIsConnected(false);
        setIsStreaming(false);
      }
    };

    // Start SSE connection
    connectSSE();

    // Fetch initial requests
    refreshRequests();

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [addRequest, updateRequest, refreshRequests]);

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
