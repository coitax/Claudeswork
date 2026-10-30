import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  /** The current data to persist. */
  data: T;
  /** Persist function; should resolve when the save is committed. */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in ms (default 1200). */
  delay?: number;
  /** When false, autosave is paused (e.g. before first explicit save). */
  enabled?: boolean;
}

/**
 * Debounced draft autosave. Returns the current status plus a manual save().
 * Skips the very first render so loading an entry doesn't immediately re-save it.
 */
export function useAutosave<T>({ data, onSave, delay = 1200, enabled = true }: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);
  const latest = useRef(data);
  latest.current = data;

  const save = useCallback(async () => {
    setStatus('saving');
    try {
      await onSave(latest.current);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled, delay]);

  return { status, save };
}
