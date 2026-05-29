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
    vulnerabilityClass ? 22 : 18;

  const coreSize =
    vulnerabilityClass ? 7 : 5;

  /* ================================= */
  /* SIGNAL SYSTEM */
  /* ================================= */

  const halo = `${baseColor}20`;

  const ring = `${baseColor}55`;

  const glow = `${baseColor}35`;

  const coreShadow = `${baseColor}66`;

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

          width:${markerSize + 8}px;
          height:${markerSize + 8}px;

          border-radius:999px;

          background:
            radial-gradient(
              circle,
              ${halo} 0%,
              rgba(0,0,0,0) 72%
            );

          filter:blur(3px);

          pointer-events:none;
        "
      ></div>

      <!-- OUTER RING -->

      <div
        style="
          position:absolute;

          width:${markerSize - 6}px;
          height:${markerSize - 6}px;

          border-radius:999px;

          border:
            ${vulnerabilityClass ? "2px" : "1.2px"} solid ${ring};

          background:
            rgba(255,255,255,0.04);

          backdrop-filter:
            blur(6px);
        "
      ></div>

      <!-- INNER GLOW -->

      <div
        style="
          position:absolute;

          width:${markerSize - 10}px;
          height:${markerSize - 10}px;

          border-radius:999px;

          background:${glow};

          filter:blur(3px);

          opacity:0.9;
        "
      ></div>

      <!-- COLOR CORE -->

      <div
        style="
          position:absolute;

          width:${coreSize}px;
          height:${coreSize}px;

          border-radius:999px;

          background:${baseColor};

          box-shadow:
            0 0 0 1px rgba(255,255,255,0.18),
            0 0 8px ${coreShadow};
        "
      ></div>

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
