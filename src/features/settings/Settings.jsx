import {
  useCallback, useEffect, useMemo, useState,
} from 'react';

const HEADER_SIZE_OPTIONS = [
  { label: '256k', value: '256' },
  { label: '512k', value: '512' },
  { label: '1m', value: '1024' },
  { label: '5m', value: '5120' },
  { label: '10m', value: '10240' },
  { label: '50m', value: '51200' },
  { label: '100m', value: '102400' },
];

const THEME_OPTIONS = [
  { label: 'Follow System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const THEME_MODES = THEME_OPTIONS.map((item) => item.value);
const DEFAULT_REQUEST_LIST_LIMIT = '500';
const MIN_REQUEST_LIST_LIMIT = 100;
const MAX_REQUEST_LIST_LIMIT = 5000;

const DEFAULT_SETTINGS = {
  port: '8888',
  socksPort: '',
  host: '',
  username: '',
  password: '',
  bypass: '',
  useDefaultStorage: false,
  maxHttpHeaderSize: '256',
  requestListLimit: DEFAULT_REQUEST_LIST_LIMIT,
  startAtLogin: false,
  hideFromDock: false,
  themeMode: 'system',
};

const hasWhitespace = (value) => /\s/.test(value);
const isPort = (value) => {
  if (!value) {
    return true;
  }
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536;
};
const isRequestListLimit = (value) => {
  if (!value) {
    return false;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed)
    && parsed >= MIN_REQUEST_LIST_LIMIT
    && parsed <= MAX_REQUEST_LIST_LIMIT;
};

const normalizeSettings = (settings = {}) => {
  const maxHttpHeaderSize = String(settings.maxHttpHeaderSize || '256');
  const requestListLimitValue = Number(settings.requestListLimit);
  const requestListLimit = Number.isInteger(requestListLimitValue)
    && requestListLimitValue >= MIN_REQUEST_LIST_LIMIT
    && requestListLimitValue <= MAX_REQUEST_LIST_LIMIT
    ? String(requestListLimitValue)
    : DEFAULT_REQUEST_LIST_LIMIT;
  return {
    port: String(settings.port || DEFAULT_SETTINGS.port),
    socksPort: String(settings.socksPort || ''),
    host: String(settings.host || ''),
    username: String(settings.username || ''),
    password: String(settings.password || ''),
    bypass: String(settings.bypass || ''),
    useDefaultStorage: !!settings.useDefaultStorage,
    maxHttpHeaderSize: HEADER_SIZE_OPTIONS.some((item) => item.value === maxHttpHeaderSize)
      ? maxHttpHeaderSize
      : DEFAULT_SETTINGS.maxHttpHeaderSize,
    requestListLimit,
    startAtLogin: !!settings.startAtLogin,
    hideFromDock: !!settings.hideFromDock,
    themeMode: THEME_MODES.includes(settings.themeMode)
      ? settings.themeMode
      : DEFAULT_SETTINGS.themeMode,
  };
};

export default function Settings() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [savedForm, setSavedForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');

    if (!window.electron?.getSettings) {
      setError('Settings API unavailable. Please restart the app.');
      setLoading(false);
      return;
    }

    try {
      const settings = await window.electron.getSettings();
      const next = normalizeSettings(settings);
      setForm(next);
      setSavedForm(next);
    } catch (err) {
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm],
  );

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setMessage('');
  };

  const validate = () => {
    const port = form.port.trim();
    const socksPort = form.socksPort.trim();
    const host = form.host.trim();
    const username = form.username.trim();
    const password = form.password.trim();

    if (!port || !isPort(port)) {
      return 'Please input the correct port';
    }
    if (socksPort && !isPort(socksPort)) {
      return 'Please input the correct socks port';
    }
    if (host && hasWhitespace(host)) {
      return 'Bound host cannot have spaces';
    }
    if (username && hasWhitespace(username)) {
      return 'Username cannot have spaces';
    }
    if (password && hasWhitespace(password)) {
      return 'Password cannot have spaces';
    }
    if (!isRequestListLimit(form.requestListLimit.trim())) {
      return `Request list limit must be an integer between ${MIN_REQUEST_LIST_LIMIT} and ${MAX_REQUEST_LIST_LIMIT}`;
    }
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.electron?.updateSettings) {
      setError('Settings API unavailable. Please restart the app.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      proxy: {
        port: form.port.trim(),
        socksPort: form.socksPort.trim(),
        host: form.host.trim(),
        username: form.username.trim(),
        password: form.password.trim(),
        bypass: form.bypass.trim(),
        useDefaultStorage: form.useDefaultStorage,
        maxHttpHeaderSize: form.maxHttpHeaderSize,
        requestListLimit: Number(form.requestListLimit.trim()),
      },
      preferences: {
        startAtLogin: form.startAtLogin,
        hideFromDock: form.hideFromDock,
        themeMode: form.themeMode,
      },
    };

    try {
      const result = await window.electron.updateSettings(payload);
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to save settings');
      }
      const next = normalizeSettings(result.settings || {
        ...payload.proxy,
        ...payload.preferences,
      });
      setForm(next);
      setSavedForm(next);
      window.dispatchEvent(new CustomEvent('prokcy-settings-updated', { detail: next }));
      setMessage('Settings saved');
    } catch (err) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-4xl mx-auto px-6 py-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold">Settings</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Cmd+, to open this page
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading || saving}
              className="px-3 py-1.5 text-xs rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || loading || saving}
              className="px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {(error || message) && (
          <div
            className={`px-3 py-2 rounded-md text-xs border ${
              error
                ? 'text-red-600 dark:text-red-300 border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10'
                : 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            Proxy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Whistle Port</span>
              <input
                type="number"
                value={form.port}
                onChange={(e) => updateField('port', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Socks Port</span>
              <input
                type="number"
                value={form.socksPort}
                onChange={(e) => updateField('socksPort', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Bound Host</span>
              <input
                value={form.host}
                onChange={(e) => updateField('host', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Max HTTP Header Size</span>
              <select
                value={form.maxHttpHeaderSize}
                onChange={(e) => updateField('maxHttpHeaderSize', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                {HEADER_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Request List Limit</span>
              <input
                type="number"
                min={MIN_REQUEST_LIST_LIMIT}
                max={MAX_REQUEST_LIST_LIMIT}
                value={form.requestListLimit}
                onChange={(e) => updateField('requestListLimit', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Username</span>
              <input
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Password</span>
              <input
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Bypass List</span>
              <textarea
                value={form.bypass}
                onChange={(e) => updateField('bypass', e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 resize-none"
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">
            App
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Theme</span>
              <select
                value={form.themeMode}
                onChange={(e) => updateField('themeMode', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              >
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.startAtLogin}
                  onChange={(e) => updateField('startAtLogin', e.target.checked)}
                  disabled={loading}
                />
                <span>Start at login</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.hideFromDock}
                  onChange={(e) => updateField('hideFromDock', e.target.checked)}
                  disabled={loading}
                />
                <span>Hide icon in Dock (macOS)</span>
              </label>
            </div>
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.useDefaultStorage}
                onChange={(e) => updateField('useDefaultStorage', e.target.checked)}
                disabled={loading}
                className="mt-0.5"
              />
              <span>Use whistle's default storage directory</span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
