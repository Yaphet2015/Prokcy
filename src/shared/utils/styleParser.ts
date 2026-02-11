/**
 * Parse style:// protocol value into CSS style object
 *
 * Format: bg-color:#f0f9ff,text-color:#0369a1,border-left:3px solid #0ea5e9,font-weight:bold
 *
 * Supported properties:
 * - bg-color / background-color: Background color
 * - text-color / color: Text color
 * - border / border-left: Left border style
 * - font-weight: Font weight (bold, normal, 100-900)
 */

export interface ParsedStyles {
  backgroundColor?: string;
  color?: string;
  borderLeft?: string;
  fontWeight?: string;
}

/**
 * Parse a single style value string into CSS properties
 * @param styleValue - The style:// protocol value
 * @returns Object with CSS properties or null
 */
export function parseStyleValue(styleValue: string | null | undefined): ParsedStyles | null {
  if (!styleValue || typeof styleValue !== 'string') {
    return null;
  }

  const styles: ParsedStyles = {};
  const parts = styleValue.split(',');

  for (const part of parts) {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim().toLowerCase();
    const value = part.slice(separatorIndex + 1).trim();

    if (!value) {
      continue;
    }

    switch (key) {
      case 'bg-color':
      case 'background-color':
        styles.backgroundColor = value;
        break;
      case 'text-color':
      case 'color':
        styles.color = value;
        break;
      case 'border':
      case 'border-left':
        styles.borderLeft = value;
        break;
      case 'font-weight':
        styles.fontWeight = value;
        break;
    }
  }

  return Object.keys(styles).length > 0 ? styles : null;
}

/**
 * Get parsed styles from a request object
 * @param request - Network request object with rules property
 * @returns Parsed CSS styles or null
 */
export function getRequestStyles(request: { rules?: { style?: { value?: string } } | null } | null | undefined): ParsedStyles | null {
  if (!request || typeof request !== 'object') {
    return null;
  }

  const styleRule = request?.rules?.style;
  if (!styleRule || !styleRule.value) {
    return null;
  }

  return parseStyleValue(styleRule.value);
}
