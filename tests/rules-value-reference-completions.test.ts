import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getValueReferenceCompletionContext,
  normalizeValueKeysForCompletion,
  registerValueReferenceCompletionProvider,
} from '../src/features/rules/utils/valueReferenceCompletions.ts';

function getColumnAfter(line: string, text: string): number {
  const index = line.indexOf(text);
  assert.notEqual(index, -1, `Expected "${text}" in "${line}"`);
  return index + text.length + 1;
}

function getColumnBefore(line: string, text: string): number {
  const index = line.indexOf(text);
  assert.notEqual(index, -1, `Expected "${text}" in "${line}"`);
  return index + 1;
}

test('detects value reference completion after an opening brace', () => {
  const line = 'example.com resBody://{';

  assert.deepEqual(
    getValueReferenceCompletionContext(line, line.length + 1),
    {
      query: '',
      startColumn: getColumnAfter(line, '{'),
      endColumn: line.length + 1,
    },
  );
});

test('detects partial Chinese value reference before a closing brace', () => {
  const line = 'example.com resBody://{续}';

  assert.deepEqual(
    getValueReferenceCompletionContext(line, getColumnBefore(line, '}')),
    {
      query: '续',
      startColumn: getColumnAfter(line, '{'),
      endColumn: getColumnBefore(line, '}'),
    },
  );
});

test('does not offer value reference completion in comments, file paths, or outside tokens', () => {
  assert.equal(
    getValueReferenceCompletionContext('# example.com resBody://{续}', 26),
    null,
  );
  assert.equal(
    getValueReferenceCompletionContext('example.com file:///tmp/mock.json', 22),
    null,
  );
  assert.equal(
    getValueReferenceCompletionContext('example.com resBody://{mock}', 4),
    null,
  );
});

test('normalizes value keys for completion by filtering empty keys and sorting', () => {
  assert.deepEqual(
    normalizeValueKeysForCompletion({
      ec: 0,
      list: [
        { name: 'zeta', data: '{}' },
        { name: '', data: '{}' },
        { name: '续费月卡订单记录', data: '{}' },
        { name: 'alpha', data: '{}' },
      ],
    }),
    ['alpha', 'zeta', '续费月卡订单记录'],
  );
});

test('registered completion provider suggests matching value keys inside braces', () => {
  const providers: Array<{ language: string; provider: any }> = [];
  let disposed = false;
  const monaco = {
    languages: {
      CompletionItemKind: {
        File: 17,
      },
      registerCompletionItemProvider: (language: string, provider: any) => {
        providers.push({ language, provider });
        return {
          dispose: () => {
            disposed = true;
          },
        };
      },
    },
  };

  const disposable = registerValueReferenceCompletionProvider(
    monaco,
    () => ['mockHeaders', '续费月卡订单记录', 'other'],
  );
  const line = 'example.com resBody://{续}';
  const result = providers[0]?.provider.provideCompletionItems(
    { getLineContent: () => line },
    { lineNumber: 1, column: getColumnBefore(line, '}') },
  );

  assert.equal(providers[0]?.language, 'whistle');
  assert.deepEqual(result, {
    suggestions: [
      {
        label: '续费月卡订单记录',
        kind: 17,
        insertText: '续费月卡订单记录',
        range: {
          startLineNumber: 1,
          endLineNumber: 1,
          startColumn: getColumnAfter(line, '{'),
          endColumn: getColumnBefore(line, '}'),
        },
        detail: 'Values key',
        documentation: 'Insert Values key reference',
        sortText: '0续费月卡订单记录',
      },
    ],
  });

  disposable.dispose();
  assert.equal(disposed, true);
});
