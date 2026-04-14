import type * as monacoNs from 'monaco-editor';
import { registerWhistleLanguage } from '../../features/rules/whistle-language';
import { registerTahoeThemes } from '../../features/rules/monaco-themes';

interface PrepareMonacoBeforeMountOptions {
  language?: string;
  beforeMount?: (monaco: typeof monacoNs) => void;
}

export function prepareMonacoBeforeMount(
  monaco: typeof monacoNs,
  options: PrepareMonacoBeforeMountOptions = {},
): void {
  const { language = 'whistle', beforeMount } = options;

  registerTahoeThemes(monaco);

  if (language === 'whistle') {
    registerWhistleLanguage(monaco);
  }

  beforeMount?.(monaco);
}
