import { globalShortcut } from 'electron';

/**
 * Store for multiple ESC key callbacks
 * Allows registering multiple handlers for the ESC key
 */
const callbacks: Record<string, Array<(...args: any[]) => void>> = {};

/**
 * Store original methods before patching
 */
const originalRegister = globalShortcut.register;
const originalUnregister = globalShortcut.unregister;

/**
 * Patched globalShortcut.register that supports multiple callbacks for ESC key
 *
 * For ESC key:
 * - Maintains a list of callbacks
 * - Last registered callback is executed first (LIFO)
 * - Re-registering moves callback to end of list
 *
 * For other keys: delegates to original register
 *
 * @param name - Accelerator name (e.g., 'ESC', 'CommandOrControl+C')
 * @param callback - Function to call when shortcut is triggered
 */
(globalShortcut.register as any) = function (this: unknown, name: string, callback: (...args: any[]) => void): void {
  if (typeof callback !== 'function') {
    return;
  }

  // For non-ESC keys, use original behavior
  if (name !== 'ESC') {
    (originalRegister as any).call(this, name, callback);
    return;
  }

  // For ESC key, manage multiple callbacks
  const list = callbacks[name] || (callbacks[name] = []);
  const index = list.indexOf(callback);

  if (index === -1) {
    // New callback: add to list and register wrapper
    list.push(callback);
    (originalRegister as any).call(this, name, function (this: unknown, ...args: any[]) {
      const cb = list.pop();
      if (cb) {
        cb.apply(this, args);
      }
    });
  } else {
    // Existing callback: move to end of list
    list.splice(index, 1);
    list.push(callback);
  }
};

/**
 * Patched globalShortcut.unregister that supports multiple callbacks for ESC key
 *
 * For ESC key:
 * - Removes specific callback from list
 * - Unregisters shortcut when no callbacks remain
 *
 * For other keys: delegates to original unregister
 *
 * @param name - Accelerator name
 * @param callback - Function to remove (only used for ESC key)
 */
(globalShortcut.unregister as any) = function (this: unknown, name: string, callback?: (...args: any[]) => void): void {
  // For non-ESC keys, use original behavior
  if (name !== 'ESC') {
    (originalUnregister as any).call(this, name);
    return;
  }

  // For ESC key, manage callback list
  const list = callbacks[name];
  if (list && callback) {
    const index = list.indexOf(callback);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  // Clean up when no callbacks remain
  if (!list || !list.length) {
    (originalUnregister as any).call(this, name);
    delete callbacks[name];
  }
};
