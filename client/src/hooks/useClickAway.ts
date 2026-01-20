import { useEffect, RefObject } from 'react';

export function useClickAway(
  ref: RefObject<HTMLElement>,
  onClickAway: (event: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref?.current;
      if (!element || element.contains(event.target as Node)) {
        return;
      }
      onClickAway(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, onClickAway]);
}