import { useEffect } from 'react';

export function useMonacoSave(callback?: () => void): void {
  useEffect(() => {
    const handler = () => {
      callback?.();
    };
    window.addEventListener('monaco-save', handler);
    return () => window.removeEventListener('monaco-save', handler);
  }, [callback]);
}
