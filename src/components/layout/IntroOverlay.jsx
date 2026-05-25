import { useEffect, useState } from "react";

import ArcusLogoReveal from "../brand/ArcusLogoReveal";

import "./IntroOverlay.css";

export default function IntroOverlay({ onFinish }) {

  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3200);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3950);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };

  }, [onFinish]);

  return (
    <div
      className={`intro-overlay ${fadeOut ? "fade-out" : ""}`}
      aria-hidden="true"
    >

      <div className="intro-grid" />
      <div className="intro-beam" />

      <div className="intro-content">

        <div className="intro-logo-shell">
          <ArcusLogoReveal />
        </div>

        <div className="intro-signal-line">
          <span />
        </div>

        <p className="intro-caption">
          Infrastructure Failure Observatory
        </p>

      </div>
    </div>
  );
}
