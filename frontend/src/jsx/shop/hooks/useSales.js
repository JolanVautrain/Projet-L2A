import { useState, useEffect } from 'react';

export function usePriceMultiplier() {
  const [priceMultiplier, setPriceMultiplier] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setPriceMultiplier((prev) => {
        if (prev >= 2) {
          clearInterval(interval);
          return prev;
        }
        const next = +(prev * 1.01).toFixed(6);
        return next >= 2 ? 2 : next;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return priceMultiplier;
}

export function useSaleCountdown() {
  const [saleCountdown, setSaleCountdown] = useState(6 * 3600);

  const randHoursBetween = (minH = 6, maxH = 24) => {
    const hours = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
    return hours * 3600;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSaleCountdown((v) => {
        if (v <= 1) {
          return randHoursBetween(6, 24);
        }
        return v - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return saleCountdown;
}

export function usePriceWarning() {
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [priceWarningTimer, setPriceWarningTimer] = useState(30);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPriceWarning(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPriceWarning) return;

    const interval = setInterval(() => {
      setPriceWarningTimer(prev => {
        if (prev <= 1) {
          setShowPriceWarning(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showPriceWarning]);

  return { showPriceWarning, priceWarningTimer };
}

export function useViewerCount() {
  const [viewerCount, setViewerCount] = useState(Math.floor(Math.random() * 20) + 15);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        const newCount = prev + change;
        return Math.max(10, Math.min(50, newCount));
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return viewerCount;
}
