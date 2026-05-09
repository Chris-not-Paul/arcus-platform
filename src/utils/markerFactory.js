import L from "leaflet";
import { causeColors } from "./colors";

export const createModernMarker = (
  cause
) => {
  const color =
    causeColors[cause] || "#3f6b78";

  return L.divIcon({
    className: "",
    html: `
      <div
        style="
          position:relative;
          width:26px;
          height:26px;
          transform:rotate(45deg);
          background:${color};
          border-radius:6px 6px 6px 0;
          border:2px solid rgba(255,255,255,0.95);
          box-shadow:0 4px 10px rgba(0,0,0,0.22);
        "
      >
        <div
          style="
            position:absolute;
            width:8px;
            height:8px;
            background:white;
            border-radius:50%;
            top:7px;
            left:7px;
          "
        ></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -18],
  });
};