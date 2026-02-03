import { useEffect, useRef, useState } from 'react';
import { Modal as DarwinModal, Button, Input } from '@pikoloo/darwin-ui';

export default function Modal({ isOpen, title, message, defaultValue = '', onConfirm, onCancel }) {
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
    <DarwinModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        {message && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
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
      </div>
    </DarwinModal>
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

  const showPrompt = ({ title, message, defaultValue = '' }) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        message,
        defaultValue,
        resolve,
      });
    });
  };

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
