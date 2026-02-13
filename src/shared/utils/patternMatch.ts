/**
 * Convert a wildcard pattern to a RegExp
 *
 * Wildcard rules:
 * - * matches any sequence of characters (including empty)
 * - All other characters are escaped and matched literally
 *
 * @param pattern - Wildcard pattern (e.g., "*.google.com", "/api/*")
 * @returns RegExp that matches strings according to the wildcard pattern
 */
function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex characters, then replace escaped * with .* pattern
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Check if a URL matches any of the filter patterns
 *
 * @param url - The full URL to check (e.g., "https://www.google.com/api/data")
 * @param patterns - Array of wildcard patterns to match against
 * @returns true if the URL matches any pattern (should be filtered out)
 */
export function matchesFilterPatterns(url: string, patterns: string[]): boolean {
  if (!url || !patterns.length) {
    return false;
  }

  const targets = [url];
  try {
    const parsed = new URL(url);
    targets.push(
      parsed.hostname,
      parsed.host,
      parsed.pathname,
      `${parsed.pathname}${parsed.search}`,
      `${parsed.host}${parsed.pathname}${parsed.search}`,
    );
  } catch {
    // Keep full URL only when parsing fails.
  }

  return patterns.some((pattern) => {
    if (!pattern || !pattern.trim()) {
      return false;
    }
    try {
      const regex = wildcardToRegex(pattern.trim());
      return targets.some((target) => regex.test(target));
    } catch {
      // Invalid pattern, skip it
      return false;
    }
  });
}

/**
 * Filter out requests whose URL matches any pattern.
 *
 * @param requests - Request-like objects containing a `url` field
 * @param patterns - Array of wildcard patterns to exclude
 * @returns Requests that do not match any filter pattern
 */
export function filterRequestsByPatterns<T extends { url: string }>(
  requests: T[],
  patterns: string[]
): T[] {
  if (!requests.length || !patterns.length) {
    return requests;
  }
  return requests.filter((request) => !matchesFilterPatterns(request.url, patterns));
}

/**
 * Parse filter patterns from a multiline string
 *
 * @param filterString - Multiline string with one pattern per line
 * @returns Array of trimmed, non-empty patterns
 */
export function parseFilterPatterns(filterString: string): string[] {
  if (!filterString || typeof filterString !== 'string') {
    return [];
  }
  return filterString
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
