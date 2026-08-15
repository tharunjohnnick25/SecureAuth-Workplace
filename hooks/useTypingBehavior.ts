import { useState, useCallback, useRef, useMemo } from 'react';

export interface TypingPattern {
  key: string;
  dwellTime: number;
  flightTime: number;
}

export function useTypingBehavior() {
  const [patterns, setPatterns] = useState<TypingPattern[]>([]);
  const lastKeyDown = useRef<Record<string, number>>({});
  const lastKeyUpTime = useRef<number | null>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent | any) => {
    const now = performance.now();
    const key = e.key;

    // Track the start of the key press
    lastKeyDown.current[key] = now;
  }, []);

  const handleKeyUp = useCallback((e: React.KeyboardEvent | any) => {
    const now = performance.now();
    const key = e.key;
    const keyDownTime = lastKeyDown.current[key];

    if (keyDownTime) {
      const dwellTime = now - keyDownTime;
      const flightTime = lastKeyUpTime.current ? now - lastKeyUpTime.current : 0;

      setPatterns(prev => [...prev.slice(-49), { // Keep last 50 samples
        key,
        dwellTime,
        flightTime
      }]);

      delete lastKeyDown.current[key];
      lastKeyUpTime.current = now;
    }
  }, []);

  const resetMetrics = () => {
    setPatterns([]);
    lastKeyDown.current = {};
    lastKeyUpTime.current = null;
  };

  const averageDwellTime = useMemo(() => {
    if (patterns.length === 0) return 0;
    const sum = patterns.reduce((acc, curr) => acc + curr.dwellTime, 0);
    return sum / patterns.length;
  }, [patterns]);

  const averageFlightTime = useMemo(() => {
    if (patterns.length === 0) return 0;
    const sum = patterns.reduce((acc, curr) => acc + curr.flightTime, 0);
    return sum / patterns.length;
  }, [patterns]);

  return { 
    patterns, 
    handleKeyDown, 
    handleKeyUp, 
    resetMetrics,
    averageDwellTime,
    averageFlightTime,
    // Add compatibility with old names if needed, but patterns is cleaner
    metrics: patterns 
  };
}

