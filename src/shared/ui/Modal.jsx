import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from '@pikoloo/darwin-ui';

export default function Modal({
  isOpen, title, message, defaultValue = '', onConfirm, onCancel,
}) {
  const inputRef = useRef(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus the input when modal opens
      const input = inputRef.current?.querySelector?.('input');
      if (input) {
        input.focus();
        input.select();
      }
    }
    setValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="md" className="z-9999">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {message && (
            <DialogDescription>{message}</DialogDescription>
          )}

          <Input
            ref={inputRef}
            placeholder="Enter value..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleConfirm();
              }
            }}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
            >
              OK
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple prompt-like hook that uses Modal component
 * Returns: [showPrompt, promptElement]
 * Usage: showPrompt({ title, message, defaultValue }) => Promise<string | null>
 */
export function usePrompt() {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    defaultValue: '',
    resolve: null,
  });

  const showPrompt = ({ title, message, defaultValue = '' }) => new Promise((resolve) => {
    setState({
      isOpen: true,
      title,
      message,
      defaultValue,
      resolve,
    });
  });

  const handleConfirm = (value) => {
    setState((prev) => {
      prev.resolve?.(value || null);
      return { ...prev, isOpen: false };
    });
  };

  const handleCancel = () => {
    setState((prev) => {
      prev.resolve?.(null);
      return { ...prev, isOpen: false };
    });
  };

  const promptElement = (
    <Modal
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      defaultValue={state.defaultValue}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return [showPrompt, promptElement];
}
