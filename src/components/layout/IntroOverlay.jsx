import { useEffect, useState } from "react";
import "./IntroOverlay.css";

export default function IntroOverlay({ onFinish }) {

  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 1800);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };

  }, [onFinish]);

  return (
    <div className={`intro-overlay ${fadeOut ? "fade-out" : ""}`}>

      <div className="intro-grid" />

      <div className="intro-content">

        <div className="intro-label">
          Infrastructure Failure Observatory
        </div>

        <h1 className="intro-title">
          <span>ARCUS</span>
          <span>ATLAS</span>
        </h1>

        <div className="intro-line">
          <div className="intro-line-pulse" />
        </div>

        <div className="intro-status">
          <span>
            Continuous infrastructure intelligence system
          </span>
        </div>

      </div>
    </div>
  );
}