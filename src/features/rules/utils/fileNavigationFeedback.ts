interface FileNavigationFeedbackResult {
  success?: boolean;
  code?: string;
  message?: string;
}

export function getFileNavigationFeedbackMessage(result: FileNavigationFeedbackResult): string | null {
  if (result.success) {
    return null;
  }

  switch (result.code) {
    case 'unsupported_target':
      return 'This Whistle file target is not a local file path.';
    case 'file_not_found':
      return result.message ? `Local file not found: ${result.message}` : 'Local file not found.';
    case 'open_failed':
      return result.message || 'Failed to open the local file.';
    default:
      return result.message || 'Failed to open the file target.';
  }
}
