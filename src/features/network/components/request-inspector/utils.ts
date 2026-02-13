/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

/**
 * Format time in milliseconds
 */
export function formatTime(ms: number | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 10) return `${ms.toFixed(1)}ms`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Syntax-highlight JSON string
 */
export function syntaxHighlight(json: string | unknown): string {
  if (typeof json !== 'string') {
    json = JSON.stringify(json, null, 2);
  }
  return (json as string).replace(/("(\\u[a-zA-Z0-9]{4}|\\[^\\u]|[^\\"])*"(\\s*:)?|(true|false|null)\b)/g, (match) => {
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

/**
 * Get status color class based on HTTP status code
 * Replaces nested ternaries for cleaner code
 */
export function getStatusColorClass(status: number | undefined): string {
  const statusCode = status ?? 0;
  if (statusCode >= 200 && statusCode < 300) {
    return 'text-green-500';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'text-orange-500';
  }
  return 'text-zinc-900 dark:text-zinc-100';
}
