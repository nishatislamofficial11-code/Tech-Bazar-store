import { useEffect, useState } from 'react';

export const PageLoader = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      <span className="route-loading__bar" />
    </div>
  );
};
