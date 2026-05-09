import {
  Marker,
  Popup,
} from "react-leaflet";

import EventPopup from "../popup/EventPopup";

import { createModernMarker } from "../../utils/markerFactory";

function EventMarker({
  event,
  relatedSources,
}) {
  return (
    <Marker
      position={[
        event.latitude,
        event.longitude,
      ]}
      icon={createModernMarker(
        event.specific_cause
      )}
    >
      <Popup maxWidth={320}>
        <EventPopup
          event={event}
          relatedSources={
            relatedSources
          }
        />
      </Popup>
    </Marker>
  );
}

export default EventMarker;