import L from "leaflet";

/* ================================= */
/* ARCUS CLUSTER FACTORY v3 */
/* ================================= */

export function createClusterCustomIcon(
  cluster
) {

  const count =
    cluster.getChildCount();

  /* ================================= */
  /* SIZE */
  /* ================================= */

  let size = 30;

  if (count > 10) {
    size = 34;
  }

  if (count > 25) {
    size = 38;
  }

  if (count > 50) {
    size = 42;
  }

  /* ================================= */
  /* VISUAL INTENSITY */
  /* ================================= */

  const accentColor = "#173F42";

  /* ================================= */
  /* HTML */
  /* ================================= */

  const html = `
    <div
      style="
        position:relative;

        width:${size}px;
        height:${size}px;

        display:flex;
        align-items:center;
        justify-content:center;
      "
    >

      <!-- SIGNAL HALO -->

      <div
        style="
          position:absolute;

          width:${size * 1.30}px;
          height:${size * 1.30}px;

          border-radius:999px;

          background:
            radial-gradient(
              circle,
              ${accentColor}16 0%,
              rgba(23,63,66,0.00) 72%
            );

          pointer-events:none;
        "
      ></div>

      <!-- OUTER RING -->

      <div
        style="
          position:absolute;

          inset:1px;

          border-radius:999px;

          border:2px solid rgba(252,251,247,0.94);

          background:rgba(23,63,66,0.94);

          box-shadow:
            0 0 0 1px ${accentColor},
            0 5px 14px rgba(23,63,66,0.22);
        "
      ></div>

      <!-- VALUE -->

      <div
        style="
          position:relative;

          z-index:10;

          color:rgba(252,251,247,0.96);

          font-family:
            var(--arcus-font-body),
            sans-serif;

          font-size:${Math.max(10, size * 0.27)}px;

          font-weight:700;

          letter-spacing:-0.03em;

          text-shadow:none;
        "
      >
        ${count}
      </div>

    </div>
  `;

  return L.divIcon({

    html,

    className:
      "arcus-cluster-icon",

    iconSize:
      L.point(size, size),

  });
}
