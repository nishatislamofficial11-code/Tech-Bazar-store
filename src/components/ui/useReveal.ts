import { useEffect, useRef, useState } from 'react';
import { isBot } from '../../lib/isBot';

/**
 * Fade-and-rise animation the first time an element scrolls into view.
 * Returns a ref and a class to put on the element. Robots and visitors who ask for
 * reduced motion see the content straight away.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return true;
    if (isBot()) return true;
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  });

  useEffect(() => {
    if (shown || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const className = `transition-[opacity,transform] duration-700 ease-out will-change-transform ${shown ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'}`;
  return { ref, className };
}
