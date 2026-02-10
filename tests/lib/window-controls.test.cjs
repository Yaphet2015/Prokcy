const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  toggleMaximize,
  bindMaximizeStateEvents,
} = require('../../lib/window-controls');

test('toggleMaximize maximizes when window is not maximized', () => {
  const calls = [];
  const win = {
    isMaximized: () => false,
    maximize: () => calls.push('maximize'),
    unmaximize: () => calls.push('unmaximize'),
  };

  toggleMaximize(win);
  assert.deepEqual(calls, ['maximize']);
});

test('toggleMaximize unmaximizes when window is maximized', () => {
  const calls = [];
  const win = {
    isMaximized: () => true,
    maximize: () => calls.push('maximize'),
    unmaximize: () => calls.push('unmaximize'),
  };

  toggleMaximize(win);
  assert.deepEqual(calls, ['unmaximize']);
});

test('bindMaximizeStateEvents emits maximize state changes', () => {
  const win = new EventEmitter();
  const events = [];

  bindMaximizeStateEvents(win, (isMaximized) => {
    events.push(isMaximized);
  });

  win.emit('maximize');
  win.emit('unmaximize');

  assert.deepEqual(events, [true, false]);
});
