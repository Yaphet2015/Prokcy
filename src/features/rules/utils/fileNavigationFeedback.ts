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
    case 'file_create_failed':
      return result.message ? `Failed to create local file: ${result.message}` : 'Failed to create local file.';
    case 'open_failed':
      return result.message || 'Failed to open the local file.';
    default:
      return result.message || 'Failed to open the file target.';
  }
}
