export default function ProgressBar({ value, label, active = false, className = '', variant = 'default' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const isConfidence = variant === 'confidence';

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-1.5 rounded-full bg-offset overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-[1600ms] ease-out ${
          isConfidence ? '' : active ? 'bg-brand animate-pulse' : 'bg-brand'
        }`}
        style={
          isConfidence
            ? { width: `${clamped}%`, backgroundColor: `hsl(${Math.round((clamped / 100) * 120)}, 70%, 45%)` }
            : { width: `${clamped}%` }
        }
      />
    </div>
  );
}
