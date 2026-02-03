import { useState, useMemo } from 'react';
import Input from '../../../shared/ui/Input';

export default function KeysList({ values, selectedKey, onSelectKey, onCreateValue }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredKeys = useMemo(() => {
    const keys = Object.keys(values).sort();
    if (!searchQuery) return keys;
    const query = searchQuery.toLowerCase();
    return keys.filter(key => key.toLowerCase().includes(query));
  }, [values, searchQuery]);

  const handleCreate = () => {
    const name = prompt('Enter new value name:');
    if (name && name.trim()) {
      onCreateValue(name.trim());
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-tahoe-border/70">
        <Input
          placeholder="Search values..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
      </div>

      {/* Keys list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredKeys.length === 0 ? (
          <div className="text-center text-tahoe-subtle text-sm py-8">
            {searchQuery ? 'No matching values' : 'No values yet'}
          </div>
        ) : (
          filteredKeys.map(key => (
            <button
              key={key}
              onClick={() => onSelectKey(key)}
              className={`w-full px-3 py-2 rounded-lg border transition-all text-left ${selectedKey === key ? 'border-tahoe-accent bg-tahoe-accent/10' : 'border-transparent hover:border-tahoe-border hover:bg-tahoe-hover'}`}
            >
              <span className="text-sm font-medium truncate block">{key}</span>
            </button>
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-3 border-t border-tahoe-border/70">
        <button
          onClick={handleCreate}
          className="w-full h-9 px-5 rounded-lg font-medium text-sm bg-tahoe-accent text-white hover:opacity-90 transition-all"
        >
          Add New Value
        </button>
      </div>
    </div>
  );
}
