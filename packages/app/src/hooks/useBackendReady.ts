import { useState, useEffect, useRef, useCallback } from 'react';

const HEALTH_URL = 'http://localhost:3100/api/health';
const RETRY_INTERVALS = [3, 30, 60];

export const useBackendReady = () => {
  const [ready, setReady] = useState(false);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

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
  }, [checkHealth]);

  return { ready, retryIn, latestVersion };
};
