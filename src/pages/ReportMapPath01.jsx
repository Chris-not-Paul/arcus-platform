import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MarkerClusterGroup from "react-leaflet-cluster";

import PageMeta from "../components/layout/PageMeta";
import EventMarker from "../components/map/EventMarker";

import {
  createClusterCustomIcon,
} from "../utils/clusterFactory";

import "../styles/report-map.css";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getEventBounds(events) {
  const points = events
    .map((event) => ({
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude)
    );

  if (!points.length) {
    return null;
  }

  return {
    east: Math.max(...points.map((point) => point.longitude)),
    north: Math.max(...points.map((point) => point.latitude)),
    south: Math.min(...points.map((point) => point.latitude)),
    west: Math.min(...points.map((point) => point.longitude)),
  };
}

function padBounds(bounds, ratio = 0.08) {
  if (!bounds) {
    return null;
  }

  const lonSpan = Math.max(bounds.east - bounds.west, 0.22);
  const latSpan = Math.max(bounds.north - bounds.south, 0.22);

  return {
    east: bounds.east + lonSpan * Math.max(ratio, 0.9),
    north: bounds.north + latSpan * Math.max(ratio, 0.16),
    south: bounds.south - latSpan * Math.max(ratio, 0.65),
    west: bounds.west - lonSpan * ratio,
  };
}

function queryFlag(searchParams, key, defaultValue = false) {
  const value = searchParams.get(key);

  if (value === null) {
    return defaultValue;
  }

  return !["0", "false", "off", "no"].includes(
    value.toLowerCase()
  );
}

function AtlasFitController({
  bounds,
  minZoomAfterFit = 0,
  onReady,
  zoomBoost = 0,
}) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) {
      return undefined;
    }

    const fitMap = () => {
      map.invalidateSize({
        animate: false,
      });
      map.fitBounds(
        [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ],
        {
          animate: false,
          paddingBottomRight: [72, 72],
          paddingTopLeft: [72, 72],
        }
      );

      if (zoomBoost > 0) {
        map.setZoom(Math.min(map.getZoom() + zoomBoost, 9), {
          animate: false,
        });
      }

      if (minZoomAfterFit > 0 && map.getZoom() < minZoomAfterFit) {
        map.setZoom(Math.min(minZoomAfterFit, 9), {
          animate: false,
        });
      }
    };

    const handleViewportChange = () => {
      window.setTimeout(fitMap, 120);
    };

    fitMap();
    map.whenReady(fitMap);

    const readyTimer = setTimeout(() => {
      fitMap();
      onReady();
    }, 1800);
    const lateFitTimer = setTimeout(fitMap, 3200);
    const printFitTimer = setTimeout(fitMap, 5200);
    const containerObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleViewportChange)
        : null;

    if (containerObserver) {
      containerObserver.observe(map.getContainer());
      containerObserver.observe(document.documentElement);
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("beforeprint", handleViewportChange);

    return () => {
      clearTimeout(readyTimer);
      clearTimeout(lateFitTimer);
      clearTimeout(printFitTimer);
      containerObserver?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("beforeprint", handleViewportChange);
    };
  }, [bounds, map, minZoomAfterFit, onReady, zoomBoost]);

  return null;
}

export default function ReportMapPath01() {
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const province = searchParams.get("province") || "Torino";
  const embedMode = queryFlag(searchParams, "embed", false);
  const compactMode = queryFlag(searchParams, "compact", false);
  const useLocalTiles = queryFlag(searchParams, "localTiles", true);

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then((data) =>
        setEvents(Array.isArray(data) ? data : data.events || [])
      )
      .catch(() => setEvents([]));

    fetch("/data/processed/sources.json")
      .then((response) => response.json())
      .then((data) =>
        setSources(Array.isArray(data) ? data : data.sources || [])
      )
      .catch(() => setSources([]));
  }, []);

  const provinceEvents = useMemo(() => {
    const selected = normalizeText(province);

    return events
      .filter(
        (event) =>
          normalizeText(event.province) === selected &&
          Number.isFinite(Number(event.latitude)) &&
          Number.isFinite(Number(event.longitude))
      )
      .map((event) => ({
        ...event,
        latitude: Number(event.latitude),
        longitude: Number(event.longitude),
      }));
  }, [events, province]);

  const sourcesByEvent = useMemo(() => {
    return sources.reduce((accumulator, source) => {
      if (!source.event_id) {
        return accumulator;
      }

      accumulator[source.event_id] ||= [];
      accumulator[source.event_id].push(source);

      return accumulator;
    }, {});
  }, [sources]);

  const eventBounds = useMemo(
    () => getEventBounds(provinceEvents),
    [provinceEvents]
  );
  const mapBounds = useMemo(() => padBounds(eventBounds), [eventBounds]);
  const minZoomAfterFit = useMemo(() => {
    if (!eventBounds) {
      return 0;
    }

    const span = Math.max(
      eventBounds.east - eventBounds.west,
      eventBounds.north - eventBounds.south
    );

    return span <= 1.45 ? 8 : 0;
  }, [eventBounds]);

  return (
    <main
      className={`atlas-map-export-page ${
        isReady ? "atlas-map-export-ready" : ""
      } ${embedMode ? "atlas-map-export-embed" : ""} ${
        compactMode ? "atlas-map-export-compact" : ""
      }`}
    >
      <PageMeta
        description={`Clean ARCUS Atlas Leaflet extraction for ${province}.`}
        title={`ARCUS Atlas export - ${province}`}
      />

      <section
        className="atlas-map-export atlas-map-export-clean"
        id="atlas-export-map"
      >
        <MapContainer
          attributionControl={false}
          center={[45.2, 7.7]}
          minZoom={5}
          preferCanvas
          scrollWheelZoom={false}
          style={{
            height: "100%",
            width: "100%",
          }}
          zoom={8}
          zoomControl={false}
        >
          <TileLayer
            eventHandlers={{
              load: () => {
                window.setTimeout(() => setIsReady(true), 450);
              },
            }}
            url={
              useLocalTiles
                ? "/data/map-tiles/voyager/{z}/{x}/{y}.png"
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />

          <AtlasFitController
            bounds={mapBounds}
            minZoomAfterFit={compactMode ? 0 : minZoomAfterFit}
            onReady={() => setIsReady(true)}
            zoomBoost={compactMode ? 1 : 0}
          />

          <MarkerClusterGroup
            animate={false}
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={34}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={false}
          >
            {provinceEvents.map((event) => (
              <EventMarker
                atlasMode="professional"
                event={event}
                key={event.event_id}
                professionalMode={false}
                relatedSources={
                  sourcesByEvent[event.event_id] || []
                }
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </section>
    </main>
  );
}
