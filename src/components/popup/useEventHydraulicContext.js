import { useEffect, useState } from "react";

const INDEX_URL = "/data/event-context/hydraulic/index.json";

function useEventHydraulicContext(eventId) {
  const [result, setResult] = useState({
    context: null,
    eventId: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const indexResponse = await fetch(INDEX_URL, { signal: controller.signal });

      if (!indexResponse.ok) {
        return;
      }

      const index = await indexResponse.json();
      const entry = index.events?.[eventId];

      if (!entry?.file) {
        return;
      }

      const contextResponse = await fetch(
        `/data/event-context/hydraulic/${encodeURIComponent(entry.file)}`,
        { signal: controller.signal }
      );

      if (!contextResponse.ok) {
        return;
      }

      const payload = await contextResponse.json();

      if (
        ["context_available", "source_review_required"].includes(payload.status) &&
        payload.event_hydrometry &&
        Array.isArray(payload.sources)
      ) {
        setResult({
          context: payload,
          eventId,
        });
      }
    }

    load().catch((error) => {
      if (error.name !== "AbortError") {
        setResult({
          context: null,
          eventId,
        });
      }
    });

    return () => controller.abort();
  }, [eventId]);

  return result.eventId === eventId ? result.context : null;
}

export default useEventHydraulicContext;
