import { useToolCapabilities } from '@/hooks/useToolCapabilities';

/**
 * Declarative capability gate. Renders children only when the named capability is true.
 * UI gating only — backend authorization is separate.
 *
 * @param {{ name: string, children: import('react').ReactNode, fallback?: import('react').ReactNode }} props
 */
export default function ToolCapability({ name, children, fallback = null }) {
  const { has } = useToolCapabilities();
  if (!has(name)) return fallback;
  return children;
}
