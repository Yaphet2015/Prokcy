import type { TabProps } from './types';
import { getStatusColorClass } from './utils';

export function HeadersTab({ request }: TabProps): React.JSX.Element {
  const headers = request?.headers ?? { request: {}, response: {} };

  return (
    <div className="p-4 pb-8 h-full overflow-y-auto">
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
              <span className={`font-medium ${getStatusColorClass(request?.status)}`}>
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
