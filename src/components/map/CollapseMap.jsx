import {
  MapContainer,
  CircleMarker,
  GeoJSON,
  Marker,
  Pane,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  WMSTileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MarkerClusterGroup from "react-leaflet-cluster";

import HeatmapLayer from "./HeatmapLayer";

import EventMarker from "./EventMarker";
import EventPopup from "../popup/EventPopup";
import { researchEventId } from "../../utils/eventIdentity";

import {
  createProfessionalAssetIcon,
  createWatchlistIcon,
} from "../../utils/markerFactory";

import {
  createClusterCustomIcon,
} from "../../utils/clusterFactory";

// The longitude is shifted west so Italy is optically centred in the map area
// left visible by the desktop research panel.
const ITALY_VIEW_CENTER = [42.2, 9.3];

const ITALY_VIEW_ZOOM = 6.5;

const ITALY_MAX_BOUNDS = [
  [33.8, 4.5],
  [49.2, 20.8],
];

function ItalyFocusMask({ enabled }) {
  const [maskData, setMaskData] = useState(null);
  const [regionData, setRegionData] = useState(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();

    const fetchGeoJson = (url) => fetch(url, {
      signal: controller.signal,
    }).then((response) => {
        if (!response.ok) {
          throw new Error(`Map geometry unavailable (${response.status})`);
        }

        return response.json();
      });

    Promise.all([
      fetchGeoJson("/data/geo/italy-focus-mask.geojson"),
      fetchGeoJson("/data/geo/italy-regions-simplified.geojson"),
    ])
      .then(([mask, regions]) => {
        setMaskData(mask);
        setRegionData(regions);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setMaskData(null);
          setRegionData(null);
        }
      });

    return () => controller.abort();
  }, [enabled]);

  if (!enabled || !maskData || !regionData) {
    return null;
  }

  return (
    <Pane
      name="arcus-italy-focus-mask"
      style={{
        pointerEvents: "none",
        zIndex: 280,
      }}
    >
      <GeoJSON
        data={maskData}
        interactive={false}
        style={{
          color: "transparent",
          fillColor: "#e7e4dc",
          fillOpacity: 0.76,
          fillRule: "evenodd",
          stroke: false,
        }}
      />

      <GeoJSON
        data={regionData}
        interactive={false}
        style={{
          color: "#566c6b",
          fill: false,
          lineCap: "round",
          lineJoin: "round",
          opacity: 0.42,
          weight: 1,
        }}
      />
    </Pane>
  );
}

/* ================================= */
/* LEAFLET RESIZE FIX */
/* ================================= */

function MapResizeController({
  resizeSignal,
  sidebarOpen,
}) {
  const map = useMap();

  useEffect(() => {

    const resizeMap = () => {

      map.invalidateSize({
        animate: false,
      });

      map.setView(
        map.getCenter(),
        map.getZoom(),
        {
          animate: false,
        }
      );
    };

    resizeMap();

    const timer1 =
      setTimeout(resizeMap, 100);

    const timer2 =
      setTimeout(resizeMap, 250);

    const timer3 =
      setTimeout(resizeMap, 500);

    return () => {

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

    };

  }, [map, resizeSignal, sidebarOpen]);

  return null;
}

function MapFitController({
  assetMarkers = [],
  events = [],
  focusedEvent = null,
  selectedPoint = null,
  selectionBounds = null,
}) {
  const map = useMap();

  useEffect(() => {
    const points = [];
    let useItalyOverview = false;

    if (selectionBounds) {
      points.push(
        [selectionBounds.south, selectionBounds.west],
        [selectionBounds.north, selectionBounds.east]
      );
    }

    if (
      Number.isFinite(Number(focusedEvent?.latitude)) &&
      Number.isFinite(Number(focusedEvent?.longitude))
    ) {
      points.push([
        Number(focusedEvent.latitude),
        Number(focusedEvent.longitude),
      ]);
    }

    if (
      Number.isFinite(Number(selectedPoint?.latitude)) &&
      Number.isFinite(Number(selectedPoint?.longitude))
    ) {
      points.push([
        Number(selectedPoint.latitude),
        Number(selectedPoint.longitude),
      ]);
    }

    assetMarkers.forEach((asset) => {
      const latitude = Number(asset.latitude);
      const longitude = Number(asset.longitude);

      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        points.push([latitude, longitude]);
      }
    });

    if (
      !points.length &&
      (events.length === 0 || events.length >= 80)
    ) {
      useItalyOverview = true;
    }

    if (!points.length) {
      events.slice(0, 80).forEach((event) => {
        const latitude = Number(event.latitude);
        const longitude = Number(event.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          points.push([latitude, longitude]);
        }
      });
    }

    if (!points.length && !useItalyOverview) {
      return;
    }

    const timer = setTimeout(() => {
      if (useItalyOverview) {
        const mapSize = map.getSize();
        const overviewZoom = mapSize.y >= 850
          ? 6.25
          : mapSize.y >= 690
            ? 6
            : 5.75;
        const overviewCenter = [
          42.1,
          mapSize.x < 1450 ? 7.25 : 9.15,
        ];

        map.setView(overviewCenter, overviewZoom, { animate: false });
        return;
      }

      if (points.length === 1) {
        map.setView(points[0], 10, { animate: false });
        return;
      }

      map.fitBounds(points, {
        animate: false,
        maxZoom: 11,
        padding: [28, 28],
      });
    }, 120);

    return () => clearTimeout(timer);
  }, [assetMarkers, events, focusedEvent, map, selectedPoint, selectionBounds]);

  return null;
}

