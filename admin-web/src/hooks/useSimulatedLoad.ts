import { useEffect, useState } from 'react';

/** Brief fetch simulation so list pages show their loading state. */
export function useSimulatedLoad(ms = 450) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return loading;
}

