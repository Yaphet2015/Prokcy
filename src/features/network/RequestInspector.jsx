import { useState, useMemo } from 'react';
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
    let cls = 'text-tahoe-subtle';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-tahoe-accent'; // key
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
          <h3 className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider mb-3">
            Request Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-tahoe-accent w-32 shrink-0">{request.method}</span>
              <span className="text-tahoe-fg">{request.url}</span>
            </div>
            {Object.entries(headers.request || {}).map(([key, value]) => (
              <div key={key} className="flex gap-4 text-xs">
                <span className="font-medium text-tahoe-subtle w-32 shrink-0">{key}</span>
                <span className="text-tahoe-fg break-all">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Headers */}
        <div>
          <h3 className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider mb-3">
            Response Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-tahoe-accent w-32 shrink-0">Status</span>
              <span className={`font-medium ${
                request.status >= 200 && request.status < 300 ? 'text-green-500' :
                request.status >= 400 ? 'text-red-500' : 'text-tahoe-fg'
              }`}>
                {request.status} {request.statusText}
              </span>
            </div>
            {Object.entries(headers.response || {}).map(([key, value]) => (
              <div key={key} className="flex gap-4 text-xs">
                <span className="font-medium text-tahoe-subtle w-32 shrink-0">{key}</span>
                <span className="text-tahoe-fg break-all">{value}</span>
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
            <span className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider">
              Request Body
            </span>
            {body.headers?.['content-type'] && (
              <span className="text-xs text-tahoe-border">
                ({body.headers['content-type']})
              </span>
            )}
          </div>
          <pre
            className="text-xs font-mono bg-tahoe-bg/50 rounded-lg p-4 overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: isJson ? syntaxHighlight(displayContent) : displayContent,
            }}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-tahoe-subtle">No request body</p>
        </div>
      )}
    </div>
  );
}

// Tab: Response
function ResponseTab({ request }) {
  const response = request.response;
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
              <span className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider">
                Response
              </span>
              {contentType && (
                <span className="text-xs text-tahoe-border">({contentType})</span>
              )}
            </div>
            <span className="text-xs text-tahoe-subtle">
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
              className="text-xs font-mono bg-tahoe-bg/50 rounded-lg p-4 overflow-x-auto"
              dangerouslySetInnerHTML={{
                __html: isJson ? syntaxHighlight(displayContent) : displayContent,
              }}
            />
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-tahoe-subtle">No response data</p>
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
          <div className="bg-tahoe-bg/50 rounded-lg p-3">
            <p className="text-xs text-tahoe-subtle mb-1">Total Time</p>
            <p className="text-lg font-semibold text-tahoe-fg">{formatTime(total)}</p>
          </div>
          <div className="bg-tahoe-bg/50 rounded-lg p-3">
            <p className="text-xs text-tahoe-subtle mb-1">Size</p>
            <p className="text-lg font-semibold text-tahoe-fg">{formatBytes(request.size)}</p>
          </div>
          <div className="bg-tahoe-bg/50 rounded-lg p-3">
            <p className="text-xs text-tahoe-subtle mb-1">Status</p>
            <p className={`text-lg font-semibold ${
              request.status >= 200 && request.status < 300 ? 'text-green-500' :
              request.status >= 400 ? 'text-red-500' : 'text-tahoe-fg'
            }`}>
              {request.status}
            </p>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="bg-tahoe-bg/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider mb-4">
            Timing Breakdown
          </h3>
          <div className="space-y-3">
            {phases.map((phase) => {
              const duration = timings[phase.key];
              const percent = total > 0 ? (duration / total) * 100 : 0;

              return (
                <div key={phase.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-tahoe-fg">{phase.label}</span>
                    <span className="text-tahoe-subtle">{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 bg-tahoe-border/30 rounded-full overflow-hidden">
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
        <div className="bg-tahoe-bg/50 rounded-lg p-4">
          <h3 className="text-xs font-semibold text-tahoe-subtle uppercase tracking-wider mb-3">
            Raw Timings
          </h3>
          <div className="space-y-2">
            {phases.map((phase) => (
              <div key={phase.key} className="flex justify-between text-xs">
                <span className="text-tahoe-subtle">{phase.label}</span>
                <span className="font-mono text-tahoe-fg">{formatTime(timings[phase.key])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'headers', label: 'Headers' },
  { id: 'body', label: 'Request Body' },
  { id: 'response', label: 'Response' },
  { id: 'timeline', label: 'Timeline' },
];

export default function RequestInspector() {
  const { selectedRequest } = useNetwork();
  const [activeTab, setActiveTab] = useState('headers');

  if (!selectedRequest) {
    return (
      <div className="h-[40%] flex items-center justify-center border-t border-tahoe-border">
        <p className="text-sm text-tahoe-subtle">Select a request to view details</p>
      </div>
    );
  }

  return (
    <div className="h-[40%] flex flex-col border-t border-tahoe-border">
      {/* Tabs */}
      <div className="h-10 flex items-center gap-1 px-4 border-b border-tahoe-border/50 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-t transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-tahoe-accent text-white'
                : 'text-tahoe-subtle hover:text-tahoe-fg hover:bg-tahoe-hover'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'headers' && <HeadersTab request={selectedRequest} />}
        {activeTab === 'body' && <BodyTab request={selectedRequest} />}
        {activeTab === 'response' && <ResponseTab request={selectedRequest} />}
        {activeTab === 'timeline' && <TimelineTab request={selectedRequest} />}
      </div>
    </div>
  );
}
