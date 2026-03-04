const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  toggleMaximize,
  bindMaximizeStateEvents,
  hideNativeWindowButtons,
  handleMacHideWindowShortcut,
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

test('hideNativeWindowButtons hides native controls on macOS only', () => {
  const calls = [];
  const win = {
    setWindowButtonVisibility: (visible) => calls.push(visible),
  };

  hideNativeWindowButtons(win, 'darwin');
  hideNativeWindowButtons(win, 'win32');

  assert.deepEqual(calls, [false]);
});

test('handleMacHideWindowShortcut hides window on Cmd+W (macOS)', () => {
  let prevented = false;
  let hidden = false;

  const event = {
    preventDefault: () => {
      prevented = true;
    },
  };

  const input = {
    type: 'keyDown',
    key: 'w',
    meta: true,
  };

  const win = {
    hide: () => {
      hidden = true;
    },
  };

  const handled = handleMacHideWindowShortcut(event, input, win, 'darwin');

  assert.equal(handled, true);
  assert.equal(prevented, true);
  assert.equal(hidden, true);
});

test('handleMacHideWindowShortcut ignores non-macOS or non-Cmd+W keys', () => {
  let prevented = false;
  let hidden = false;

  const event = {
    preventDefault: () => {
      prevented = true;
    },
  };

  const win = {
    hide: () => {
      hidden = true;
    },
  };

  const wrongPlatform = handleMacHideWindowShortcut(event, {
    type: 'keyDown',
    key: 'w',
    meta: true,
  }, win, 'win32');

  const wrongKey = handleMacHideWindowShortcut(event, {
    type: 'keyDown',
    key: 'q',
    meta: true,
  }, win, 'darwin');

  assert.equal(wrongPlatform, false);
  assert.equal(wrongKey, false);
  assert.equal(prevented, false);
  assert.equal(hidden, false);
});
