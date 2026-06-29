import { useEffect, useState } from 'react';

export function useThemeDark() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains('dark'));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
