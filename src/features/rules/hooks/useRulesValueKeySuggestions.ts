import { useEffect, useState } from 'react';
import { normalizeValueKeysForCompletion } from '../utils/valueReferenceCompletions';

interface RulesValueKeySuggestions {
  valueKeys: string[];
  error: string | null;
}

export function useRulesValueKeySuggestions(refreshToken: number): RulesValueKeySuggestions {
  const [valueKeys, setValueKeys] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchValueKeys = async () => {
      if (!window.electron?.getValues) {
        setValueKeys([]);
        setError('Electron API not available');
        return;
      }

      try {
        const payload = await window.electron.getValues();
        if (cancelled) {
          return;
        }
        setValueKeys(normalizeValueKeysForCompletion(payload));
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        const error = err as Error;
        setError(error.message || 'Failed to load Values keys');
      }
    };

    void fetchValueKeys();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return { valueKeys, error };
}
