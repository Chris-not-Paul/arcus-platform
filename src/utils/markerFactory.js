import L from "leaflet";

import {
  causeColors,
} from "./colors";

/* ================================= */
/* ARCUS MARKER FACTORY v3 */
/* ================================= */

export function createMarkerIcon(
  specificCause
) {

  const baseColor =
    causeColors[
      specificCause
    ] || "#4f6b82";

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

        width:20px;
        height:20px;

        display:flex;
        align-items:center;
        justify-content:center;
      "
    >

      <!-- HALO -->

      <div
        style="
          position:absolute;

          width:24px;
          height:24px;

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

          width:14px;
          height:14px;

          border-radius:999px;

          border:
            1.2px solid ${ring};

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

          width:10px;
          height:10px;

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

          width:6px;
          height:6px;

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
      [20, 20],

    iconAnchor:
      [10, 10],

  });
}
