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

  let size = 40;

  if (count > 10) {
    size = 46;
  }

  if (count > 25) {
    size = 52;
  }

  if (count > 50) {
    size = 58;
  }

  /* ================================= */
  /* VISUAL INTENSITY */
  /* ================================= */

  let ringOpacity = 0.22;
  let fillOpacity = 0.52;

  if (count > 25) {
    ringOpacity = 0.32;
    fillOpacity = 0.58;
  }

  if (count > 50) {
    ringOpacity = 0.42;
    fillOpacity = 0.64;
  }

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

          width:${size * 1.45}px;
          height:${size * 1.45}px;

          border-radius:999px;

          background:
            radial-gradient(
              circle,
              rgba(80,100,140,0.06) 0%,
              rgba(80,100,140,0.03) 40%,
              rgba(80,100,140,0.00) 72%
            );

          pointer-events:none;
        "
      ></div>

      <!-- OUTER RING -->

      <div
        style="
          position:absolute;

          inset:0;

          border-radius:999px;

          border:
            1px solid
            rgba(255,255,255,${ringOpacity});

          background:
            rgba(22,28,38,${fillOpacity});

          backdrop-filter:
            blur(10px);
        "
      ></div>

      <!-- INNER RING -->

      <div
        style="
          position:absolute;

          width:${size * 0.74}px;
          height:${size * 0.74}px;

          border-radius:999px;

          border:
            1px solid
            rgba(255,255,255,0.05);
        "
      ></div>

      <!-- CENTER SIGNAL -->

      <div
        style="
          position:absolute;

          width:${size * 0.08}px;
          height:${size * 0.08}px;

          border-radius:999px;

          background:
            rgba(255,255,255,0.88);
        "
      ></div>

      <!-- VALUE -->

      <div
        style="
          position:relative;

          z-index:10;

          color:white;

          font-family:
            Inter,
            sans-serif;

          font-size:${size * 0.23}px;

          font-weight:700;

          letter-spacing:-0.03em;

          text-shadow:
            0 1px 2px rgba(0,0,0,0.18);
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