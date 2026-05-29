import {
  Marker,
  Popup,
} from "react-leaflet";

import EventPopup from "../popup/EventPopup";

import {
  createMarkerIcon,
} from "../../utils/markerFactory";

function EventMarker({
  atlasMode = "open",
  event,
  hazardProfile = null,
  professionalMode = false,
  reliability = null,
  relatedSources,
  vulnerability = null,
}) {

  return (

    <Marker
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
    >

      <Popup maxWidth={420}>

        <EventPopup
          atlasMode={atlasMode}
          event={event}
          hazardProfile={hazardProfile}
          professionalMode={professionalMode}
          reliability={reliability}
          relatedSources={
            relatedSources || []
          }
          vulnerability={vulnerability}
        />

      </Popup>

    </Marker>
  );
}

export default EventMarker;
