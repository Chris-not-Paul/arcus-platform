import { useEffect, useState } from "react";

const INDEX_URL = "/data/event-media/index.json";

let catalogPromise;

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(INDEX_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Event media catalog returned ${response.status}`);
        }

        return response.json();
      })
      .catch((error) => {
        catalogPromise = undefined;
        throw error;
      });
  }

  return catalogPromise;
}

function useEventMedia(eventId) {
  const [result, setResult] = useState({
    assets: [],
    eventId: null,
  });

  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then((catalog) => {
        if (cancelled) {
          return;
        }

        const assets = Array.isArray(catalog.assets)
          ? catalog.assets
              .filter(
                (asset) =>
                  asset.event_id === eventId &&
                  ((asset.rights_status === "cleared_open" && asset.file) ||
                    (asset.rights_status === "link_only" && !asset.file))
              )
              .sort((left, right) => Number(right.is_primary) - Number(left.is_primary))
          : [];

        setResult({ assets, eventId });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ assets: [], eventId });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return result.eventId === eventId ? result.assets : [];
}

export default useEventMedia;
