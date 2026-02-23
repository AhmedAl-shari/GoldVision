/**
 * Chip Component - Feature tier badges
 * Used to label features as MVP, Enhanced, or Experimental
 */

interface ChipProps {
  label: string;
  tone?: 'default' | 'mvp' | 'enhanced' | 'experimental';
  size?: 'sm' | 'md';
}

export function Chip({ label, tone = 'default', size = 'sm' }: ChipProps) {
  const toneClasses = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    mvp: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    enhanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    experimental: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${toneClasses[tone]} ${sizeClasses[size]}`}
    >
      {label}
    </span>
  );
}

