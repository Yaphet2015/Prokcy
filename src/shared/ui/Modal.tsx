import { useEffect, useRef, useState } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
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

// Props
interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function Modal({
  isOpen,
  title,
  message,
  defaultValue = '',
  onConfirm,
  onCancel,
}: ModalProps): React.JSX.Element {
  const inputRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when modal opens
      const input = inputRef.current?.querySelector?.('input');
      if (input instanceof HTMLInputElement) {
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
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

// Types for usePrompt hook
interface PromptState {
  isOpen: boolean;
  title: string;
  message: string;
  defaultValue: string;
  resolve: ((value: string | null) => void) | null;
}

interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
}

type ShowPromptFunction = (options: PromptOptions) => Promise<string | null>;

/**
 * Simple prompt-like hook that uses Modal component
 * Returns: [showPrompt, promptElement]
 * Usage: showPrompt({ title, message, defaultValue }) => Promise<string | null>
 */
export function usePrompt(): [ShowPromptFunction, ReactNode] {
  const [state, setState] = useState<PromptState>({
    isOpen: false,
    title: '',
    message: '',
    defaultValue: '',
    resolve: null,
  });

  const showPrompt: ShowPromptFunction = ({ title, message, defaultValue = '' }) =>
    new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message: message ?? '',
        defaultValue,
        resolve: (value) => resolve(value),
      });
    });

  const handleConfirm = (value: string) => {
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
