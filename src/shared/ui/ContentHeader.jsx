const viewNames = {
  network: 'Network',
  rules: 'Rules',
  values: 'Values',
  settings: 'Settings',
};

export default function ContentHeader({ activeView }) {
  return (
    <header
      className="
        app-drag h-12 shrink-0 flex items-center
        px-4 border-b border-zinc-200/70 dark:border-zinc-800/70
        bg-white/85 dark:bg-zinc-950/80 backdrop-blur-xl
      "
      onDoubleClick={() => window.electron?.toggleMaximizeWindow?.()}
    >
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Prokcy
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {viewNames[activeView] || 'Overview'}
        </span>
      </div>
    </header>
  );
}
