import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const HOLD_MS = 2500;

export function useSecretUnlock(targetPath = "/secret-chat") {
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  const start = useCallback(() => {
    timerRef.current = window.setTimeout(() => navigate(targetPath), HOLD_MS);
  }, [navigate, targetPath]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  };
}