import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import type { ChangeEvent } from 'react';
import {
  Button, Input, Select, Switch,
} from '@pikoloo/darwin-ui';
import { Save } from 'lucide-react';
import ContentHeader from '../../shared/ui/ContentHeader';

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
  requestFilters: string;
  systemProxyEnabled: boolean;
  defaultWidth: string;
  defaultHeight: string;
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
  defaultWidth?: number;
  defaultHeight?: number;
}

interface PreferencesPayload {
  startAtLogin: boolean;
  hideFromDock: boolean;
  themeMode: string;
  requestFilters: string;
}

interface SettingsPayload {
  proxy: ProxyPayload;
  preferences: PreferencesPayload;
}

// Settings categories for sidebar navigation
interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'proxy', label: 'Proxy', icon: '🌐' },
  { id: 'network', label: 'Network', icon: '🔍' },
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

// Window size constants
const DEFAULT_WINDOW_WIDTH = '1200';
const DEFAULT_WINDOW_HEIGHT = '800';
const MIN_WINDOW_SIZE = '800';
const MAX_WINDOW_SIZE = '3840';

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
  requestFilters: '',
  systemProxyEnabled: false,
  defaultWidth: DEFAULT_WINDOW_WIDTH,
  defaultHeight: DEFAULT_WINDOW_HEIGHT,
};

// Validation helpers
const hasWhitespace = (value: string): boolean => /\s/.test(value);

const isIntegerInRange = (
  value: string,
  min: number,
  max: number,
  allowEmpty = false
): boolean => {
  if (!value) {
    return allowEmpty;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
};

const isPort = (value: string): boolean => isIntegerInRange(value, 1, 65535, true);

const isRequestListLimit = (value: string): boolean =>
  isIntegerInRange(value, Number(MIN_REQUEST_LIST_LIMIT), Number(MAX_REQUEST_LIST_LIMIT), false);

const isWindowSize = (value: string): boolean =>
  isIntegerInRange(value, Number(MIN_WINDOW_SIZE), Number(MAX_WINDOW_SIZE), true);

const normalizeSettings = (settings: Partial<SettingsForm> = {}): SettingsForm => {
  const maxHttpHeaderSize = String(settings.maxHttpHeaderSize || DEFAULT_SETTINGS.maxHttpHeaderSize);
  const requestListLimitValue = Number(settings.requestListLimit);
  const requestListLimit = Number.isInteger(requestListLimitValue)
    && requestListLimitValue >= Number(MIN_REQUEST_LIST_LIMIT)
    && requestListLimitValue <= Number(MAX_REQUEST_LIST_LIMIT)
    ? String(requestListLimitValue)
    : DEFAULT_REQUEST_LIST_LIMIT;

  // Normalize window size values
  const normalizeSize = (
    value: unknown,
    defaultSize: string
  ): string => {
    const numValue = Number(value);
    const minSize = Number(MIN_WINDOW_SIZE);
    const maxSize = Number(MAX_WINDOW_SIZE);
    const normalized = Number.isInteger(numValue) && numValue >= minSize && numValue <= maxSize
      ? String(numValue)
      : defaultSize;
    return normalized;
  };

  const defaultWidth = normalizeSize(settings.defaultWidth, DEFAULT_WINDOW_WIDTH);
  const defaultHeight = normalizeSize(settings.defaultHeight, DEFAULT_WINDOW_HEIGHT);

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
    requestFilters: String(settings.requestFilters || ''),
    systemProxyEnabled: !!settings.systemProxyEnabled,
    defaultWidth,
    defaultHeight,
  };
};

