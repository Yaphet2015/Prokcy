export interface DebouncedHoverState<T> {
  setNow(nextValue: T | null): void;
  schedule(nextValue: T | null): void;
  cancel(): void;
}

export function createDebouncedHoverState<T>(
  setHoverState: (value: T | null) => void,
  delayMs: number
): DebouncedHoverState<T> {
  let timeoutId: number | null = null;

  const clearPending = (): void => {
    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return {
    setNow(nextValue: T | null): void {
      clearPending();
      setHoverState(nextValue);
    },
    schedule(nextValue: T | null): void {
      clearPending();

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        setHoverState(nextValue);
      }, delayMs);
    },
    cancel(): void {
      clearPending();
    },
  };
}
