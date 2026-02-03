import { useEffect, useRef, useState, React } from 'react';

export default function Modal({ isOpen, title, message, defaultValue = '', onConfirm, onCancel }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = inputRef.current?.value || '';
    onConfirm(value);
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-tahoe-bg border border-tahoe-border rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-tahoe-fg mb-2">{title}</h2>
        {message && <p className="text-sm text-tahoe-subtle mb-4">{message}</p>}

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            defaultValue={defaultValue}
            className="w-full h-10 px-3 rounded-lg bg-tahoe-bg/50 border border-tahoe-border text-tahoe-fg placeholder:text-tahoe-subtle focus:border-tahoe-accent focus:ring-2 focus:ring-tahoe-accent/20 outline-none transition-all mb-4"
            autoComplete="off"
          />

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="h-9 px-5 rounded-lg font-medium text-sm bg-tahoe-border text-tahoe-fg hover:bg-tahoe-hover transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-lg font-medium text-sm bg-tahoe-accent text-white hover:opacity-90 transition-all"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Simple prompt-like hook that uses Modal component
 * Returns: [showPrompt, promptElement]
 * Usage: showPrompt({ title, message, defaultValue }) => Promise<string | null>
 */
export function usePrompt() {
  const [state, setState] = React.useState({
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
