import { useEffect, useRef, useState } from 'react';

/**
 * Tracks an element's content box. react-window needs explicit pixel
 * dimensions, and this keeps them in sync with a CSS-driven layout.
 */
export function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
