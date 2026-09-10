import { useEffect, useState } from "react";
import { contextMatchesEvent, invalidateContextResource, loadEventContext } from "../../utils/eventContextResource";

export default function useEventContextResource(kind, eventId, enabled = true, event = null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!enabled || !eventId) return undefined;
    let cancelled = false;
    loadEventContext(kind, eventId).then((data) => {
      if (!cancelled) setResult({ eventId, attempt, data, status: data ? "available" : "absent" });
    }).catch(() => {
      if (!cancelled) setResult({ eventId, attempt, data: null, status: "error" });
    });
    // A changing selection must not cancel a shared request used by other readers.
    return () => { cancelled = true; };
  }, [kind, eventId, enabled, attempt]);

  const current = result?.eventId === eventId && result.attempt === attempt;
  const matches = !current || contextMatchesEvent(kind, result.data, event);
  return {
    data: current && matches ? result.data : null,
    status: !matches ? "mismatch" : current ? result.status : enabled ? "loading" : "idle",
    retry: () => {
      invalidateContextResource(kind, eventId);
      setAttempt((value) => value + 1);
    },
  };
}
