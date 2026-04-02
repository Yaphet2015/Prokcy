import { registerSingleton } from 'monaco-editor/esm/vs/platform/instantiation/common/extensions.js';
import { IProductService } from 'monaco-editor/esm/vs/platform/product/common/productService.js';

export const MONACO_PRODUCT_SERVICE = {
  quality: 'stable',
} as const;

class MonacoProductService {
  quality = MONACO_PRODUCT_SERVICE.quality;
}

let monacoProductServiceRegistered = false;

export function ensureMonacoProductServiceRegistered(): void {
  if (monacoProductServiceRegistered) {
    return;
  }

  registerSingleton(IProductService, MonacoProductService, false);
  monacoProductServiceRegistered = true;
}
