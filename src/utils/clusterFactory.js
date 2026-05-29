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

  let size = 36;

  if (count > 10) {
    size = 42;
  }

  if (count > 25) {
    size = 48;
  }

  if (count > 50) {
    size = 54;
  }

  /* ================================= */
  /* VISUAL INTENSITY */
  /* ================================= */

  let accentColor = "#8C735D";
  let ringOpacity = 0.48;
  let fillOpacity = 0.70;

  if (count > 25) {
    accentColor = "#C49040";
    ringOpacity = 0.58;
    fillOpacity = 0.74;
  }

  if (count > 50) {
    accentColor = "#B9781F";
    ringOpacity = 0.66;
    fillOpacity = 0.78;
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
              ${accentColor}26 0%,
              ${accentColor}12 44%,
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
            ${accentColor}${Math.round(ringOpacity * 255)
              .toString(16)
              .padStart(2, "0")};

          background:
            linear-gradient(
              145deg,
              rgba(32,28,24,${fillOpacity}),
              rgba(18,15,13,${fillOpacity})
            );

          backdrop-filter:
            blur(10px);

          box-shadow:
            0 10px 24px rgba(18,15,13,0.22),
            inset 0 1px 0 rgba(255,248,242,0.08);
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
            ${accentColor}44;
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
            ${accentColor};
        "
      ></div>

      <!-- VALUE -->

      <div
        style="
          position:relative;

          z-index:10;

          color:white;

          font-family:
            var(--arcus-font-body),
            sans-serif;

          font-size:${size * 0.24}px;

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
