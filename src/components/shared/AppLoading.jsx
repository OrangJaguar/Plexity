import { useId } from 'react';
import { useThemeDark } from '@/hooks/useThemeDark';

const V_SHAPE = 'M 11 13 L 28 47 L 45 13 L 37.5 13 L 28 31.5 L 18.5 13 Z';

/**
 * Branded loading indicator — solid V with a clipped accent fluid sweep inside.
 * Logo fill stays pure white (dark) or black (light); no opacity pulsing on the mark.
 */
export default function AppLoading({
  fullPage = false,
  size = 'md',
  label = null,
  className = '',
}) {
  const dark = useThemeDark();
  const clipId = useId();
  const gradId = useId();
  const sizeClass = size === 'sm' ? 'app-loading--sm' : size === 'lg' ? 'app-loading--lg' : '';
  const logoFill = dark ? '#ffffff' : '#000000';

  const svg = (
    <svg
      className={`app-loading-mark ${sizeClass}`}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={V_SHAPE} />
        </clipPath>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="4" y1="8" x2="52" y2="48">
          <stop offset="0%" stopColor="var(--accent, #22c55e)" stopOpacity="0" />
          <stop offset="42%" stopColor="var(--accent, #22c55e)" stopOpacity="0.65" />
          <stop offset="100%" stopColor="var(--accent, #22c55e)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="app-loading-v-base" d={V_SHAPE} fill={logoFill} />
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="app-loading-fluid"
          x="-18"
          y="-18"
          width="92"
          height="92"
          fill={`url(#${gradId})`}
        />
      </g>
    </svg>
  );

  const content = (
    <div className={`app-loading ${sizeClass} ${className}`.trim()} role="status" aria-live="polite">
      {svg}
      {label && <p className="app-loading-label">{label}</p>}
      {!label && <span className="sr-only">Loading</span>}
    </div>
  );

  if (fullPage) {
    return <div className="app-loading-page">{content}</div>;
  }

  return content;
}
