import {
  Marker,
  Popup,
} from "react-leaflet";

import EventPopup from "../popup/EventPopup";

import {
  createMarkerIcon,
} from "../../utils/markerFactory";

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

      icon={createMarkerIcon(
        event.specific_cause
      )}
    >

      <Popup maxWidth={340}>

        <EventPopup
          event={event}
          relatedSources={
            relatedSources || []
          }
        />

      </Popup>

    </Marker>
  );
}

export default EventMarker;
