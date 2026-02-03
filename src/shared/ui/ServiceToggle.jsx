import { useService } from '../context/ServiceContext';

export default function ServiceToggle() {
  const {
    isRunning, isStarting, isStopping, isApiAvailable, toggleService,
  } = useService();

  const handleToggle = () => {
    toggleService();
  };

  const isTransitioning = isStarting || isStopping;
  const isActive = isRunning;
  const isUnavailable = !isApiAvailable;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isTransitioning || isUnavailable}
      role="switch"
      aria-checked={isActive}
      className={`
        relative
        inline-flex h-5 w-9 shrink-0 items-center rounded-full
        border transition-colors duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400/70
        focus-visible:ring-offset-zinc-900
        disabled:cursor-not-allowed disabled:opacity-50
        ${isActive ? 'border-emerald-500/80 bg-emerald-500' : 'border-zinc-500/70 bg-zinc-600/60'}
        ${isUnavailable ? 'grayscale' : ''}
      `}
      aria-label={isActive ? 'Stop service' : 'Start service'}
      title={isUnavailable ? 'Service control unavailable - restart app' : (isActive ? 'Stop service' : 'Start service')}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white
          shadow-[0_1px_2px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,0,0,0.08)]
          transition-transform duration-200 ease-out
          ${isActive ? 'translate-x-4' : 'translate-x-0'}
          ${isTransitioning ? 'scale-95' : 'scale-100'}
        `}
      />
    </button>
  );
}
