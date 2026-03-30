interface ResolveValuesSelectionParams {
  keys: string[];
  selectedKey: string | null;
  pendingKey: string | null;
  suppressAutoSelectOnce?: boolean;
}

interface ResolveValuesSelectionResult {
  nextSelectedKey: string | null;
  consumedPendingKey: string | null;
  shouldAutoSelectFirst: boolean;
  suppressAutoSelectOnce: boolean;
}

export function resolveValuesSelectionFromPendingNavigation({
  keys,
  selectedKey,
  pendingKey,
  suppressAutoSelectOnce = false,
}: ResolveValuesSelectionParams): ResolveValuesSelectionResult {
  if (pendingKey) {
    const hasPendingKey = keys.includes(pendingKey);
    return {
      nextSelectedKey: hasPendingKey ? pendingKey : null,
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: !hasPendingKey,
    };
  }

  if (suppressAutoSelectOnce) {
    return {
      nextSelectedKey: null,
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: false,
    };
  }

  if (selectedKey && keys.includes(selectedKey)) {
    return {
      nextSelectedKey: selectedKey,
      consumedPendingKey: null,
      shouldAutoSelectFirst: false,
      suppressAutoSelectOnce: false,
    };
  }

  return {
    nextSelectedKey: keys[0] ?? null,
    consumedPendingKey: null,
    shouldAutoSelectFirst: keys.length > 0,
    suppressAutoSelectOnce: false,
  };
}