export default function Settings({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }): React.JSX.Element {
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [savedForm, setSavedForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
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
    if (message) {
      setTimeout(() => {
        setMessage('');
      }, 3000);
    }
  }, [message]);

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
    const defaultWidth = form.defaultWidth.trim();
    const defaultHeight = form.defaultHeight.trim();

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
    if (defaultWidth && !isWindowSize(defaultWidth)) {
      return `Default width must be an integer between ${MIN_WINDOW_SIZE} and ${MAX_WINDOW_SIZE}`;
    }
    if (defaultHeight && !isWindowSize(defaultHeight)) {
      return `Default height must be an integer between ${MIN_WINDOW_SIZE} and ${MAX_WINDOW_SIZE}`;
    }
    return '';
  };

  const handleSave = useCallback(async () => {
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
        defaultWidth: form.defaultWidth ? Number(form.defaultWidth.trim()) : undefined,
        defaultHeight: form.defaultHeight ? Number(form.defaultHeight.trim()) : undefined,
      },
      preferences: {
        startAtLogin: form.startAtLogin,
        hideFromDock: form.hideFromDock,
        themeMode: form.themeMode,
        requestFilters: form.requestFilters,
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
      window.dispatchEvent(new CustomEvent('prokcy-settings-updated', {
        detail: {
          requestListLimit: Number(next.requestListLimit),
          requestFilters: next.requestFilters,
        },
      }));
      setMessage('Settings saved');
    } catch (err) {
      setError((err as Error)?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [form, validate]);

  const handleSystemProxyToggle = useCallback(async (enabled: boolean) => {
    if (!window.electron?.setSystemProxyEnabled) {
      setError('System proxy API unavailable');
      return;
    }

    try {
      const result = await window.electron.setSystemProxyEnabled(enabled);
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to toggle system proxy');
      }
      updateField('systemProxyEnabled', enabled);
      setMessage(enabled ? 'System proxy enabled' : 'System proxy disabled');
    } catch (err) {
      setError((err as Error)?.message || 'Failed to toggle system proxy');
    }
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    if (!window.electron?.checkForUpdates) {
      setError('Update API unavailable. Please restart the app.');
      return;
    }

    setCheckingUpdate(true);
    setError('');
    setMessage('');

    try {
      const result = await window.electron.checkForUpdates();
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to check for updates');
      }
      setMessage(result.message || 'Checking for updates...');
    } catch (err) {
      setError((err as Error)?.message || 'Failed to check for updates');
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  // Handle keyboard shortcuts (Cmd+S or Ctrl+S to save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (macOS) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser's default save dialog
        if (isDirty && !loading && !saving) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, loading, saving, handleSave]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <ContentHeader
        viewName="settings"
        isSidebarCollapsed={isSidebarCollapsed}
        statusMessage={(
          <>
            {error && <span className="text-xs text-red-500">{error}</span>}
            {message && !error && <span className="text-xs text-emerald-500">{message}</span>}
          </>
        )}
        rightActions={(
          <>
            {/* <Button
              variant="secondary"
              size="sm"
              onClick={loadSettings}
              disabled={loading || saving}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              title="Reload settings"
            >
              Reload
            </Button> */}
            <Button
              variant={isDirty ? "primary" : "ghost"}
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || loading || saving}
              leftIcon={<Save className="w-4 h-4" />}
              title="Save settings"
              loading={saving}
            >
              Save
            </Button>
          </>
        )}
      />

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
                className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${activeCategory === category.id
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
                  <section>
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                        Proxy Service
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Whistle Port */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Whistle Port</span>
                        <Input
                          type="number"
                          value={form.port}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('port', e.target.value)}
                          disabled={loading}
                          placeholder="8888"
                        />
                      </div>

                      {/* Socks Port */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Socks Port</span>
                        <Input
                          type="number"
                          value={form.socksPort}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('socksPort', e.target.value)}
                          disabled={loading}
                          placeholder="Optional"
                        />
                      </div>

                      {/* Bound Host */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bound Host</span>
                        <Input
                          value={form.host}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('host', e.target.value)}
                          disabled={loading}
                          placeholder="e.g., 127.0.0.1"
                        />
                      </div>

                      {/* Max HTTP Header Size */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Max HTTP Header Size</span>
                        <Select
                          value={form.maxHttpHeaderSize}
                          onChange={(e) => updateField('maxHttpHeaderSize', e.target.value)}
                          options={HEADER_SIZE_OPTIONS}
                          disabled={loading}
                        />
                      </div>

                      {/* Request List Limit */}
                      <div className="space-y-1.5">
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
                      </div>

                      {/* Proxy Username */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Username</span>
                        <Input
                          value={form.username}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('username', e.target.value)}
                          disabled={loading}
                          placeholder="Optional authentication"
                        />
                      </div>

                      {/* Proxy Password */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Proxy Password</span>
                        <Input
                          type="password"
                          value={form.password}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('password', e.target.value)}
                          disabled={loading}
                          placeholder="Optional authentication"
                        />
                      </div>

                      {/* Bypass List - full width */}
                      <div className="space-y-1.5 md:col-span-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Bypass List</span>
                        <textarea
                          value={form.bypass}
                          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField('bypass', e.target.value)}
                          disabled={loading}
                          rows={4}
                          placeholder="One host per line, e.g., localhost, 127.0.0.1"
                          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        />
                      </div>

                      {/* System Proxy Toggle - full width */}
                      <div className="space-y-1.5 md:col-span-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={form.systemProxyEnabled}
                            onChange={handleSystemProxyToggle}
                            disabled={loading}
                            label="Set as System Proxy"
                          />
                        </div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Route system network traffic through Prokcy. Required for capturing HTTPS requests.
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* Network Section */}
              {activeCategory === 'network' && (
                <div className="max-w-3xl space-y-6">
                  <section>
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                      Request Filters
                    </h2>

                    <div className="space-y-1.5">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Filter Patterns</span>
                      <textarea
                        value={form.requestFilters}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateField('requestFilters', e.target.value)}
                        disabled={loading}
                        rows={6}
                        placeholder="One pattern per line"
                        className="w-full px-3 py-2 text-sm font-mono rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      />
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Exclude matching requests from the waterfall timeline. Use wildcards (*).
                          Multiple patterns can be separated by newlines.
                      </p>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 space-y-1">
                        <p className="font-medium text-zinc-500 dark:text-zinc-400">Examples:</p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li><code className="text-zinc-600 dark:text-zinc-300">*.google.com</code> - any subdomain of google.com</li>
                          <li><code className="text-zinc-600 dark:text-zinc-300">/api/health*</code> - URLs starting with /api/health</li>
                          <li><code className="text-zinc-600 dark:text-zinc-300">*/analytics/*</code> - any path containing /analytics/</li>
                          <li><code className="text-zinc-600 dark:text-zinc-300">fonts.googleapis.com</code> - exact domain match</li>
                        </ul>
                      </div>
                    </div>
                  </section>
                </div>
              )}

                {/* General Section */}
                {activeCategory === 'general' && (
                  <div className="max-w-3xl space-y-6">
                    {/* Appearance */}
                  <section>
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                        Appearance
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Theme</span>
                        <Select
                          value={form.themeMode}
                          onChange={(e) => updateField('themeMode', e.target.value)}
                          options={THEME_OPTIONS}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    </section>

                    {/* Behavior */}
                  <section className="mt-4">
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                      Behavior
                      </h2>

                      <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Switch
                          checked={form.startAtLogin}
                          onChange={(checked) => updateField('startAtLogin', checked)}
                          disabled={loading}
                          label="Start at login"
                        />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-9">
                          Automatically launch Prokcy when you log in to your computer.
                        </p>
                        </div>
                      <div className="flex flex-col gap-2">
                        <Switch
                          checked={form.hideFromDock}
                          onChange={(checked) => updateField('hideFromDock', checked)}
                          disabled={loading}
                          label="Hide icon in Dock"
                        />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-9">
                          Remove the Prokcy icon from your macOS Dock. Access it from the menu bar instead.
                        </p>
                      </div>
                    </div>
                    </section>

                    {/* Window */}
                  <section className="mt-4">
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                      Window
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Default Width</span>
                        <Input
                          type="number"
                          min={MIN_WINDOW_SIZE}
                          max={MAX_WINDOW_SIZE}
                          value={form.defaultWidth}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('defaultWidth', e.target.value)}
                          disabled={loading}
                          placeholder={DEFAULT_WINDOW_WIDTH}
                        />
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Between {MIN_WINDOW_SIZE} and {MAX_WINDOW_SIZE}
                        </p>
                        </div>
                      <div className="space-y-1.5">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Default Height</span>
                        <Input
                          type="number"
                          min={MIN_WINDOW_SIZE}
                          max={MAX_WINDOW_SIZE}
                          value={form.defaultHeight}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateField('defaultHeight', e.target.value)}
                          disabled={loading}
                          placeholder={DEFAULT_WINDOW_HEIGHT}
                        />
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                          Between {MIN_WINDOW_SIZE} and {MAX_WINDOW_SIZE}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                      Default window size when the app launches. Changes take effect on next app start.
                    </p>
                  </section>

                    {/* Storage */}
                    <section className="mt-4">
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                        Storage
                      </h2>
                      <div className="flex flex-col gap-2">
                        <Switch
                          checked={form.useDefaultStorage}
                          onChange={(checked) => updateField('useDefaultStorage', checked)}
                          disabled={loading}
                          label="Use whistle's default storage directory"
                        />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 pl-9">
                          By default, Prokcy uses a separate storage directory (~/.whistle_client/).
                          Enable this to share settings with the CLI version of Whistle.
                        </p>
                      </div>
                    </section>



                    {/* Updates */}
                    <section className="mt-4">
                      <h2 className="text-m font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 not-first:mt-2">
                        Updates
                      </h2>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCheckUpdate}
                          disabled={loading || checkingUpdate}
                          loading={checkingUpdate}
                        >
                          Check Update
                        </Button>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Downloads and installs automatically when a new version is available.
                        </p>
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
