import { useEffect, useMemo, useState } from 'react';
import { Button } from '@pikoloo/darwin-ui';
import { FileText } from 'lucide-react';
import type { TabProps } from './types';
import { getStatusColorClass } from './utils';
import {
  buildRawHttpRequest,
  getHeaderRows,
  getHeaderValues,
  parseRequestCookies,
  parseResponseSetCookies,
  type HeaderRow as HeaderRowData,
  type ParsedCookie,
  type ParsedSetCookie,
} from './headerDetails';

const EMPTY_HEADERS = {
  request: {},
  response: {},
};

function HeaderRow({ name, value }: HeaderRowData): React.JSX.Element {
  return (
    <div className="flex gap-4 text-xs">
      <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32 shrink-0">{name}</span>
      <span className="text-zinc-900 dark:text-zinc-100 break-all">{value}</span>
    </div>
  );
}

function CookieRow({ cookie }: { cookie: ParsedCookie }): React.JSX.Element {
  return (
    <div className="flex gap-4 text-xs">
      <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32 shrink-0">{cookie.name}</span>
      <span className="text-zinc-900 dark:text-zinc-100 break-all">{cookie.value}</span>
    </div>
  );
}

function SetCookieRow({ cookie }: { cookie: ParsedSetCookie }): React.JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex gap-4 text-xs">
        <span className="font-medium text-zinc-500 dark:text-zinc-400 w-32 shrink-0">{cookie.name}</span>
        <span className="text-zinc-900 dark:text-zinc-100 break-all">{cookie.value}</span>
      </div>
      {cookie.attributes.length > 0 ? (
        <div className="pl-36 text-xs text-zinc-500 dark:text-zinc-400 break-all">
          {cookie.attributes.join('; ')}
        </div>
      ) : null}
    </div>
  );
}

export function HeadersTab({ request }: TabProps): React.JSX.Element {
  const [showRawHttp, setShowRawHttp] = useState(false);
  const headers = request?.headers ?? EMPTY_HEADERS;
  const requestHeaderRows = useMemo(() => getHeaderRows(headers.request), [headers.request]);
  const responseHeaderRows = useMemo(() => getHeaderRows(headers.response), [headers.response]);
  const requestCookies = useMemo(
    () => parseRequestCookies(getHeaderValues(headers.request, 'cookie')),
    [headers.request],
  );
  const responseCookies = useMemo(
    () => parseResponseSetCookies(getHeaderValues(headers.response, 'set-cookie')),
    [headers.response],
  );
  const rawHttpText = useMemo(() => buildRawHttpRequest(request), [request]);
  const hasCookieData = requestCookies.length > 0 || responseCookies.length > 0;

  useEffect(() => {
    setShowRawHttp(false);
  }, [request?.id]);

  return (
    <div className="p-4 pb-8 h-full overflow-y-auto">
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Request Headers
            </h3>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 hover:dark:text-zinc-950"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => setShowRawHttp((current) => !current)}
            >
              {showRawHttp ? 'Hide Raw HTTP' : 'Raw HTTP'}
            </Button>
          </div>
          {showRawHttp ? (
            <div className="mb-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60">
              <pre className="max-h-72 overflow-auto p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-all">
                {rawHttpText || 'No raw request data'}
              </pre>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-blue-500 w-32 shrink-0">{request?.method ?? ''}</span>
              <span className="text-zinc-900 dark:text-zinc-100">{request?.url ?? ''}</span>
            </div>
            {requestHeaderRows.map((row, index) => (
              <HeaderRow key={`${row.name}-${index}`} name={row.name} value={row.value} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Cookies
          </h3>
          {hasCookieData ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Request Cookies
                </h4>
                {requestCookies.length > 0 ? (
                  <div className="space-y-1.5">
                    {requestCookies.map((cookie, index) => (
                      <CookieRow key={`${cookie.name}-${index}`} cookie={cookie} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No request cookies</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                  Response Set-Cookie
                </h4>
                {responseCookies.length > 0 ? (
                  <div className="space-y-2">
                    {responseCookies.map((cookie, index) => (
                      <SetCookieRow key={`${cookie.name}-${index}`} cookie={cookie} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">No response Set-Cookie headers</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">No cookie data</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Response Headers
          </h3>
          <div className="space-y-1.5">
            <div className="flex gap-4 text-xs">
              <span className="font-medium text-blue-500 w-32 shrink-0">Status</span>
              <span className={`font-medium ${getStatusColorClass(request?.status)}`}>
                {request?.status ?? 0}
                {' '}
                {request?.statusText ?? ''}
              </span>
            </div>
            {responseHeaderRows.map((row, index) => (
              <HeaderRow key={`${row.name}-${index}`} name={row.name} value={row.value} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
