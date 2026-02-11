import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import type { ChangeEvent } from 'react';
import {
  Button, Checkbox, Input, Select,
} from '@pikoloo/darwin-ui';
import { Settings as SettingsIcon, RotateCcw, Save } from 'lucide-react';

// Types
interface SettingsForm {
  port: string;
  socksPort: string;
  host: string;
  username: string;
  password: string;
  bypass: string;
  useDefaultStorage: boolean;
  maxHttpHeaderSize: string;
  requestListLimit: string;
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: string;
}

interface ProxyPayload {
  port: string;
  socksPort: string;
  host: string;
  username: string;
  password: string;
  bypass: string;
  useDefaultStorage: boolean;
  maxHttpHeaderSize: string;
  requestListLimit: number;
}

interface PreferencesPayload {
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: string;
}

interface SettingsPayload {
  proxy: ProxyPayload;
  preferences: PreferencesPayload;
}

interface SettingsResponse {
  success?: boolean;
  message?: string;
  settings?: SettingsForm;
}

// Settings categories for sidebar navigation
interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { id: 'proxy', label: 'Proxy', icon: '🌐' },
  { id: 'app', label: 'App', icon: '⚙️' },
];

interface HeaderSizeOption {
  label: string;
  value: string;
}

const HEADER_SIZE_OPTIONS: HeaderSizeOption[] = [
  { label: '256k', value: '256' },
  { label: '512k', value: '512' },
  { label: '1m', value: '1024' },
  { label: '5m', value: '5120' },
  { label: '10m', value: '10240' },
  { label: '50m', value: '51200' },
  { label: '100m', value: '102400' },
];

interface ThemeOption {
  label: string;
  value: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { label: 'Follow System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const THEME_MODES = THEME_OPTIONS.map((item) => item.value);

const DEFAULT_REQUEST_LIST_LIMIT = '500';
const MIN_REQUEST_LIST_LIMIT = '100';
const MAX_REQUEST_LIST_LIMIT = '5000';

const DEFAULT_SETTINGS: SettingsForm = {
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

const hasWhitespace = (value: string): boolean => /\s/.test(value);

const isPort = (value: string): boolean => {
  if (!value) {
    return true;
  }
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536;
};

const isRequestListLimit = (value: string): boolean => {
  if (!value) {
    return false;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed)
    && parsed >= Number(MIN_REQUEST_LIST_LIMIT)
    && parsed <= Number(MAX_REQUEST_LIST_LIMIT);
};

const normalizeSettings = (settings: Partial<SettingsForm> = {}): SettingsForm => {
  const maxHttpHeaderSize = String(settings.maxHttpHeaderSize || DEFAULT_SETTINGS.maxHttpHeaderSize);
  const requestListLimitValue = Number(settings.requestListLimit);
  const requestListLimit = Number.isInteger(requestListLimitValue)
    && requestListLimitValue >= Number(MIN_REQUEST_LIST_LIMIT)
    && requestListLimitValue <= Number(MAX_REQUEST_LIST_LIMIT)
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
    themeMode: THEME_MODES.includes(String(settings.themeMode))
      ? String(settings.themeMode)
      : DEFAULT_SETTINGS.themeMode,
  };
};

export default function Settings(): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>('proxy');
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [savedForm, setSavedForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');

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
      setError((err as Error)?.message || 'Failed to load settings');
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

  const updateField = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setMessage('');
  };

  const validate = (): string => {
    const port = form.port.trim();
    const socksPort = form.socksPort.trim();
    const host = form.host.trim();
    const username = form.username.trim();
    const password = form.password.trim();

    if (!port || !isPort(port)) {
      return 'Please input a correct port';
    }
    if (socksPort && !isPort(socksPort)) {
      return 'Please input a correct socks port';
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

    const payload: SettingsPayload = {
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
      const next = normalizeSettings(result.settings || {});
      setForm(next);
      setSavedForm(next);
      setMessage('Settings saved');
    } catch (err) {
      setError((err as Error)?.message || 'Failed to save settings');
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
        </div>

        <div className="flex items-center gap-3">
          {/* Status/Feedback */}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
          {message && !error && (
            <span className="text-xs text-emerald-500">{message}</span>
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
        <main className="flex-1 overflow-y-auto p-6">
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
                  <section className="bg-white/70 dark:bg-zinc-900/60">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Proxy Configuration
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Whistle Port */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Whistle Port</span>
                        <Input
                          type="number"
                          value={form.port}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('port', e.target.value)}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('socksPort', e.target.value)}
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </label>

                      {/* Bound Host */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bound Host</span>
                        <Input
                          value={form.host}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('host', e.target.value)}
                          disabled={loading}
                          placeholder="e.g., 127.0.0.1"
                        />
                      </label>

                      {/* Max HTTP Header Size */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Max HTTP Header Size</span>
                        <Select
                          value={form.maxHttpHeaderSize}
                          onChange={(e) => updateField('maxHttpHeaderSize', e.target.value)}
                          options={HEADER_SIZE_OPTIONS}
                          disabled={loading}
                        />
                      </label>

                      {/* Request List Limit */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Request List Limit</span>
                        <Input
                          type="number"
                          min={MIN_REQUEST_LIST_LIMIT}
                          max={MAX_REQUEST_LIST_LIMIT}
                          value={form.requestListLimit}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('requestListLimit', e.target.value)}
                          disabled={loading}
                          placeholder={DEFAULT_REQUEST_LIST_LIMIT}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('username', e.target.value)}
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
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('password', e.target.value)}
                          disabled={loading}
                          placeholder="Optional authentication"
                        />
                      </label>

                      {/* Bypass List - full width */}
                      <label className="space-y-1.5 md:col-span-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bypass List</span>
                        <textarea
                          value={form.bypass}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField('bypass', e.target.value)}
                          disabled={loading}
                          rows={4}
                          placeholder="One host per line, e.g., localhost, 127.0.0.1"
                          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </label>
                    </div>
                  </section>
                </div>
              )}

