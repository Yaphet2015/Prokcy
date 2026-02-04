import { useEffect, useRef, useState } from 'react';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
  Button,
} from '@pikoloo/darwin-ui';
import { X } from 'lucide-react';
import { useNetwork } from '../../shared/context/NetworkContext';

// Format bytes to human-readable size
function formatBytes(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

// Format time in ms
function formatTime(ms) {
  if (!ms && ms !== 0) return '-';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Syntax-highlight JSON
function syntaxHighlight(json) {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
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

// Tab: Headers
function HeadersTab({ request }) {
  const headers = request.headers || {};

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Request Headers */}
        <div>
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Request Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-blue-500 w-32 shrink-0">{request.method}</span>
              <span className="text-zinc-900 dark:text-zinc-100">{request.url}</span>
            </div>
            {Object.entries(headers.request || {}).map(([key, value]) => (
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
                request.status >= 200 && request.status < 300 ? 'text-green-500'
                  : request.status >= 400 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'
              }`}
              >
                {request.status}
                {' '}
                {request.statusText}
              </span>
            </div>
            {Object.entries(headers.response || {}).map(([key, value]) => (
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

// Tab: Request Body
function BodyTab({ request }) {
  const body = request.requestBody;
  const isJson = body?.headers?.['content-type']?.includes('application/json');
  const content = body?.content || '';

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
    <div className="p-4 h-full overflow-y-auto">
      {body ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Request Body
            </span>
            {body.headers?.['content-type'] && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                (
                {body.headers['content-type']}
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

// Tab: Response
function ResponseTab({ request }) {
  const { response } = request;
  const contentType = response?.headers?.['content-type'] || '';
  const isJson = contentType.includes('application/json');
  const content = response?.body || '';

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
    <div className="p-4 h-full overflow-y-auto">
      {response ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Response
              </span>
              {contentType && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  (
                  {contentType}
                  )
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatBytes(response.size)}
            </span>
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

// Tab: Timeline
function TimelineTab({ request }) {
  const timings = request.timings || {};
  const total = timings.total || 0;

  const phases = [
    { key: 'dns', label: 'DNS Lookup', color: '#3b82f6' },
    { key: 'tcp', label: 'TCP Connection', color: '#14b8a6' },
    { key: 'tls', label: 'TLS Handshake', color: '#22c55e' },
    { key: 'ttfb', label: 'Waiting (TTFB)', color: '#a855f7' },
    { key: 'download', label: 'Content Download', color: '#f97316' },
  ].filter(p => timings[p.key] > 0);

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Time</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatTime(total)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Size</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatBytes(request.size)}</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 rounded-lg p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Status</p>
            <p className={`text-lg font-semibold ${
              request.status >= 200 && request.status < 300 ? 'text-green-500'
                : request.status >= 400 ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100'
            }`}
            >
              {request.status}
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
              const duration = timings[phase.key];
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
                <span className="font-mono text-zinc-900 dark:text-zinc-100">{formatTime(timings[phase.key])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestInspector() {
  const { selectedRequest, selectRequest } = useNetwork();
  const [activeTab, setActiveTab] = useState('headers');
  const [inspectorHeight, setInspectorHeight] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const inspectorRef = useRef(null);
  const dragStateRef = useRef(null);

  const MIN_INSPECTOR_HEIGHT = 160;
  const MIN_TIMELINE_HEIGHT = 200;

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }

    const handleMouseMove = (event) => {
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

  const startResize = (event) => {
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
      className="flex-none min-h-6 flex overflow-auto flex-col border-t border-zinc-200 dark:border-zinc-800"
      style={{ height: `${inspectorHeight}px` }}
    >
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
      <Tabs glass value={activeTab} onValueChange={setActiveTab}>
        <div
          className={[
            'flex items-center justify-between shrink-0',
          ].join(' ')}
        >
          <TabsList>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Request Body</TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => selectRequest(null)}
            leftIcon={<X className="w-4 h-4" />}
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
          <TabsContent value="timeline">
            <TimelineTab request={selectedRequest} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
