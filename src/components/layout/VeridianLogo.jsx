import { useThemeDark } from '@/hooks/useThemeDark';

export default function VeridianLogo({ size = 32, className = '' }) {
  const dark = useThemeDark();
  const src = dark ? '/veridian-logo-dark.png' : '/veridian-logo-light.png';

  return (
    <img
      src={src}
      alt="Veridian"
      width={size}
      height={size}
      className={`veridian-logo ${className}`.trim()}
      draggable={false}
    />
  );
}
