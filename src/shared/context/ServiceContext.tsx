import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Constants
const API_CHECK_INTERVAL = 100;
const API_CHECK_TIMEOUT = 5000;

interface ServiceContextValue {
  isRunning: boolean;
  isStarting: boolean;
  isStopping: boolean;
  isApiAvailable: boolean;
  error: string | null;
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  toggleService: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextValue>({
  isRunning: false,
  isStarting: false,
  isStopping: false,
  isApiAvailable: false,
  error: null,
  startService: async () => {},
  stopService: async () => {},
  toggleService: async () => {},
});

interface ServiceProviderProps {
  children: ReactNode;
}

export function ServiceProvider({ children }: ServiceProviderProps): React.JSX.Element {
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncServiceStatus = useCallback(async (): Promise<boolean> => {
    if (!window.electron?.getServiceStatus) {
      return false;
    }
    try {
      const result = await window.electron.getServiceStatus();
      const running = result?.running ?? false;
      setIsRunning(running);
      return running;
    } catch (err) {
      console.error('Failed to sync service status:', err);
      return false;
    }
  }, []);

  // Poll for API availability on mount
  useEffect(() => {
    const checkApiAvailable = (): boolean => {
      if (window.electron?.getServiceStatus &&
          window.electron?.startService &&
          window.electron?.stopService &&
          window.electron?.onServiceStatusChanged) {
        setIsApiAvailable(true);
        if (apiCheckIntervalRef.current) {
          clearInterval(apiCheckIntervalRef.current);
        }
        if (apiCheckTimeoutRef.current) {
          clearTimeout(apiCheckTimeoutRef.current);
        }
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkApiAvailable()) {
      return undefined;
    }

    // Poll until available or timeout
    apiCheckIntervalRef.current = setInterval(checkApiAvailable, API_CHECK_INTERVAL);
    apiCheckTimeoutRef.current = setTimeout(() => {
      if (apiCheckIntervalRef.current) {
        clearInterval(apiCheckIntervalRef.current);
      }
      if (!isApiAvailable) {
        console.warn('Service control API not available. Restart app to enable service control.');
      }
    }, API_CHECK_TIMEOUT);

    return () => {
      if (apiCheckIntervalRef.current) {
        clearInterval(apiCheckIntervalRef.current);
      }
      if (apiCheckTimeoutRef.current) {
        clearTimeout(apiCheckTimeoutRef.current);
      }
    };
  }, []);

  // Load initial service status when API is available
  useEffect(() => {
    if (!isApiAvailable) return;
    syncServiceStatus();
  }, [isApiAvailable, syncServiceStatus]);

  // Listen for service status changes from Whistle utility process
  useEffect(() => {
    if (!isApiAvailable) return;

    const unsubscribe = window.electron?.onServiceStatusChanged?.((status) => {
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
    if (!isApiAvailable || !window.electron) {
      setError('Service control not available. Restart app to enable.');
      return;
    }
    if (isStarting) {
      return;
    }

    const running = await syncServiceStatus();
    if (running) {
      setError(null);
      return;
    }

    setIsStarting(true);
    setError(null);
    try {
      const result = await window.electron.startService();
      if (!result.success && result.message !== 'Service already running') {
        throw new Error(result.message || 'Failed to start service');
      }
      if (result.message === 'Service already running') {
        setIsRunning(true);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to start service:', error);
      setError(error.message || 'Failed to start service');
      setIsStarting(false);
    }
  }, [isApiAvailable, isStarting, syncServiceStatus]);

  const stopService = useCallback(async () => {
    if (!isApiAvailable || !window.electron) {
      setError('Service control not available. Restart app to enable.');
      return;
    }
    if (isStopping) {
      return;
    }

    const running = await syncServiceStatus();
    if (!running) {
      setError(null);
      setIsRunning(false);
      return;
    }

    setIsStopping(true);
    setError(null);
    try {
      const result = await window.electron.stopService();
      if (!result.success && result.message !== 'Service not running') {
        throw new Error(result.message || 'Failed to stop service');
      }
      if (result.message === 'Service not running') {
        setIsRunning(false);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to stop service:', error);
      setError(error.message || 'Failed to stop service');
      setIsStopping(false);
    }
  }, [isApiAvailable, isStopping, syncServiceStatus]);

  const toggleService = useCallback(async () => {
    if (isRunning) {
      await stopService();
    } else {
      await startService();
    }
  }, [isRunning, startService, stopService]);

  const value = useMemo<ServiceContextValue>(() => ({
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

export function useService(): ServiceContextValue {
  return useContext(ServiceContext);
}

ServiceContext.displayName = 'ServiceContext';
