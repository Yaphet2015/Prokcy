import { useEffect } from 'react';

interface KeysListProps {
  values: Record<string, string>;
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  onCreateValue: () => void;
}

export default function KeysList({
  values,
  selectedKey,
  onSelectKey,
  onCreateValue,
}: KeysListProps): React.JSX.Element {
  const handleDoubleClick = () => {
    onCreateValue();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key when in inline mode: cancel and trigger create
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('values-end-create'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreateValue]);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {(Object.keys(values) as string[]).map((key) => {
        const isSelected = selectedKey === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectKey(key)}
            onDoubleClick={handleDoubleClick}
            className={`
              w-full text-left px-3 py-2 rounded-lg
              transition-all duration-150
              ${isSelected
              ? 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30 dark:border-blue-500/40'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-transparent'
              }
            `}
            title={key}
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm truncate ${isSelected ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {key}
              </span>
              {selectedKey === key && (
                <span className="text-xs text-blue-500 ml-2">●</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
