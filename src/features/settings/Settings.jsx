import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { Button, Input } from '@pikoloo/darwin-ui';
import { Settings as SettingsIcon, RotateCcw, Save } from 'lucide-react';

// Settings categories for sidebar navigation
const SETTINGS_CATEGORIES = [
  { id: 'proxy', label: 'Proxy', icon: '🌐' },
  { id: 'app', label: 'App', icon: '⚙️' },
];

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
  const [activeCategory, setActiveCategory] = useState('proxy');
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
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Main Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            (Cmd+, to open)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status/Feedback */}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
          {message && !error && (
            <span className="text-xs text-emerald-500">{message}</span>
          )}
          {!error && !message && isDirty && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1 rounded">Unsaved changes</span>
          )}
          {!error && !message && !isDirty && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1 rounded">All saved</span>
          )}

          {/* Action buttons */}
          <Button
            variant="secondary"
            size="sm"
            onClick={loadSettings}
            disabled={loading || saving}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            title="Reload settings"
          >
            Reload
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || loading || saving}
            leftIcon={<Save className="w-4 h-4" />}
            title="Save settings"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 backdrop-blur-md flex flex-col">
          {/* Sidebar Header */}
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Categories
            </h2>
          </div>

          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {SETTINGS_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${
                  activeCategory === category.id
                    ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20'
                    : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{category.icon}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.label}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading state */}
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading settings...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Proxy Section */}
              {activeCategory === 'proxy' && (
                <div className="max-w-3xl space-y-6">
                  <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Proxy Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Whistle Port */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Whistle Port</span>
                        <Input
                          type="number"
                          value={form.port}
                          onChange={(e) => updateField('port', e.target.value)}
                          disabled={loading}
                          placeholder="8888"
                        />
                      </label>

                      {/* Socks Port */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Socks Port</span>
                        <Input
                          type="number"
                          value={form.socksPort}
                          onChange={(e) => updateField('socksPort', e.target.value)}
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </label>

                      {/* Bound Host */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bound Host</span>
                        <Input
                          value={form.host}
                          onChange={(e) => updateField('host', e.target.value)}
                          disabled={loading}
                          placeholder="e.g., 127.0.0.1"
                        />
                      </label>

                      {/* Max HTTP Header Size */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Max HTTP Header Size</span>
                        <select
                          value={form.maxHttpHeaderSize}
                          onChange={(e) => updateField('maxHttpHeaderSize', e.target.value)}
                          disabled={loading}
                          className="w-full h-9 px-3 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          {HEADER_SIZE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {/* Request List Limit */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Request List Limit</span>
                        <Input
                          type="number"
                          min={MIN_REQUEST_LIST_LIMIT}
                          max={MAX_REQUEST_LIST_LIMIT}
                          value={form.requestListLimit}
                          onChange={(e) => updateField('requestListLimit', e.target.value)}
                          disabled={loading}
                          placeholder={`${DEFAULT_REQUEST_LIST_LIMIT}`}
                        />
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Between
                          {' '}
                          {MIN_REQUEST_LIST_LIMIT}
                          {' '}
                          and
                          {' '}
                          {MAX_REQUEST_LIST_LIMIT}
                        </p>
                      </label>

                      {/* Proxy Username */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Username</span>
                        <Input
                          value={form.username}
                          onChange={(e) => updateField('username', e.target.value)}
                          disabled={loading}
                          placeholder="Optional authentication"
                        />
                      </label>

                      {/* Proxy Password */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Password</span>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e) => updateField('password', e.target.value)}
                          disabled={loading}
                          placeholder="Optional authentication"
                        />
                      </label>

                      {/* Bypass List - full width */}
                      <label className="space-y-1.5 md:col-span-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bypass List</span>
                        <textarea
                          value={form.bypass}
                          onChange={(e) => updateField('bypass', e.target.value)}
                          disabled={loading}
                          rows={4}
                          placeholder="One host per line, e.g., localhost, 127.0.0.1"
                          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </label>
                    </div>
                  </section>

                  {/* Storage Section */}
                  <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Storage
                    </h2>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.useDefaultStorage}
                        onChange={(e) => updateField('useDefaultStorage', e.target.checked)}
                        disabled={loading}
                        className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">Use whistle's default storage directory</span>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          By default, Whistle Client uses a separate storage directory (~/.whistle_client/).
                          Enable this to share settings with the CLI version of Whistle.
                        </p>
                      </div>
                    </label>
                  </section>
                </div>
              )}

              {/* App Section */}
              {activeCategory === 'app' && (
                <div className="max-w-3xl space-y-6">
                  <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Appearance
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Theme */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Theme</span>
                        <select
                          value={form.themeMode}
                          onChange={(e) => updateField('themeMode', e.target.value)}
                          disabled={loading}
                          className="w-full h-9 px-3 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          {THEME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Behavior
                    </h2>
                    <div className="space-y-4">
                      {/* Start at login */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.startAtLogin}
                          onChange={(e) => updateField('startAtLogin', e.target.checked)}
                          disabled={loading}
                          className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">Start at login</span>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            Automatically launch Whistle Client when you log in to your computer.
                          </p>
                        </div>
                      </label>

                      {/* Hide from Dock */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.hideFromDock}
                          onChange={(e) => updateField('hideFromDock', e.target.checked)}
                          disabled={loading}
                          className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">Hide icon in Dock</span>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            Remove the Whistle Client icon from your macOS Dock. Access it from the menu bar instead.
                          </p>
                        </div>
                      </label>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
