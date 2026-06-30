import { useId } from 'react';
import { useThemeDark } from '@/hooks/useThemeDark';

/** Plexity P outline — stem + bowl */
const P_OUTLINE =
  'M 14 9 V 47 H 23 V 31 H 31 C 40 31 44 25 44 19 C 44 11 39 9 31 9 H 14 Z';

/** Counter (bowl cutout) — positioned in the upper bowl of the P */
const P_COUNTER =
  'M 23 14 H 31 C 37 14 39 17 39 20.5 C 39 24 37 26 31 26 H 23 V 14 Z';

const P_SHAPE = `${P_OUTLINE} ${P_COUNTER}`;

/**
 * Branded loading indicator — solid P with bowl cutout and clipped accent fluid sweep.
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
          <path d={P_SHAPE} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="4" y1="8" x2="52" y2="48">
          <stop offset="0%" stopColor="var(--accent, #22c55e)" stopOpacity="0" />
          <stop offset="42%" stopColor="var(--accent, #22c55e)" stopOpacity="0.65" />
          <stop offset="100%" stopColor="var(--accent, #22c55e)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="app-loading-p-base"
        d={P_SHAPE}
        fill={logoFill}
        fillRule="evenodd"
        clipRule="evenodd"
      />
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
