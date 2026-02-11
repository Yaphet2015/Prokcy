/**
 * UI component type definitions
 */

import type { ReactNode } from 'react';

// Common props for components that handle visibility
export interface VisibilityProps {
  show?: boolean;
  onShow?: () => void;
  onHide?: () => void;
}

// Modal/Dialog props
export interface ModalProps extends VisibilityProps {
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
}

export interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Editor props
export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

// View types
export type ViewType = 'network' | 'rules' | 'values' | 'settings';

export interface ViewConfig {
  id: ViewType;
  label: string;
  icon?: string;
}
