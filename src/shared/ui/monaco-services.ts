import type { editor } from 'monaco-editor';
import { MONACO_PRODUCT_SERVICE } from './monaco-product-service';

export function createMonacoOverrideServices(): editor.IEditorOverrideServices {
  return {
    productService: MONACO_PRODUCT_SERVICE,
  };
}
