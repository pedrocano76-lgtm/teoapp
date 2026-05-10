import { useCallback, useRef } from 'react';

interface Options {
  delay?: number;
  onLongPress: () => void;
}

/**
 * useLongPress - returns handlers for both touch and mouse to detect a long press.
 * After triggering, sets a flag so the subsequent click can be suppressed by the consumer.
 */
export function useLongPress({ delay = 500, onLongPress }: Options) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = useCallback(() => {
    triggeredRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const consumeTriggered = useCallback(() => {
    const v = triggeredRef.current;
    triggeredRef.current = false;
    return v;
  }, []);

  return {
    handlers: {
      onTouchStart: start,
      onTouchEnd: cancel,
      onTouchMove: cancel,
      onTouchCancel: cancel,
      onMouseDown: start,
      onMouseUp: cancel,
      onMouseLeave: cancel,
    },
    consumeTriggered,
  };
}
