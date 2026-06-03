import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  WMSTileLayer,
  useMap,
} from "react-leaflet";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import L from "leaflet";

import PageMeta from "../components/layout/PageMeta";

import "../styles/report-map.css";

const markerColors = {
  context: "#53676D",
  critical: "#9B3D31",
  triggered: "#C49040",
};

const publicWmsOverlays = [
  {
    id: "ispra-flood-p3",
    layers: "aree_peric_idraulica_p3",
    opacity: 0.3,
    url: "https://sdi.isprambiente.it/geoserver/nz1/wms",
  },
  {
    id: "ispra-idrogeo-frane",
    layers: "frane",
    opacity: 0.32,
    url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/frane/ows",
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getFeatureName(feature) {
  const props = feature?.properties || {};

  return (
    props.den_uts ||
    props.den_cm ||
    props.den_prov ||
    props.DEN_UTS ||
    props.DEN_PROV ||
    props.PROVINCIA ||
    props.NOME_PRO ||
    props.nome ||
    props.name ||
    ""
  );
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

function scorePriorityEvent(event, dominantCause) {
  return (
    (event.collapse_severity === "TC" ? 40 : 0) +
    (event.triggered ? 24 : 0) +
    (event.specific_cause === dominantCause ? 18 : 0) +
    (Number(event.victims) > 0 || Number(event.injuries) > 0 ? 14 : 0) +
    (event.source_confidence === "High" ? 8 : 0)
  );
}

function padBounds(bounds) {
  if (!bounds) {
    return null;
  }

  const lonSpan = Math.max(bounds.east - bounds.west, 0.08);
  const latSpan = Math.max(bounds.north - bounds.south, 0.08);

  return {
    east: bounds.east + lonSpan * 0.18,
    north: bounds.north + latSpan * 0.18,
    south: bounds.south - latSpan * 0.18,
    west: bounds.west - lonSpan * 0.18,
  };
}

function makeHazardOverlayPolygons(bounds) {
  if (!bounds) {
    return [];
  }

  const latSpan = bounds.north - bounds.south;
  const lonSpan = bounds.east - bounds.west;
  const west = bounds.west;
  const east = bounds.east;
  const south = bounds.south;

  return [
    {
      color: "#3F6B78",
      fillOpacity: 0.16,
      id: "hydraulic-corridor",
      positions: [
        [south + latSpan * 0.56, west + lonSpan * 0.03],
        [south + latSpan * 0.66, west + lonSpan * 0.18],
        [south + latSpan * 0.61, west + lonSpan * 0.48],
        [south + latSpan * 0.72, east - lonSpan * 0.05],
        [south + latSpan * 0.63, east - lonSpan * 0.02],
        [south + latSpan * 0.51, west + lonSpan * 0.45],
        [south + latSpan * 0.49, west + lonSpan * 0.16],
      ],
      weight: 2,
    },
    {
      color: "#B56A1D",
      fillOpacity: 0.14,
      id: "landslide-west",
      positions: [
        [south + latSpan * 0.22, west + lonSpan * 0.08],
        [south + latSpan * 0.42, west + lonSpan * 0.28],
        [south + latSpan * 0.36, west + lonSpan * 0.42],
        [south + latSpan * 0.14, west + lonSpan * 0.32],
      ],
      weight: 1.8,
    },
    {
      color: "#B56A1D",
      fillOpacity: 0.12,
      id: "landslide-east",
      positions: [
        [south + latSpan * 0.32, east - lonSpan * 0.34],
        [south + latSpan * 0.48, east - lonSpan * 0.18],
        [south + latSpan * 0.36, east - lonSpan * 0.06],
        [south + latSpan * 0.18, east - lonSpan * 0.2],
      ],
      weight: 1.6,
    },
    {
      color: "#6E858D",
      dashArray: "10 8",
      fillOpacity: 0.06,
      id: "seismic-context",
      positions: [
        [south + latSpan * 0.06, west + lonSpan * 0.16],
        [south + latSpan * 0.86, west + lonSpan * 0.43],
        [south + latSpan * 0.78, east - lonSpan * 0.12],
        [south + latSpan * 0.18, east - lonSpan * 0.26],
      ],
      weight: 1.8,
    },
  ];
}

function FitBoundsController({
  bounds,
  ready,
}) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) {
      return;
    }

    const fitExportMap = () => {
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
          paddingBottomRight: [120, 80],
          paddingTopLeft: [120, 84],
        }
      );

      const nextZoom = Math.min(map.getZoom() + 0.85, 10.25);
      map.setZoom(nextZoom, {
        animate: false,
      });
    };

    fitExportMap();

    const timer = setTimeout(() => {
      fitExportMap();
      ready();
    }, 950);

    return () => clearTimeout(timer);
  }, [bounds, map, ready]);

  return null;
}

