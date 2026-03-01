import { useState, useEffect, useRef, useCallback } from 'react';

const HEALTH_URL = `${import.meta.env.VITE_API_BASE_URL}/health`;
const RETRY_INTERVALS = [3, 5, 15, 30, 60];

export const useBackendReady = () => {
  const [ready, setReady] = useState(false);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const readyRef = useRef(false);

  const checkHealth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(HEALTH_URL);
      const json = await res.json();
      if (json.success && json.data?.latestVersion) {
        setLatestVersion(json.data.latestVersion);
      }
      return json.success === true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;

    const clearTimers = () => {
      if (timer) clearTimeout(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };

    const poll = async () => {
      if (!mountedRef.current) return;

      const ok = await checkHealth();
      if (!mountedRef.current) return;

      if (ok) {
        readyRef.current = true;
        setReady(true);
        setRetryIn(null);
        return;
      }

      const interval = RETRY_INTERVALS[Math.min(attemptRef.current, RETRY_INTERVALS.length - 1)];
      attemptRef.current++;

      let remaining = interval;
      setRetryIn(remaining);

      countdownTimer = setInterval(() => {
        remaining--;
        if (!mountedRef.current) return;
        if (remaining <= 0) {
          if (countdownTimer) clearInterval(countdownTimer);
          setRetryIn(null);
          return;
        }
        setRetryIn(remaining);
      }, 1000);

      timer = setTimeout(() => {
        if (countdownTimer) clearInterval(countdownTimer);
        poll();
      }, interval * 1000);
    };

    poll();

    return () => {
      mountedRef.current = false;
      clearTimers();
    };
  }, [checkHealth, trigger]);

  useEffect(() => {
    const handleOffline = () => {
      if (!readyRef.current) return;
      readyRef.current = false;
      attemptRef.current = 0;
      setReady(false);
      setRetryIn(null);
      setTrigger((t) => t + 1);
    };
    window.addEventListener('backend-offline', handleOffline);
    return () => window.removeEventListener('backend-offline', handleOffline);
  }, []);

  return { ready, retryIn, latestVersion };
};