const hazardOverlayColors = {
  hydraulic: "#3F6B78",
  landslide: "#B56A1D",
  seismic: "#6E858D",
  structural: "#C49040",
};

function HazardExposureOverlay({
  activeHazardOverlays,
  events,
  hazardProfiles,
}) {
  const overlayPoints = useMemo(() => {
    const provinceIndex = {};

    events.forEach((event) => {
      const latitude = Number(event.latitude);
      const longitude = Number(event.longitude);

      if (
        !event.province ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      if (!provinceIndex[event.province]) {
        provinceIndex[event.province] = {
          count: 0,
          latitude: 0,
          longitude: 0,
          province: event.province,
        };
      }

      provinceIndex[event.province].count += 1;
      provinceIndex[event.province].latitude += latitude;
      provinceIndex[event.province].longitude += longitude;
    });

    return Object.values(provinceIndex)
      .map((province) => {
        const profile =
          hazardProfiles[province.province];

        if (!profile) {
          return null;
        }

        const activeHazards =
          (profile.hazards || [])
            .filter(
              (hazard) =>
                activeHazardOverlays[hazard.key] &&
                Number(hazard.score) > 0
            )
            .sort(
              (a, b) =>
                Number(b.score || 0) -
                Number(a.score || 0)
            );

        if (!activeHazards.length) {
          return null;
        }

        const dominant = activeHazards[0];
        const score = Number(dominant.score || 0);

        return {
          color:
            hazardOverlayColors[dominant.key] ||
            hazardOverlayColors.structural,
          count: province.count,
          label: dominant.label,
          latitude:
            province.latitude / province.count,
          longitude:
            province.longitude / province.count,
          province: province.province,
          radius:
            10 + Math.min(22, score / 4.5),
          score,
        };
      })
      .filter(Boolean);
  }, [activeHazardOverlays, events, hazardProfiles]);

  return (
    <>
      {overlayPoints.map((point) => (
        <CircleMarker
          center={[
            point.latitude,
            point.longitude,
          ]}
          fillColor={point.color}
          fillOpacity={0.16}
          key={`${point.province}-${point.label}`}
          opacity={0.72}
          radius={point.radius}
          stroke
          color={point.color}
          weight={1.4}
        >
          <Tooltip direction="top">
            <div className="arcus-hazard-tooltip">
              <strong>{point.province}</strong>
              <span>
                {point.label}: {point.score}/100
              </span>
              <small>
                {point.count} ARCUS events
              </small>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function AreaSelectionController({
  enabled,
  label,
  onSelectionBoundsChange,
  selectionBounds,
}) {
  const map = useMap();
  const [draftStart, setDraftStart] =
    useState(null);
  const [draftBounds, setDraftBounds] =
    useState(null);

  const normalizeBounds = (start, end) => ({
    east: Math.max(start.lng, end.lng),
    north: Math.max(start.lat, end.lat),
    south: Math.min(start.lat, end.lat),
    west: Math.min(start.lng, end.lng),
  });

  useEffect(() => {
    if (!enabled) {
      map.dragging.enable();

      const timer = setTimeout(() => {
        setDraftStart(null);
        setDraftBounds(null);
      }, 0);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [enabled, map]);

  useMapEvents({
    mousedown(event) {
      if (!enabled) {
        return;
      }

      map.dragging.disable();
      setDraftStart(event.latlng);
      setDraftBounds(null);
    },
    mousemove(event) {
      if (!enabled || !draftStart) {
        return;
      }

      setDraftBounds(
        normalizeBounds(draftStart, event.latlng)
      );
    },
    mouseup(event) {
      if (!enabled || !draftStart) {
        return;
      }

      const bounds = normalizeBounds(
        draftStart,
        event.latlng
      );

      setDraftStart(null);
      setDraftBounds(null);
      map.dragging.enable();

      if (
        Math.abs(bounds.north - bounds.south) >
          0.02 &&
        Math.abs(bounds.east - bounds.west) > 0.02
      ) {
        onSelectionBoundsChange?.(bounds);
      }
    },
  });

  const activeBounds =
    draftBounds || selectionBounds;

  if (!activeBounds) {
    return null;
  }

  return (
    <Rectangle
      bounds={[
        [activeBounds.south, activeBounds.west],
        [activeBounds.north, activeBounds.east],
      ]}
      color="#C49040"
      dashArray="8 6"
      fillColor="#C49040"
      fillOpacity={0.12}
      weight={2}
    >
      <Tooltip direction="top" sticky>
        {label || "Selected area"}
      </Tooltip>
    </Rectangle>
  );
}

function PointSelectionController({
  enabled,
  onPointSelect,
}) {
  useMapEvents({
    click(event) {
      if (!enabled || typeof onPointSelect !== "function") {
        return;
      }

      onPointSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

/* ================================= */
/* MAIN MAP */
/* ================================= */

function CollapseMap({
  activeHazardOverlays = {},
  atlasMode = "open",
  assetMarkers = [],
  eventHazards = {},
  eventReliability = {},
  eventVulnerability = {},
  filteredEvents,
  focusedEvent = null,
  height = "100vh",
  mapStyle = "voyager",
  professionalMode = false,
  publicWmsOverlays = [],
  onPointSelect,
  onSelectionBoundsChange,
  selectedPoint = null,
  selectionBounds = null,
  selectionEnabled = false,
  selectionLabel,
  resizeSignal,
  sourcesByEvent,
  sidebarOpen,
  showHeatmap = false,
  showEventMarkers = true,
  showAssetMarkers = false,
  showWatchlistMarkers = false,
  watchlistMarkers = [],
}) {
  const [selectedEvent, setSelectedEvent] = useState(undefined);
  const selectedEventCandidate =
    selectedEvent === undefined ? focusedEvent : selectedEvent;
  const activeSelectedEvent =
    selectedEventCandidate &&
    filteredEvents.some(
      (event) => event.event_id === selectedEventCandidate.event_id
    )
      ? selectedEventCandidate
      : null;

  const mapStyles = {
    dark: {
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
      key: "dark",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    },
    light: {
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
      key: "light",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    },
    voyager: {
      attribution: "Tiles &copy; Esri, HERE, Garmin, &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors, and the GIS user community",
      key: "voyager",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    },
  };

  const selectedMapStyle =
    mapStyles[mapStyle] ||
    mapStyles.voyager;

  return (

    <div
      className={`atlas-map-canvas map-style-${selectedMapStyle.key}`}
      style={{
        width: "100%",
        height,

        position: "relative",

        overflow: "hidden",

        background: "#e9e6de",
      }}
    >
      <div className="atlas-map-vignette" />
      <div className="atlas-map-grid-overlay" />

      <MapContainer
        center={ITALY_VIEW_CENTER}

        fadeAnimation={false}

        zoom={ITALY_VIEW_ZOOM}

        minZoom={5}

        zoomSnap={0.25}

        maxBounds={ITALY_MAX_BOUNDS}

        maxBoundsViscosity={0.72}

        zoomControl={false}

        preferCanvas={true}

        style={{
          width: "100%",
          height: "100%",

          position: "absolute",

          inset: 0,
        }}
      >

        {/* ================================= */}
        {/* RESIZE FIX */}
        {/* ================================= */}

        <MapResizeController
          resizeSignal={resizeSignal}
          sidebarOpen={sidebarOpen}
        />

        <MapFitController
          assetMarkers={
            showAssetMarkers ? assetMarkers : []
          }
          events={filteredEvents}
          focusedEvent={focusedEvent}
          selectedPoint={selectedPoint}
          selectionBounds={selectionBounds}
        />

        <AreaSelectionController
          enabled={selectionEnabled}
          label={selectionLabel}
          onSelectionBoundsChange={
            onSelectionBoundsChange
          }
          selectionBounds={selectionBounds}
        />

        <PointSelectionController
          enabled={Boolean(onPointSelect)}
          onPointSelect={onPointSelect}
        />

        {/* ================================= */}
        {/* BASEMAP */}
        {/* ================================= */}

        {selectedMapStyle.key === "voyager" ? (
          <TileLayer
            attribution={selectedMapStyle.attribution}
            className="arcus-italy-detail-raster"
            crossOrigin
            keepBuffer={1}
            maxNativeZoom={16}
            maxZoom={16}
            minZoom={5}
            noWrap
            updateWhenIdle
            updateWhenZooming={false}
            url={selectedMapStyle.url}
          />
        ) : (
          <TileLayer
            attribution={selectedMapStyle.attribution}
            className="arcus-reference-raster"
            crossOrigin
            keepBuffer={1}
            key={selectedMapStyle.key}
            updateWhenIdle
            updateWhenZooming={false}
            url={selectedMapStyle.url}
          />
        )}

        <ItalyFocusMask
          enabled={selectedMapStyle.key === "voyager"}
        />

        {professionalMode &&
          publicWmsOverlays.map((overlay) => (
            <WMSTileLayer
              attribution={overlay.attribution}
              format="image/png"
              keepBuffer={1}
              key={overlay.id}
              layers={overlay.layers}
              opacity={overlay.opacity ?? 0.42}
              transparent
              updateWhenIdle
              updateWhenZooming={false}
              url={overlay.url}
              version={overlay.version || "1.3.0"}
            />
          ))}

        {/* ================================= */}
        {/* CONTROLS */}
        {/* ================================= */}

        <ZoomControl
          position="bottomright"
        />

        {showHeatmap && (
          <HeatmapLayer
            events={filteredEvents}
          />
        )}

        {selectedPoint && (
          <CircleMarker
            center={[
              Number(selectedPoint.latitude),
              Number(selectedPoint.longitude),
            ]}
            color="#C49040"
            fillColor="#C49040"
            fillOpacity={0.58}
            radius={8}
            weight={2}
          >
            <Tooltip direction="top" sticky>
              Official exposure point
            </Tooltip>
          </CircleMarker>
        )}

        {professionalMode &&
          Object.values(activeHazardOverlays).some(Boolean) && (
            <HazardExposureOverlay
              activeHazardOverlays={activeHazardOverlays}
              events={filteredEvents}
              hazardProfiles={eventHazards}
            />
          )}

        {/* ================================= */}
        {/* CLUSTERS */}
        {/* ================================= */}

        {showEventMarkers && (
          <MarkerClusterGroup
            key={`${atlasMode}-${filteredEvents.length}-${filteredEvents[0]?.event_id || "empty"}`}
            chunkedLoading

            spiderfyOnMaxZoom={true}

            showCoverageOnHover={false}

            maxClusterRadius={34}

            animate={true}

            animateAddingMarkers={true}

            iconCreateFunction={
              createClusterCustomIcon
            }
          >

            {filteredEvents.map(
              (event) => {
                return (
                  <EventMarker
                    key={event.event_id}

                    event={event}

                    onSelect={setSelectedEvent}
                    professionalMode={
                      professionalMode
                    }
                    vulnerability={
                      eventVulnerability[
                        event.event_id
                      ] || null
                    }
                  />
                );
              }
            )}

          </MarkerClusterGroup>
        )}

        {showAssetMarkers &&
          assetMarkers.map((asset) => (
            <Marker
              icon={createProfessionalAssetIcon()}
              key={asset.id}
              position={[
                asset.latitude,
                asset.longitude,
              ]}
            >
              <Popup maxWidth={300}>
                <div className="professional-map-popup">
                  <span>Asset</span>
                  <strong>{asset.name}</strong>
                  <p>
                    {asset.territory} - score{" "}
                    {asset.score} -{" "}
                    {asset.priority}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {showWatchlistMarkers &&
          watchlistMarkers.map((signal) => (
            <Marker
              icon={createWatchlistIcon(signal.level)}
              key={signal.event.event_id}
              position={[
                signal.event.latitude,
                signal.event.longitude,
              ]}
            >
              <Popup maxWidth={300}>
                <div className="professional-map-popup">
                  <span>{signal.level}</span>
                  <strong>
                    {researchEventId(signal.event)} -{" "}
                    {signal.event.municipality}
                  </strong>
                  <p>{signal.rules.join(" - ")}</p>
                </div>
              </Popup>
            </Marker>
          ))}

      </MapContainer>

      {activeSelectedEvent && (
        <div className="atlas-event-preview" role="region" aria-label="Scheda evento ARCUS">
          <button
            aria-label="Chiudi scheda evento"
            className="atlas-event-preview-close"
            type="button"
            onClick={() => setSelectedEvent(null)}
          >
            ×
          </button>
          <EventPopup
            atlasMode={atlasMode}
            event={activeSelectedEvent}
            hazardProfile={eventHazards[activeSelectedEvent.province] || null}
            professionalMode={professionalMode}
            reliability={eventReliability[activeSelectedEvent.event_id] || null}
            relatedSources={sourcesByEvent[activeSelectedEvent.event_id] || []}
            vulnerability={eventVulnerability[activeSelectedEvent.event_id] || null}
          />
        </div>
      )}

    </div>
  );
}

export default CollapseMap;
