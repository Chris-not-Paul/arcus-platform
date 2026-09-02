import L from "leaflet";

import {
  causeColors,
} from "./colors";

/* ================================= */
/* ARCUS MARKER FACTORY v3 */
/* ================================= */

export function createMarkerIcon(
  specificCause,
  vulnerabilityClass = null
) {

  const professionalColors = {
    Critical: "#893526",
    High: "#B9781F",
    Medium: "#6E858D",
    Low: "#4F6B82",
  };

  const baseColor =
    professionalColors[
      vulnerabilityClass
    ] ||
    causeColors[
      specificCause
    ] || "#4f6b82";

  const markerSize =
    vulnerabilityClass ? 28 : 26;

  const signalSize =
    vulnerabilityClass ? 21 : 19;

  /* ================================= */
  /* SIGNAL SYSTEM */
  /* ================================= */

  const halo = `${baseColor}18`;

  const ring = `${baseColor}66`;

  /* ================================= */
  /* HTML */
  /* ================================= */

  const html = `
    <div
      style="
        position:relative;

        width:${markerSize}px;
        height:${markerSize}px;

        display:flex;
        align-items:center;
        justify-content:center;
      "
    >

      <!-- HALO -->

      <div
        style="
          position:absolute;

          width:${markerSize + 6}px;
          height:${markerSize + 6}px;

          border-radius:999px;

          background:
            radial-gradient(
              circle,
              ${halo} 0%,
              rgba(0,0,0,0) 70%
            );

          pointer-events:none;
        "
      ></div>

      <!-- MEDIUM-SCALE SIGNAL -->

      <div
        style="
          position:absolute;

          width:${signalSize}px;
          height:${signalSize}px;

          border-radius:999px;

          background:${baseColor};

          border:2px solid rgba(252,251,247,0.94);

          box-shadow:
            0 0 0 1px ${ring},
            0 4px 10px rgba(23,63,66,0.20);
        "
      >
        <div
          style="
            position:absolute;
            inset:50% auto auto 50%;
            width:3px;
            height:3px;
            border-radius:999px;
            background:rgba(252,251,247,0.90);
            transform:translate(-50%,-50%);
          "
        ></div>
      </div>

    </div>
  `;

  return L.divIcon({

    html,

    className:
      "arcus-marker-icon",

    iconSize:
      [markerSize, markerSize],

    iconAnchor:
      [markerSize / 2, markerSize / 2],

  });
}

export function createProfessionalAssetIcon() {
  return L.divIcon({
    className: "arcus-asset-marker-icon",
    html: `
      <div style="
        width:24px;
        height:24px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:6px;
        border:1px solid rgba(21,17,15,0.72);
        background:#C49040;
        box-shadow:0 10px 24px rgba(21,17,15,0.24), 0 0 0 4px rgba(196,144,64,0.18);
      ">
        <div style="
          width:8px;
          height:8px;
          border-radius:2px;
          background:#15110F;
        "></div>
      </div>
    `,
    iconAnchor: [12, 12],
    iconSize: [24, 24],
  });
}

export function createWatchlistIcon(level = "Watch") {
  const critical =
    String(level).toLowerCase() === "critical";
  const color = critical ? "#893526" : "#6E858D";

  return L.divIcon({
    className: "arcus-watchlist-marker-icon",
    html: `
      <div style="
        position:relative;
        width:26px;
        height:26px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <div style="
          position:absolute;
          width:26px;
          height:26px;
          border-radius:999px;
          background:${color}24;
          filter:blur(2px);
        "></div>
        <div style="
          position:absolute;
          width:18px;
          height:18px;
          border-radius:999px;
          border:1px solid ${color};
          background:#FFF8F2;
          box-shadow:0 8px 22px rgba(21,17,15,0.22);
        "></div>
        <div style="
          position:absolute;
          width:6px;
          height:6px;
          border-radius:999px;
          background:${color};
        "></div>
      </div>
    `,
    iconAnchor: [13, 13],
    iconSize: [26, 26],
  });
}
