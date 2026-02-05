import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@pikoloo/darwin-ui';

/**
 * Confirmation dialog component
 * Usage: <ConfirmDialog isOpen={...} title={...} message={...} onConfirm={...} onCancel={...} />
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" className="z-[99999]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {message && (
            <DialogDescription>{message}</DialogDescription>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for showing confirmation dialogs
 * Returns: [showConfirm, confirmElement]
 * Usage: showConfirm({ title, message, confirmText, cancelText, variant }) => Promise<boolean>
 */
export function useConfirm() {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    resolve: null,
  });

  const showConfirm = ({
    title,
    message,
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'destructive',
  }) => new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve,
      });
    });

  const handleConfirm = () => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...prev, isOpen: false };
    });
  };

  const handleCancel = () => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, isOpen: false };
    });
  };

  const confirmElement = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [showConfirm, confirmElement];
}
