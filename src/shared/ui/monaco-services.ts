import type { editor } from 'monaco-editor';

const MONACO_PRODUCT_SERVICE = {
  quality: 'stable',
};

export function createMonacoOverrideServices(): editor.IEditorOverrideServices {
  return {
    productService: MONACO_PRODUCT_SERVICE,
  };
}
