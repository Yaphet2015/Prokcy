import {
  applyEdits,
  format,
  parse,
  printParseErrorCode,
} from 'jsonc-parser';

type ValuesData = Record<string, string>;

interface PrepareValuesForSaveParams {
  values: ValuesData;
  originalValues: ValuesData;
}

interface PrepareValuesForSaveResult {
  values: ValuesData;
  dirtyKeys: string[];
}

interface PersistValuesSaveParams extends PrepareValuesForSaveParams {
  deleteValue: (key: string) => Promise<void>;
  setValue: (key: string, value: string) => Promise<void>;
}

const JSON5_PARSE_OPTIONS = {
  allowTrailingComma: true,
  disallowComments: false,
  allowEmptyContent: false,
};

const JSON5_FORMAT_OPTIONS = {
  insertSpaces: true,
  tabSize: 2,
  eol: '\n',
};

export class InvalidValueJson5Error extends Error {
  key: string | null;

  constructor(message: string, key: string | null = null) {
    super(message);
    this.name = 'InvalidValueJson5Error';
    this.key = key;
  }
}

export function formatValueJson5(input: string): string {
  const errors: Array<{ error: number; offset: number; length: number }> = [];
  parse(input, errors, JSON5_PARSE_OPTIONS);

  if (errors.length > 0) {
    const firstError = errors[0];
    throw new InvalidValueJson5Error(
      `Invalid JSON5: ${printParseErrorCode(firstError.error)} at offset ${firstError.offset}`,
    );
  }

  const edits = format(input, undefined, JSON5_FORMAT_OPTIONS);
  return applyEdits(input, edits);
}

export function prepareValuesForSave({
  values,
  originalValues,
}: PrepareValuesForSaveParams): PrepareValuesForSaveResult {
  const nextValues = { ...values };
  const dirtyKeys = Object.keys(values).filter((key) => (
    !(key in originalValues) || values[key] !== originalValues[key]
  ));

  for (const key of dirtyKeys) {
    try {
      nextValues[key] = formatValueJson5(values[key]);
    } catch (error) {
      if (error instanceof InvalidValueJson5Error) {
        throw new InvalidValueJson5Error(
          `Value "${key}" is invalid: ${error.message}`,
          key,
        );
      }

      throw error;
    }
  }

  return {
    values: nextValues,
    dirtyKeys,
  };
}

export async function persistValuesSave({
  values,
  originalValues,
  deleteValue,
  setValue,
}: PersistValuesSaveParams): Promise<ValuesData> {
  const preparedValues = prepareValuesForSave({ values, originalValues });
  const originalKeys = new Set(Object.keys(originalValues));
  const currentKeys = new Set(Object.keys(preparedValues.values));

  for (const key of originalKeys) {
    if (!currentKeys.has(key)) {
      await deleteValue(key);
    }
  }

  for (const key of preparedValues.dirtyKeys) {
    await setValue(key, preparedValues.values[key]);
  }

  return preparedValues.values;
}
