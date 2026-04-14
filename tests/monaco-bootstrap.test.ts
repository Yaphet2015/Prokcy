import test from 'node:test';
import assert from 'node:assert/strict';

import { prepareMonacoBeforeMount } from '../src/shared/ui/monaco-bootstrap.ts';

test('prepareMonacoBeforeMount registers Tahoe themes for editors outside Rules', () => {
  const defineThemeCalls: string[] = [];
  let beforeMountCalls = 0;

  prepareMonacoBeforeMount({
    editor: {
      defineTheme: (name: string) => {
        defineThemeCalls.push(name);
      },
    },
  } as any, {
    language: 'json',
    beforeMount: () => {
      beforeMountCalls += 1;
    },
  });

  assert.deepEqual(defineThemeCalls, ['tahoe-dark', 'tahoe-light']);
  assert.equal(beforeMountCalls, 1);
});
