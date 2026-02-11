export function createDebouncedHoverState(setHoverState, delayMs) {
  let timeoutId = null;

  const clearPending = () => {
    if (!timeoutId) {
      return;
    }

    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return {
    setNow(nextValue) {
      clearPending();
      setHoverState(nextValue);
    },
    schedule(nextValue) {
      clearPending();

      timeoutId = setTimeout(() => {
        timeoutId = null;
        setHoverState(nextValue);
      }, delayMs);
    },
    cancel() {
      clearPending();
    },
  };
}
