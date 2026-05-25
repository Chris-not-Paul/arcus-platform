export default function ArcusLogoReveal({
  className = "",
}) {
  return (
    <svg
      className={`arcus-logo-reveal ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 220"
      aria-hidden="true"
    >
      <defs>
        <style>
          {`
            .arcus-reveal-wordmark {
              font-family: Raleway, "Helvetica Neue", Arial, sans-serif;
              fill: #f2e8d4;
              font-weight: 300;
              letter-spacing: 12px;
              font-size: 28px;
            }

            .arcus-reveal-tagline {
              font-family: Raleway, "Helvetica Neue", Arial, sans-serif;
              fill: #8a7a60;
              font-size: 8px;
              letter-spacing: 4px;
              font-weight: 300;
            }
          `}
        </style>
      </defs>

      <polygon
        className="arcus-reveal-leg arcus-reveal-leg-left"
        points="125.28,124.16 160,33.64 160,48.52 136.44,124.16"
        fill="#c49040"
      />

      <polygon
        className="arcus-reveal-leg arcus-reveal-leg-right"
        points="160,33.64 194.72,124.16 183.56,124.16 160,48.52"
        fill="#c49040"
      />

      <rect
        className="arcus-reveal-tirante"
        x="142.02"
        y="90.68"
        width="35.96"
        height="2.48"
        rx="0.5"
        fill="#c49040"
      />

      <rect
        className="arcus-reveal-base"
        x="125.28"
        y="120.44"
        width="69.44"
        height="3.72"
        rx="0.6"
        fill="#c49040"
      />

      <text
        className="arcus-reveal-wordmark"
        x="160"
        y="148"
        textAnchor="middle"
      >
        ARCUS
      </text>

      <line
        className="arcus-reveal-line arcus-reveal-line-left"
        x1="56"
        y1="161"
        x2="148"
        y2="161"
        stroke="#6a5a42"
        strokeWidth="0.5"
      />

      <line
        className="arcus-reveal-line arcus-reveal-line-right"
        x1="264"
        y1="161"
        x2="172"
        y2="161"
        stroke="#6a5a42"
        strokeWidth="0.5"
      />

      <circle
        className="arcus-reveal-dot"
        cx="160"
        cy="161"
        r="1.5"
        fill="#c49040"
      />

      <text
        className="arcus-reveal-tagline"
        x="160"
        y="180"
        textAnchor="middle"
      >
        INFRASTRUCTURE INTELLIGENCE
      </text>
    </svg>
  );
}
