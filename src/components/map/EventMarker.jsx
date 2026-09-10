import {
  Marker,
} from "react-leaflet";
import useLanguage from "../../context/useLanguage";
import { localizedBridgeDisplayName } from "../../utils/eventDisplayLabels";
import { researchEventId } from "../../utils/eventIdentity";

import {
  createMarkerIcon,
} from "../../utils/markerFactory";

function EventMarker({
  event,
  onSelect,
  professionalMode = false,
  selected = false,
  vulnerability = null,
}) {
  const { language } = useLanguage();
  const markerTitle =
    localizedBridgeDisplayName(event, language) ||
    `${event.municipality || event.province || "ARCUS"} - ${researchEventId(event) || "record"}`;

  return (

    <Marker
      alt={markerTitle}
      eventHandlers={{
        click: () => onSelect?.(event),
      }}
      position={[
        event.latitude,
        event.longitude,
      ]}

      icon={createMarkerIcon(
        event.specific_cause,
        professionalMode
          ? vulnerability?.class
          : null,
        selected
      )}
      zIndexOffset={selected ? 1000 : 0}
      title={markerTitle}
    />
  );
}

export default EventMarker;