              {/* App Section */}
              {activeCategory === 'app' && (
                <div className="max-w-3xl space-y-6">
                  <section className="bg-white/70 dark:bg-zinc-900/60">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Storage
                    </h2>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={form.useDefaultStorage}
                        onChange={(checked) => updateField('useDefaultStorage', checked)}
                        disabled={loading}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">Use whistle's default storage directory</span>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                          By default, Prokcy uses a separate storage directory (~/.whistle_client/).
                          Enable this to share settings with the CLI version of Whistle.
                        </p>
                      </div>
                    </label>
                  </section>
                </div>
              )}

              {/* Appearance Section */}
              {activeCategory === 'app' && (
                <div className="max-w-3xl space-y-6">
                  <section className="bg-white/70 dark:bg-zinc-900/60">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Appearance
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Theme */}
                      <label className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Theme</span>
                        <Select
                          value={form.themeMode}
                          onChange={(e) => updateField('themeMode', e.target.value)}
                          options={THEME_OPTIONS}
                          disabled={loading}
                        />
                      </label>
                    </div>
                  </section>
                </div>
              )}

              {/* Behavior Section */}
              {activeCategory === 'app' && (
                <div className="max-w-3xl space-y-6">
                  <section className="bg-white/70 dark:bg-zinc-900/60">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-5">
                      Behavior
                    </h2>

                    <div className="space-y-4">
                      {/* Start at login */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={form.startAtLogin}
                          onChange={(checked) => updateField('startAtLogin', checked)}
                          disabled={loading}
                        />
                        <div className="flex-1">
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">Start at login</span>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            Automatically launch Prokcy when you log in to your computer.
                          </p>
                        </div>
                      </label>

                      {/* Hide from Dock */}
                      <label className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                          checked={form.hideFromDock}
                          onChange={(checked) => updateField('hideFromDock', checked)}
                          disabled={loading}
                        />
                        <div className="flex-1">
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">Hide icon in Dock</span>
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                            Remove the Prokcy icon from your macOS Dock. Access it from the menu bar instead.
                          </p>
                        </div>
                      </label>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
