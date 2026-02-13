import type { TabProps, ParsedRuleValue, RuleTypeConfig } from './types';

// Rule type configurations for visual differentiation
export const RULE_TYPE_CONFIG: Record<string, RuleTypeConfig> = {
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

/**
 * Check if a value has meaningful content (not empty object/array/string)
 */
export function hasMeaningfulValue(value: unknown): boolean {
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
}

/**
 * Convert value to string safely
 */
export function valueToString(value: unknown): string {
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
}

/**
 * Parse rule value to extract protocol, value, and pattern
 */
export function parseRuleValue(rule: unknown): ParsedRuleValue {
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
}

/**
 * Get rule configuration by type
 */
function getRuleConfig(type: string | unknown): RuleTypeConfig {
  const typeStr = typeof type === 'string' ? type : String(type);
  const config = RULE_TYPE_CONFIG[typeStr.toLowerCase()];
  return config ?? { color: 'from-slate-500 to-zinc-600', label: typeStr };
}

export function RulesTab({ request }: TabProps): React.JSX.Element {
  const rules = request?.rules ?? {};

  // Filter rules to only include meaningful ones
  const ruleEntries = Object.entries(rules).filter(([, rule]) => {
    if (!rule) {
      return false;
    }
    const ruleObj = rule as { pattern?: unknown; value?: unknown };
    // Check for pattern (non-empty string)
    const hasPattern = typeof ruleObj.pattern === 'string' && ruleObj.pattern.trim();
    // Check for value with meaningful content
    return hasPattern || hasMeaningfulValue(ruleObj.value);
  }) as [string, unknown][];

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
