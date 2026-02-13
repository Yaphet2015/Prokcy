import { useEffect, useRef, useState } from 'react';
import {
  Tabs, TabsList, TabsContent, TabsTrigger,
  Button,
} from '@pikoloo/darwin-ui';
import { X } from 'lucide-react';
import { useNetwork, type NormalizedRequest, type RequestTimings } from '../../shared/context/NetworkContext';

// Tab component props
interface TabProps {
  request: NormalizedRequest | null;
}

function HeadersTab({ request }: TabProps): React.JSX.Element {
  const headers = request?.headers ?? { request: {}, response: {} };

  return (
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      <div className="space-y-6">
        {/* Request Headers */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Request Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-blue-500 w-32 shrink-0">{request?.method ?? ''}</span>
              <span className="text-zinc-900 dark:text-zinc-100">{request?.url ?? ''}</span>
            </div>
            {(Object.entries(headers.request ?? {}) as [string, string][]).map(([key, value]) => (
              <div key={key} className="flex gap-4 text-xs">
                <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32 shrink-0">{key}</span>
                <span className="text-zinc-900 dark:text-zinc-100 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Headers */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Response Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-blue-500 w-32 shrink-0">Status</span>
              <span className={`font-medium ${
                (request?.status ?? 0) >= 200 && (request?.status ?? 0) < 300
                  ? 'text-green-500'
                  : (request?.status ?? 0) >= 400 && (request?.status ?? 0) < 500
                    ? 'text-orange-500'
                    : 'text-zinc-900 dark:text-zinc-100'
              }`}
              >
                {request?.status ?? 0}
                {' '}
                {request?.statusText ?? ''}
              </span>
            </div>
            {(Object.entries(headers.response ?? {}) as [string, string][]).map(([key, value]) => (
              <div key={key} className="flex gap-4 text-xs">
                <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32 shrink-0">{key}</span>
                <span className="text-zinc-900 dark:text-zinc-100 break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Format bytes to human-readable size
function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

// Format time in ms
function formatTime(ms: number | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Syntax-highlight JSON
function syntaxHighlight(json: string | unknown): string {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  return (json as string).replace(/("(\\u[a-zA-Z0-9]{4}|\\[^\\u]|[^\\"])*"(\\s*:)?|(true|false|null)\\b)/g, (match) => {
    let cls = 'text-zinc-500 dark:text-zinc-400';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-blue-500'; // key
      } else {
        cls = 'text-green-500'; // string
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-blue-500'; // boolean
    } else if (/null/.test(match)) {
      cls = 'text-red-500'; // null
    } else if (/^-?\d/.test(match)) {
      cls = 'text-orange-500'; // number
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function BodyTab({ request }: TabProps): React.JSX.Element {
  const body = request?.requestBody;
  const isJson = body?.headers?.['content-type']?.includes('application/json');
  const content = body?.content ?? '';

  let displayContent = content;
  if (isJson && content) {
    try {
      const parsed = JSON.parse(content);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Use raw content if not valid JSON
    }
  }

  return (
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      {body ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Request Body
            </span>
            {body?.headers?.['content-type'] && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                (
                {body?.headers['content-type']}
                )
              </span>
            )}
          </div>
          <pre
            className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100"
            dangerouslySetInnerHTML={{
              __html: isJson ? syntaxHighlight(displayContent) : displayContent,
            }}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No request body</p>
        </div>
      )}
    </div>
  );
}

function ResponseTab({ request }: TabProps): React.JSX.Element {
  const { response } = request ?? {};
  const contentType = response?.headers?.['content-type'] ?? '';
  const isJson = contentType.includes('application/json');
  const content = response?.body ?? '';

  let displayContent = content;
  if (isJson && content) {
    try {
      const parsed = JSON.parse(content);
      displayContent = JSON.stringify(parsed, null, 2);
    } catch {
      // Use raw content if not valid JSON
    }
  }

  const isImage = contentType.startsWith('image/');

  return (
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      {response ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Response
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatBytes(response?.size ?? 0)}
              </span>
            </div>
          </div>

          {isImage ? (
            <div className="flex justify-center p-4">
              <img
                src={`data:${contentType};base64,${content}`}
                alt="Response preview"
                className="max-w-full max-h-96 rounded-lg"
              />
            </div>
          ) : (
            <pre
              className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4 overflow-x-auto text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{
                __html: isJson ? syntaxHighlight(displayContent) : displayContent,
              }}
            />
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No response data</p>
        </div>
      )}
    </div>
  );
}

// Types for rules tab
interface RuleTypeConfig {
  color: string;
  label: string;
}

interface ParsedRuleValue {
  protocol?: string;
  value?: string;
  pattern?: string;
}

// Tab: Matched Rules
function RulesTab({ request }: TabProps): React.JSX.Element {
  const rules = request?.rules ?? {};

  // Check if a value has meaningful content (not empty object/array/string)
  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  };

  // Filter rules to only include meaningful ones
  const ruleEntries = Object.entries(rules).filter(([, rule]) => {
    if (!rule) {
      return false;
    }
    const ruleObj = rule as { pattern?: unknown; value?: unknown };
    // Check for pattern (non-empty string)
    const hasPattern = typeof ruleObj.pattern === 'string' && ruleObj.pattern.trim();
    // Check for value with meaningful content
    const hasValue = hasMeaningfulValue(ruleObj.value);
    return hasPattern || hasValue;
  }) as [string, unknown][];

  // Rule type configurations for visual differentiation
  const ruleTypeConfig: Record<string, RuleTypeConfig> = {
    style: { color: 'from-violet-500 to-purple-600', label: 'Style Override' },
    redirect: { color: 'from-blue-500 to-cyan-600', label: 'Redirect' },
    replace: { color: 'from-amber-500 to-orange-600', label: 'Replace' },
    rewrite: { color: 'from-emerald-500 to-green-600', label: 'Rewrite' },
    host: { color: 'from-rose-500 to-pink-600', label: 'Host Mapping' },
    proxy: { color: 'from-sky-500 to-blue-600', label: 'Proxy' },
    protocol: { color: 'from-indigo-500 to-violet-600', label: 'Protocol' },
    disable: { color: 'from-zinc-500 to-gray-600', label: 'Disable' },
    cache: { color: 'from-teal-500 to-emerald-600', label: 'Cache' },
    cors: { color: 'from-fuchsia-500 to-pink-600', label: 'CORS' },
    log: { color: 'from-lime-500 to-green-600', label: 'Log' },
  };

  const getRuleConfig = (type: string | unknown): RuleTypeConfig => {
    const typeStr = typeof type === 'string' ? type : String(type);
    const config = ruleTypeConfig[typeStr.toLowerCase()];
    return config ?? { color: 'from-slate-500 to-zinc-600', label: typeStr };
  };

  // Convert value to string safely
  const valueToString = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const parseRuleValue = (rule: unknown): ParsedRuleValue => {
    if (!rule || typeof rule !== 'object') {
      return { value: '', pattern: '' };
    }

    const ruleObj = rule as { protocol?: string; value?: string; rawMatcher?: string; pattern?: string };

    // Check for direct protocol property first
    if (ruleObj.protocol) {
      return { protocol: ruleObj.protocol, value: ruleObj.value ?? '', pattern: ruleObj.pattern ?? '' };
    }

    // Check for rawMatcher which often contains full rule value
    if (ruleObj.rawMatcher) {
      const rawValue = String(ruleObj.rawMatcher);
      const protoMatch = rawValue.match(/^(\w+):\/\/(.*)$/);
      if (protoMatch) {
        return { protocol: protoMatch[1], value: protoMatch[2], pattern: ruleObj.pattern ?? '' };
      }
      // rawMatcher might just be a protocol name
      if (rawValue.match(/^\w+$/)) {
        return { protocol: rawValue, value: '', pattern: ruleObj.pattern ?? '' };
      }
      return { value: rawValue, pattern: ruleObj.pattern ?? '' };
    }

    // Check for pattern
    if (ruleObj.pattern) {
      const rawValue = ruleObj.value ?? '';
      // Try to extract protocol from value
      const protoMatch = String(rawValue).match(/^(\w+):\/\/(.+)$/);
      if (protoMatch) {
        return { pattern: ruleObj.pattern, protocol: protoMatch[1], value: protoMatch[2] };
      }
      return { pattern: ruleObj.pattern, value: rawValue };
    }

    // Handle protocol-based values like "style://bg-color:red"
    const value = valueToString(ruleObj.value ?? '');
    const match = value.match(/^(\w+):\/\/(.+)$/);
    if (match) {
      return { protocol: match[1], value: match[2] };
    }

    // Check if value is a plain protocol string (e.g., "log" or "log://")
    const simpleProtoMatch = value.match(/^(\w+)(:\/\/)?$/);
    if (simpleProtoMatch) {
      return { protocol: simpleProtoMatch[1], value: '' };
    }

    return { value };
  };

  return (
    <div className="px-5 h-full overflow-y-auto scrollbar-hide">
      {ruleEntries.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800/50 dark:to-zinc-900/50 flex items-center justify-center">
            <span className="text-3xl">Ø</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              No rules matched
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              This request was processed without any active rules
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {ruleEntries.map(([type, rule]) => {
            const typeStr = String(type ?? 'unknown');
            const config = getRuleConfig(typeStr);
            const ruleObj = rule as { value?: unknown };
            const parsed = parseRuleValue(rule);

            return (
              <div
                key={typeStr}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-900/50 dark:to-zinc-800/30 border border-zinc-200 dark:border-zinc-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-600"
              >
                {/* Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${config.color ?? 'from-slate-500 to-zinc-600'} opacity-80 group-hover:opacity-100 transition-opacity`} />

                <div className="pl-4 pr-4 py-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                      {String(config?.label ?? 'Unknown Rule')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                      {parsed?.protocol || (parsed?.pattern && 'pattern') || typeStr}
                    </span>
                  </div>

                  {/* Pattern/Protocol indicator */}
                  {parsed?.pattern && (
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase shrink-0 mt-0.5">
                        Pattern
                      </span>
                      <code className="flex-1 text-[11px] font-mono bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-1 rounded border border-red-200 dark:border-red-800/30 break-all">
                        {valueToString(parsed.pattern)}
                      </code>
                    </div>
                  )}

                  {parsed?.protocol && (
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase shrink-0 mt-0.5">
                        Protocol
                      </span>
                      <code className="text-[11px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700/50">
                        {valueToString(parsed.protocol)}
                        :
                      </code>
                    </div>
                  )}

                  {/* Value display */}
                  {parsed?.value && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        {parsed?.pattern || parsed?.protocol ? 'Replacement' : 'Value'}
                      </span>
                      <code className="block text-xs font-mono bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700/50 break-all">
                        {valueToString(parsed.value)}
                      </code>
                    </div>
                  )}

                  {/* Raw value fallback for complex rules */}
                  {!parsed?.value && !parsed?.pattern && ruleObj.value && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                        Rule Definition
                      </span>
                      <code className="block text-xs font-mono bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700/50 break-all">
                        {valueToString(ruleObj.value)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Tab: Timeline
function TimelineTab({ request }: TabProps): React.JSX.Element {
  const timings: RequestTimings = request?.timings ?? {
    dns: 0,
    tcp: 0,
    tls: 0,
    ttfb: 0,
    download: 0,
    total: 0,
  };
  const total = timings.total ?? 0;

  const phases = [
    { key: 'dns', label: 'DNS Lookup', color: '#3b82f6' },
    { key: 'tcp', label: 'TCP Connection', color: '#14b8a6' },
    { key: 'tls', label: 'TLS Handshake', color: '#22c55e' },
    { key: 'ttfb', label: 'Waiting (TTFB)', color: '#a855f7' },
    { key: 'download', label: 'Content Download', color: '#f97316' },
  ].filter(p => (timings[p.key as keyof RequestTimings] ?? 0) > 0);

  return (
    <div className="p-4 h-full overflow-y-auto scrollbar-hide">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Time</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatTime(total)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Size</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatBytes(request?.size ?? 0)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Status</p>
            <p className={`text-lg font-semibold ${
              (request?.status ?? 0) >= 200 && (request?.status ?? 0) < 300
                ? 'text-green-500'
                : (request?.status ?? 0) >= 400 && (request?.status ?? 0) < 500
                  ? 'text-orange-500'
                  : 'text-zinc-900 dark:text-zinc-100'
            }`}
            >
              {request?.status ?? 0}
            </p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Timing Breakdown
          </h3>
          <div className="space-y-3">
            {phases.map((phase) => {
              const duration = timings[phase.key as keyof RequestTimings] ?? 0;
              const percent = total > 0 ? (duration / total) * 100 : 0;

              return (
                <div key={phase.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-900 dark:text-zinc-100">{phase.label}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: phase.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw Timings */}
        <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Raw Timings
          </h3>
          <div className="space-y-2">
            {phases.map((phase) => (
              <div key={phase.key} className="flex justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{phase.label}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatTime(timings[phase.key as keyof RequestTimings] ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Types for drag state
interface DragState {
  startY: number;
  startHeight: number;
}

export default function RequestInspector(): React.JSX.Element | null {
  const { selectedRequest, selectRequest } = useNetwork();
  const [activeTab, setActiveTab] = useState<string>('headers');
  const [inspectorHeight, setInspectorHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const MIN_INSPECTOR_HEIGHT = 160;
  const MIN_TIMELINE_HEIGHT = 200;

  // Handle mouse move during resize
  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current) {
        return;
      }

      const deltaY = dragStateRef.current.startY - event.clientY;
      const parentHeight = inspectorRef.current?.parentElement?.getBoundingClientRect().height ?? Infinity;
      const maxHeight = Number.isFinite(parentHeight)
        ? Math.max(MIN_INSPECTOR_HEIGHT, parentHeight - MIN_TIMELINE_HEIGHT)
        : dragStateRef.current.startHeight + deltaY;
      const nextHeight = Math.min(
        maxHeight,
        Math.max(MIN_INSPECTOR_HEIGHT, dragStateRef.current.startHeight + deltaY),
      );

      setInspectorHeight(nextHeight);
    };

    const handleMouseUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault();
    dragStateRef.current = {
      startY: event.clientY,
      startHeight: inspectorHeight,
    };
    setIsDragging(true);
  };

  if (!selectedRequest) {
    return null;
  }

  return (
    <div
      ref={inspectorRef}
      className="flex-none min-h-6 flex overflow-auto flex-col border-t border-zinc-200 dark:border-zinc-800 scrollbar-hide"
      style={{ height: `${inspectorHeight}px` }}
    >
      {/* Resize handle */}
      <button
        type="button"
        className={[
          'h-1 w-full cursor-row-resize shrink-0',
          'bg-zinc-200/80 hover:bg-blue-400/70',
          'dark:bg-zinc-800/80 dark:hover:bg-blue-500/70',
        ].join(' ')}
        onMouseDown={startResize}
        aria-label="Resize request inspector"
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div
          className={[
            'flex items-center justify-between shrink-0 p-2 pb-0',
          ].join(' ')}
        >
          <TabsList>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Request Body</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectRequest(null)}
            leftIcon={<X className="w-4 h-4 hover:dark:text-zinc-950" />}
            aria-label="Close request inspector"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="headers">
            <HeadersTab request={selectedRequest} />
          </TabsContent>
          <TabsContent value="body">
            <BodyTab request={selectedRequest} />
          </TabsContent>
          <TabsContent value="response">
            <ResponseTab request={selectedRequest} />
          </TabsContent>
          <TabsContent value="rules">
            <RulesTab request={selectedRequest} />
          </TabsContent>
          <TabsContent value="timeline">
            <TimelineTab request={selectedRequest} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
