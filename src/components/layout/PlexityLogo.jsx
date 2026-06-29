import { logoPathForTheme, SITE_NAME } from '@/lib/branding/constants';
import { useThemeDark } from '@/hooks/useThemeDark';

export default function PlexityLogo({ size = 32, className = '', alt }) {
  const dark = useThemeDark();

  return (
    <img
      src={logoPathForTheme(dark)}
      alt={alt ?? SITE_NAME}
      width={size}
      height={size}
      className={`app-logo ${className}`.trim()}
      draggable={false}
    />
  );
}
