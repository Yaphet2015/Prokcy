import { lazy } from 'react';
import { loadMonacoEditor } from './monaco-loader';

const LazyMonacoEditor = lazy(
  () => loadMonacoEditor().then((module) => ({ default: module.default })),
);

export default LazyMonacoEditor;
