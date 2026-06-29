import { LOGO_PATH, SITE_NAME } from '@/lib/branding/constants';

export default function PlexityLogo({ size = 32, className = '' }) {
  return (
    <img
      src={LOGO_PATH}
      alt={SITE_NAME}
      width={size}
      height={size}
      className={`app-logo ${className}`.trim()}
      draggable={false}
    />
  );
}
