type MonacoEditorModule = typeof import('./MonacoEditor');

type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface MonacoWarmupEnvironment {
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  cancelAnimationFrame?: typeof window.cancelAnimationFrame;
  requestIdleCallback?: typeof window.requestIdleCallback;
  cancelIdleCallback?: typeof window.cancelIdleCallback;
  setTimeout?: typeof window.setTimeout;
  clearTimeout?: typeof window.clearTimeout;
}

const IDLE_FALLBACK_DELAY_MS = 250;
const IDLE_TIMEOUT_MS = 1500;

let monacoWarmupScheduled = false;

export function createCachedLoader<T>(loader: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;

  return () => {
    if (!promise) {
      promise = loader();
    }
    return promise;
  };
}

export const loadMonacoEditor = createCachedLoader<MonacoEditorModule>(
  () => import('./MonacoEditor'),
);

export function scheduleMonacoWarmup(
  warmup: () => void | Promise<unknown> = () => {
    void loadMonacoEditor();
  },
  env: MonacoWarmupEnvironment = window,
): () => void {
  if (monacoWarmupScheduled) {
    return () => {};
  }

  monacoWarmupScheduled = true;

  let frameId: number | null = null;
  let idleId: number | null = null;
  let timeoutId: TimeoutHandle | null = null;
  let cancelled = false;

  const runWarmup = () => {
    if (cancelled) {
      return;
    }
    void warmup();
  };

  const scheduleIdle = () => {
    if (typeof env.requestIdleCallback === 'function') {
      idleId = env.requestIdleCallback(() => {
        idleId = null;
        runWarmup();
      }, { timeout: IDLE_TIMEOUT_MS });
      return;
    }

    if (typeof env.setTimeout === 'function') {
      timeoutId = env.setTimeout(() => {
        timeoutId = null;
        runWarmup();
      }, IDLE_FALLBACK_DELAY_MS);
    }
  };

  if (typeof env.requestAnimationFrame === 'function') {
    frameId = env.requestAnimationFrame(() => {
      frameId = null;
      scheduleIdle();
    });
  } else {
    scheduleIdle();
  }

  return () => {
    cancelled = true;

    if (frameId !== null && typeof env.cancelAnimationFrame === 'function') {
      env.cancelAnimationFrame(frameId);
    }

    if (idleId !== null && typeof env.cancelIdleCallback === 'function') {
      env.cancelIdleCallback(idleId);
    }

    if (timeoutId !== null && typeof env.clearTimeout === 'function') {
      env.clearTimeout(timeoutId);
    }
  };
}

export function resetMonacoWarmupStateForTests(): void {
  monacoWarmupScheduled = false;
}
