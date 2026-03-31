type ValuesData = Record<string, string>;

interface PersistedStateParams {
  values: ValuesData;
  originalValues: ValuesData;
}

interface CreatePersistedValueStateParams extends PersistedStateParams {
  key: string;
  value: string;
}

interface DeletePersistedValueStateParams extends PersistedStateParams {
  key: string;
}

interface RenamePersistedValueStateParams extends PersistedStateParams {
  oldKey: string;
  newKey: string;
}

export interface PersistedValueState {
  values: ValuesData;
  originalValues: ValuesData;
  isDirty: boolean;
}

export function hasDirtyValues(values: ValuesData, originalValues: ValuesData): boolean {
  const currentKeys = new Set(Object.keys(values));
  const originalKeys = new Set(Object.keys(originalValues));

  for (const key of currentKeys) {
    if (!originalKeys.has(key)) {
      return true;
    }
    if (values[key] !== originalValues[key]) {
      return true;
    }
  }

  for (const key of originalKeys) {
    if (!currentKeys.has(key)) {
      return true;
    }
  }

  return false;
}

function finalizePersistedValueState(
  values: ValuesData,
  originalValues: ValuesData,
): PersistedValueState {
  return {
    values,
    originalValues,
    isDirty: hasDirtyValues(values, originalValues),
  };
}

export function createPersistedValueState({
  values,
  originalValues,
  key,
  value,
}: CreatePersistedValueStateParams): PersistedValueState {
  return finalizePersistedValueState(
    { ...values, [key]: value },
    { ...originalValues, [key]: value },
  );
}

export function deletePersistedValueState({
  values,
  originalValues,
  key,
}: DeletePersistedValueStateParams): PersistedValueState {
  const nextValues = { ...values };
  const nextOriginalValues = { ...originalValues };
  delete nextValues[key];
  delete nextOriginalValues[key];

  return finalizePersistedValueState(nextValues, nextOriginalValues);
}

export function renamePersistedValueState({
  values,
  originalValues,
  oldKey,
  newKey,
}: RenamePersistedValueStateParams): PersistedValueState {
  const persistedValue = values[oldKey] ?? originalValues[oldKey] ?? '';
  const nextValues = { ...values };
  const nextOriginalValues = { ...originalValues };

  delete nextValues[oldKey];
  delete nextOriginalValues[oldKey];

  nextValues[newKey] = persistedValue;
  nextOriginalValues[newKey] = persistedValue;

  return finalizePersistedValueState(nextValues, nextOriginalValues);
}
