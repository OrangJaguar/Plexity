import { useContext } from 'react';
import { ToolCapabilitiesContext } from '@/providers/ToolCapabilitiesProvider';

/**
 * @returns {import('@/providers/ToolCapabilitiesProvider').ToolCapabilitiesValue}
 */
export function useToolCapabilities() {
  const ctx = useContext(ToolCapabilitiesContext);
  if (!ctx) {
    throw new Error('useToolCapabilities must be used within ToolCapabilitiesProvider');
  }
  return ctx;
}
