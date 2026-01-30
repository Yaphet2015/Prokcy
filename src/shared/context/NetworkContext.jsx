import { createContext, useContext, useState, useCallback } from 'react';

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

  return (
    <NetworkContext.Provider
      value={{
        requests,
        selectedRequest,
        filters,
        searchQuery,
        selectRequest,
        setFilters,
        setSearchQuery,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
