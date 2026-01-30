import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const NetworkContext = createContext({
  requests: [],
  selectedRequest: null,
  filters: {},
  searchQuery: '',
  selectRequest: () => {},
  setFilters: () => {},
  setSearchQuery: () => {},
});

export function NetworkProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFiltersState] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

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
    selectRequest,
    setFilters,
    setSearchQuery,
  }), [requests, selectedRequest, filters, searchQuery, selectRequest, setFilters, setSearchQuery]);

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
