import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function extractFunctionBody(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `Could not find ${functionName}`);

  const braceStart = source.indexOf('{', start);
  assert.notEqual(braceStart, -1, `Could not find ${functionName} body`);

  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      return source.slice(braceStart + 1, i);
    }
  }

  throw new Error(`Could not parse ${functionName} body`);
}

function loadFormatTime(relPath) {
  const absPath = path.join(ROOT, relPath);
  const source = fs.readFileSync(absPath, 'utf8');
  const body = extractFunctionBody(source, 'formatTime');
  return new Function('ms', body);
}

const waterfallFormatTime = loadFormatTime('src/features/network/WaterfallTimeline.tsx');
const inspectorFormatTime = loadFormatTime('src/features/network/RequestInspector.tsx');

test('WaterfallTimeline formatTime renders numbers for non-zero duration', () => {
  assert.equal(waterfallFormatTime(15), '15ms');
  assert.equal(waterfallFormatTime(1500), '1.50s');
});

test('RequestInspector formatTime renders numbers for non-zero duration', () => {
  assert.equal(inspectorFormatTime(9.12), '9.1ms');
  assert.equal(inspectorFormatTime(125), '125ms');
});
