import L from "leaflet";

export const createClusterCustomIcon = (
  cluster
) => {
  const count = cluster.getChildCount();

  let size = 38;
  let color = "#b89635";

  if (count >= 10 && count < 25) {
    size = 48;
    color = "#a66d22";
  }

  if (count >= 25) {
    size = 58;
    color = "#93342b";
  }

  return new L.DivIcon({
    html: `
      <div
        style="
          background:${color};
          width:${size}px;
          height:${size}px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-weight:700;
          font-size:15px;
          border:2px solid rgba(255,255,255,0.92);
          box-shadow:0 6px 18px rgba(0,0,0,0.18);
          opacity:0.96;
        "
      >
        ${count}
      </div>
    `,
    className: "custom-cluster",
    iconSize: L.point(size, size),
  });
};