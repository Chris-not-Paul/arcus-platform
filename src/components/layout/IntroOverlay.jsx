import {
  useEffect,
  useRef,
} from "react";

import ArcusLogoReveal from "../brand/ArcusLogoReveal";

import "./IntroOverlay.css";

export default function IntroOverlay({ onFinish }) {

  const overlayRef = useRef(null);

  useEffect(() => {

    const fadeTimer = setTimeout(() => {
      overlayRef.current?.classList.add(
        "fade-out"
      );
    }, 3800);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 4550);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };

  }, [onFinish]);

  return (
    <div
      ref={overlayRef}
      className="intro-overlay"
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
