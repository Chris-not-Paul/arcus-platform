import {
  Marker,
  Popup,
} from "react-leaflet";
import { researchEventId } from "../../utils/eventIdentity";

import {
  createMarkerIcon,
} from "../../utils/markerFactory";

function EventMarker({
  event,
  onSelect,
  professionalMode = false,
  vulnerability = null,
}) {
  const markerTitle =
    event.bridge_name ||
    event.bridge_crossing_name ||
    `${event.municipality || event.province || "ARCUS"} - ${researchEventId(event) || "record"}`;

  return (

    <Marker
      alt={markerTitle}
      eventHandlers={{
        click: () => onSelect?.(event),
        popupopen: (leafletEvent) => {
          onSelect?.(event);
          window.setTimeout(() => leafletEvent.target.closePopup(), 0);
        },
      }}
      position={[
        event.latitude,
        event.longitude,
      ]}

      icon={createMarkerIcon(
        event.specific_cause,
        professionalMode
          ? vulnerability?.class
          : null
      )}
      title={markerTitle}
    >
      <Popup className="arcus-selection-proxy" closeButton={false}>
        <span />
      </Popup>
    </Marker>
  );
}

export default EventMarker;