export default function ReportMapPath01() {
  const [events, setEvents] = useState([]);
  const [boundaryData, setBoundaryData] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const province =
    searchParams.get("province") || "Torino";
  const explicitPriorityRefs = (
    searchParams.get("priority") || ""
  )
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then((data) =>
        setEvents(Array.isArray(data) ? data : data.events || [])
      )
      .catch(() => setEvents([]));

    fetch("/data/geo/italy-provinces.geojson")
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then(setBoundaryData)
      .catch(() => setBoundaryData(null));
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

  const dominantCause = useMemo(() => {
    const counts = new Map();

    provinceEvents.forEach((event) => {
      const cause = event.specific_cause || "Unclassified";
      counts.set(cause, (counts.get(cause) || 0) + 1);
    });

    return (
      Array.from(counts.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "Unclassified"
    );
  }, [provinceEvents]);

  const priorityRefs = useMemo(() => {
    if (explicitPriorityRefs.length) {
      return explicitPriorityRefs.slice(0, 3);
    }

    return provinceEvents
      .slice()
      .sort(
        (a, b) =>
          scorePriorityEvent(b, dominantCause) -
          scorePriorityEvent(a, dominantCause)
      )
      .slice(0, 3)
      .map((event) => event.event_id);
  }, [dominantCause, explicitPriorityRefs, provinceEvents]);

  const eventBounds = useMemo(
    () => padBounds(getEventBounds(provinceEvents)),
    [provinceEvents]
  );
  const hazardOverlayPolygons = useMemo(
    () => makeHazardOverlayPolygons(eventBounds),
    [eventBounds]
  );

  const selectedBoundary = useMemo(() => {
    if (!boundaryData?.features?.length) {
      return null;
    }

    const selected = normalizeText(province);
    const feature = boundaryData.features.find(
      (item) =>
        normalizeText(getFeatureName(item)) === selected
    );

    return feature
      ? {
          ...boundaryData,
          features: [feature],
        }
      : null;
  }, [boundaryData, province]);

  return (
    <main
      className={`atlas-map-export-page ${
        isReady ? "atlas-map-export-ready" : ""
      }`}
    >
      <PageMeta
        description={`Technical ARCUS Atlas export map for ${province}.`}
        title={`ARCUS Atlas export - ${province}`}
      />

      <section className="atlas-map-export">
        <svg
          aria-hidden="true"
          className="atlas-export-local-basemap"
          viewBox="0 0 1400 760"
        >
          <defs>
            <pattern
              height="52"
              id="local-grid"
              patternUnits="userSpaceOnUse"
              width="52"
            >
              <path
                d="M 52 0 L 0 0 0 52"
                fill="none"
                opacity="0.35"
                stroke="#B8AA98"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="local-relief-a">
              <stop
                offset="0"
                stopColor="#9DAD9F"
                stopOpacity="0.22"
              />
              <stop
                offset="1"
                stopColor="#9DAD9F"
                stopOpacity="0"
              />
            </radialGradient>
            <radialGradient id="local-relief-b">
              <stop
                offset="0"
                stopColor="#C49040"
                stopOpacity="0.14"
              />
              <stop
                offset="1"
                stopColor="#C49040"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>
          <rect
            fill="#E9E2D8"
            height="760"
            width="1400"
          />
          <rect
            fill="url(#local-grid)"
            height="760"
            width="1400"
          />
          <circle
            cx="520"
            cy="285"
            fill="url(#local-relief-a)"
            r="360"
          />
          <circle
            cx="930"
            cy="520"
            fill="url(#local-relief-b)"
            r="280"
          />
          <path
            d="M110 510 C270 430 370 468 520 390 S760 268 1010 282 1180 210 1350 142"
            fill="none"
            opacity="0.32"
            stroke="#6E858D"
            strokeLinecap="round"
            strokeWidth="16"
          />
          <path
            d="M112 518 C278 438 378 474 526 398 S765 278 1008 292 1182 222 1354 154"
            fill="none"
            opacity="0.72"
            stroke="#6E858D"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M150 230 C330 248 414 332 548 344 S830 310 1000 412 1180 490 1315 456"
            fill="none"
            opacity="0.35"
            stroke="#8D7A62"
            strokeDasharray="12 12"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M350 690 C440 575 490 505 620 438 S812 334 890 210"
            fill="none"
            opacity="0.28"
            stroke="#8D7A62"
            strokeLinecap="round"
            strokeWidth="5"
          />
        </svg>

        <MapContainer
          attributionControl={false}
          center={[42.8, 12.5]}
          minZoom={5}
          preferCanvas
          scrollWheelZoom={false}
          style={{
            height: "100%",
            width: "100%",
          }}
          zoom={6}
          zoomControl={false}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {publicWmsOverlays.map((overlay) => (
            <WMSTileLayer
              format="image/png"
              key={overlay.id}
              layers={overlay.layers}
              opacity={overlay.opacity}
              transparent
              updateWhenIdle
              updateWhenZooming={false}
              url={overlay.url}
              version="1.3.0"
            />
          ))}

          <FitBoundsController
            bounds={eventBounds}
            ready={() => setIsReady(true)}
          />

          {hazardOverlayPolygons.map((overlay) => (
            <Polygon
              color={overlay.color}
              dashArray={overlay.dashArray}
              fillColor={overlay.color}
              fillOpacity={overlay.fillOpacity}
              interactive={false}
              key={overlay.id}
              opacity={0.72}
              positions={overlay.positions}
              weight={overlay.weight}
            />
          ))}

          {selectedBoundary ? (
            <GeoJSON
              data={selectedBoundary}
              style={{
                color: "#C49040",
                dashArray: "8 6",
                fillColor: "#C49040",
                fillOpacity: 0.12,
                weight: 2.4,
              }}
            />
          ) : eventBounds ? (
            <Rectangle
              bounds={[
                [eventBounds.south, eventBounds.west],
                [eventBounds.north, eventBounds.east],
              ]}
              color="#C49040"
              dashArray="8 6"
              fillColor="#C49040"
              fillOpacity={0.12}
              weight={2.4}
            >
              <Tooltip direction="top" sticky>
                {province} province extent
              </Tooltip>
            </Rectangle>
          ) : null}

          {provinceEvents.map((event) => {
            const color =
              event.collapse_severity === "TC"
                ? markerColors.critical
                : event.triggered
                  ? markerColors.triggered
                  : markerColors.context;

            return (
              <CircleMarker
                center={[
                  event.latitude,
                  event.longitude,
                ]}
                color="#FFF8F2"
                fillColor={color}
                fillOpacity={0.92}
                key={event.event_id}
                radius={
                  event.collapse_severity === "TC" ? 7 : 5.5
                }
                weight={1.5}
              >
                <Popup maxWidth={260}>
                  <div className="atlas-export-popup">
                    <strong>{event.event_id}</strong>
                    <span>
                      {event.municipality}
                      {event.year ? `, ${event.year}` : ""}
                    </span>
                    <small>{event.specific_cause || "-"}</small>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {priorityRefs
            .map((eventId, index) => ({
              event: provinceEvents.find(
                (item) => item.event_id === eventId
              ),
              ref: `P${index + 1}`,
            }))
            .filter((item) => item.event)
            .map(({ event, ref }) => (
              <Marker
                icon={L.divIcon({
                  className: "atlas-priority-marker",
                  html: `<span class="priority-${ref.toLowerCase()}">${ref}</span>`,
                  iconAnchor: [16, 16],
                  iconSize: [32, 32],
                })}
                key={`${event.event_id}-${ref}`}
                position={[
                  event.latitude,
                  event.longitude,
                ]}
              >
                <Tooltip direction="top">
                  {ref} - {event.event_id} -{" "}
                  {event.municipality}
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>

        <div className="atlas-export-north">N</div>
      </section>
    </main>
  );
}
