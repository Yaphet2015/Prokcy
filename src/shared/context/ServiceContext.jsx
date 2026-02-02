import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

const ServiceContext = createContext({
  isRunning: false,
  isStarting: false,
  isStopping: false,
  isApiAvailable: false,
  error: null,
  startService: async () => {},
  stopService: async () => {},
  toggleService: async () => {},
});

// Poll for API availability (in case preload script isn't loaded yet)
const API_CHECK_INTERVAL = 100;
const API_CHECK_TIMEOUT = 5000;

export function ServiceProvider({ children }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [error, setError] = useState(null);

  const apiCheckTimeoutRef = useRef(null);
  const apiCheckIntervalRef = useRef(null);

  // Poll for API availability on mount
  useEffect(() => {
    const checkApiAvailable = () => {
      if (window.electron?.getServiceStatus &&
          window.electron?.startService &&
          window.electron?.stopService &&
          window.electron?.onServiceStatusChanged) {
        setIsApiAvailable(true);
        clearInterval(apiCheckIntervalRef.current);
        clearTimeout(apiCheckTimeoutRef.current);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkApiAvailable()) {
      return;
    }

    // Poll until available or timeout
    apiCheckIntervalRef.current = setInterval(checkApiAvailable, API_CHECK_INTERVAL);
    apiCheckTimeoutRef.current = setTimeout(() => {
      clearInterval(apiCheckIntervalRef.current);
      if (!isApiAvailable) {
        console.warn('Service control API not available. Restart the app to enable service control.');
      }
    }, API_CHECK_TIMEOUT);

    return () => {
      clearInterval(apiCheckIntervalRef.current);
      clearTimeout(apiCheckTimeoutRef.current);
    };
  }, []);

  // Load initial service status when API is available
  useEffect(() => {
    if (!isApiAvailable) return;

    const loadServiceStatus = async () => {
      try {
        const result = await window.electron.getServiceStatus();
        setIsRunning(result?.running ?? false);
      } catch (err) {
        console.error('Failed to load service status:', err);
      }
    };

    loadServiceStatus();
  }, [isApiAvailable]);

  // Listen for service status changes from Whistle utility process
  useEffect(() => {
    if (!isApiAvailable) return;

    const unsubscribe = window.electron.onServiceStatusChanged((status) => {
      const running = status?.running ?? false;
      setIsRunning(running);
      setIsStarting(false);
      setIsStopping(false);
      setError(null);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isApiAvailable]);

  const startService = useCallback(async () => {
    if (!isApiAvailable) {
      setError('Service control not available. Restart the app to enable.');
      return;
    }
    if (isRunning || isStarting) {
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const result = await window.electron.startService();
      if (!result.success) {
        throw new Error(result.message || 'Failed to start service');
      }
    } catch (err) {
      console.error('Failed to start service:', err);
      setError(err.message || 'Failed to start service');
      setIsStarting(false);
    }
  }, [isApiAvailable, isRunning, isStarting]);

  const stopService = useCallback(async () => {
    if (!isApiAvailable) {
      setError('Service control not available. Restart the app to enable.');
      return;
    }
    if (!isRunning || isStopping) {
      return;
    }

    setIsStopping(true);
    setError(null);
    try {
      const result = await window.electron.stopService();
      if (!result.success) {
        throw new Error(result.message || 'Failed to stop service');
      }
    } catch (err) {
      console.error('Failed to stop service:', err);
      setError(err.message || 'Failed to stop service');
      setIsStopping(false);
    }
  }, [isApiAvailable, isRunning, isStopping]);

  const toggleService = useCallback(async () => {
    if (isRunning) {
      await stopService();
    } else {
      await startService();
    }
  }, [isRunning, startService, stopService]);

  const value = useMemo(() => ({
    isRunning,
    isStarting,
    isStopping,
    isApiAvailable,
    error,
    startService,
    stopService,
    toggleService,
  }), [isRunning, isStarting, isStopping, isApiAvailable, error, startService, stopService, toggleService]);

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useService() {
  return useContext(ServiceContext);
}

ServiceContext.displayName = 'ServiceContext';
