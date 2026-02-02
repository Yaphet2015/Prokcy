import { useService } from '../context/ServiceContext';

/**
 * Industrial Power Switch - Service Toggle Control
 *
 * A distinctive mechanical toggle switch inspired by industrial equipment controls.
 * Features chunky toggle animations, status indicator lights, and tactile feedback.
 */
export default function ServiceToggle() {
  const { isRunning, isStarting, isStopping, isApiAvailable, toggleService } = useService();

  const handleToggle = () => {
    toggleService();
  };

  const isTransitioning = isStarting || isStopping;
  const isActive = isRunning;
  const isUnavailable = !isApiAvailable;

  return (
    <button
      onClick={handleToggle}
      disabled={isTransitioning || isUnavailable}
      className={`
        power-switch
        relative
        w-20 h-12
        rounded-xl
        overflow-hidden
        cursor-pointer
        select-none
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-50
        ${isUnavailable ? 'opacity-40 grayscale' : ''}
      `}
      aria-label={isActive ? 'Stop service' : 'Start service'}
      title={isUnavailable ? 'Service control unavailable - restart app' : (isActive ? 'Stop service' : 'Start service')}
    >
      {/* Background channel */}
      <div className={`
        absolute inset-0
        rounded-xl
        transition-all duration-300
        ${isActive
          ? 'bg-emerald-950 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]'
          : 'bg-zinc-900 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]'
        }
      `} />

      {/* Mechanical texture overlay */}
      <div className="
        absolute inset-0
        opacity-20
        bg-[repeating-linear-gradient(90deg,transparent,transparent_1px,rgba(0,0,0,0.3)_1px,rgba(0,0,0,0.3)_2px)]
        pointer-events-none
      " />

      {/* Active glow effect */}
      {isActive && (
        <div className="
          absolute inset-0
          bg-emerald-500/10
          animate-pulse
          pointer-events-none
        " />
      )}

      {/* Toggle handle */}
      <div className={`
        absolute top-1 bottom-1
        w-10
        rounded-lg
        transition-all duration-300
        ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]
        flex items-center justify-center
        ${isActive
          ? 'left-[calc(100%-2.5rem)] bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg'
          : 'left-1 bg-gradient-to-br from-zinc-400 to-zinc-600 shadow-lg'
        }
        ${isTransitioning ? 'scale-95' : 'scale-100'}
      `}>
        {/* Handle texture */}
        <div className="
          w-8 h-6
          rounded
          bg-gradient-to-b
          from-white/20 to-transparent
          flex items-center justify-center
        ">
          {/* Grip lines */}
          <div className="
            flex gap-0.5
            ${isActive ? 'flex-row' : 'flex-row-reverse'}
          ">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`
                  w-0.5 h-3 rounded-full
                  ${isActive ? 'bg-emerald-950/40' : 'bg-zinc-800/40'}
                `}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status indicator LED */}
      <div className={`
        absolute top-1.5 right-1.5
        w-2.5 h-2.5 rounded-full
        transition-all duration-300
        ${isActive
          ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
          : 'bg-zinc-700'
        }
      `}>
        {/* LED glow center */}
        {isActive && (
          <div className="
            absolute inset-0.5
            bg-emerald-200 rounded-full
            animate-pulse
          " />
        )}
      </div>

      {/* Label text */}
      <div className="
        absolute bottom-0.5 left-0 right-0
        flex justify-center
        pointer-events-none
      ">
        <span className={`
          text-[9px] font-bold tracking-wider uppercase
          transition-all duration-300
          ${isActive
            ? 'text-emerald-400/80 drop-shadow-[0_0_4px_rgba(52,211,153,0.5)]'
            : 'text-zinc-600'
          }
        `}>
          {isStarting ? 'START' : isStopping ? 'STOP' : isActive ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Industrial border */}
      <div className="
        absolute inset-0
        rounded-xl
        border-2 border-zinc-700/50
        pointer-events-none
      " />

      {/* Corner accents */}
      <div className="
        absolute inset-0
        rounded-xl
        pointer-events-none
      ">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`
              absolute w-2 h-2
              ${i === 0 ? 'top-0 left-0 border-t-2 border-l-2 border-l-zinc-600/50 border-t-zinc-600/50 rounded-tl-lg' : ''}
              ${i === 1 ? 'top-0 right-0 border-t-2 border-r-2 border-r-zinc-600/50 border-t-zinc-600/50 rounded-tr-lg' : ''}
              ${i === 2 ? 'bottom-0 left-0 border-b-2 border-l-2 border-b-zinc-600/50 border-l-zinc-600/50 rounded-bl-lg' : ''}
              ${i === 3 ? 'bottom-0 right-0 border-b-2 border-r-2 border-b-zinc-600/50 border-r-zinc-600/50 rounded-br-lg' : ''}
            `}
          />
        ))}
      </div>

      {/* Animated transition shimmer */}
      {isTransitioning && (
        <div className="
          absolute inset-0
          bg-gradient-to-r from-transparent via-white/10 to-transparent
          animate-shimmer
          pointer-events-none
        " />
      )}
    </button>
  );
}
