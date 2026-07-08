import {
  useLayoutEffect,
  useRef,
} from "react";

const logoMarkup = `
<svg id="arcus-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <defs>
    <style>
      .wm { font-family:'Raleway','Helvetica Neue',Arial,sans-serif; fill:#F2E8D4; font-weight:300; letter-spacing:12px; font-size:28px; }
      .tg { font-family:'Raleway','Helvetica Neue',Arial,sans-serif; fill:#6A5A42; font-size:8px; letter-spacing:4px; font-weight:300; }
    </style>
  </defs>

  <polygon id="leg-left"
    points="119.7,132.2  160,55.9  160,70.1  133.3,132.2"
    fill="#C49040" opacity="0"/>

  <polygon id="leg-right"
    points="160,55.9  200.3,132.2  186.7,132.2  160,70.1"
    fill="#C49040" opacity="0"/>

  <rect id="tirante" x="141" y="101.2" width="0" height="2.5" rx="0.4" fill="#C49040" opacity="0"/>

  <rect id="base" x="119.7" y="128.4" width="0" height="3.7" rx="0.6" fill="#C49040" opacity="0"/>

  <text id="wordmark" x="160" y="168" text-anchor="middle" class="wm" opacity="0">ARCUS</text>

  <line id="line-left"  x1="56"  y1="181" x2="56"  y2="181" stroke="#2E2820" stroke-width="0.5"/>
  <line id="line-right" x1="264" y1="181" x2="264" y2="181" stroke="#2E2820" stroke-width="0.5"/>
  <circle id="dot" cx="160" cy="181" r="0" fill="#C49040"/>

  <text id="tagline" x="160" y="200" text-anchor="middle" class="tg" opacity="0">INFRASTRUCTURE INTELLIGENCE</text>
</svg>
`;

export default function ArcusLogoReveal({
  className = "",
}) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    container.innerHTML = logoMarkup;

    const timers = [];
    const frames = [];
    const svg = container.querySelector("#arcus-logo");
    const getPart = (id) =>
      svg?.querySelector(`#${id}`);

    const setTimer = (callback, delay) => {
      const timer = window.setTimeout(
        callback,
        delay
      );
      timers.push(timer);
      return timer;
    };

    const setFrame = (callback) => {
      const frame =
        window.requestAnimationFrame(callback);
      frames.push(frame);
      return frame;
    };

    function easeOut(t) {
      return 1 - (1 - t) * (1 - t) * (1 - t);
    }

    function easeInOut(t) {
      return t < 0.5
        ? 4 * t * t * t
        : (t - 1) *
            (2 * t - 2) *
            (2 * t - 2) +
          1;
    }

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tween(
      id,
      prop,
      from,
      to,
      dur,
      delay,
      easeFn
    ) {
      const el = getPart(id);
      const fn = easeFn || easeInOut;

      if (!el) {
        return;
      }

      setTimer(() => {
        const s = performance.now();

        (function step(now) {
          const raw = Math.max(
            0,
            Math.min((now - s) / dur, 1)
          );
          const v = from + (to - from) * fn(raw);

          if (prop === "opacity") {
            el.setAttribute("opacity", v);
          } else if (prop === "r") {
            el.setAttribute("r", v);
          } else if (prop === "width") {
            el.setAttribute("width", v);
          } else if (prop === "x2") {
            el.setAttribute("x2", v);
          } else if (prop === "x1") {
            el.setAttribute("x1", v);
          } else if (prop === "x") {
            el.setAttribute("x", v);
          }

          if (raw < 1) {
            setFrame(step);
          }
        })(performance.now());
      }, delay);
    }

    function fadeSlide(
      id,
      slideY,
      dur,
      delay,
      easeFn
    ) {
      const el = getPart(id);
      const fn = easeFn || easeOut;

      if (!el) {
        return;
      }

      setTimer(() => {
        const s = performance.now();

        (function step(now) {
          const raw = Math.max(
            0,
            Math.min((now - s) / dur, 1)
          );
          const t = fn(raw);

          el.setAttribute("opacity", t);
          el.setAttribute(
            "transform",
            `translate(0,${slideY * (1 - t)})`
          );

          if (raw < 1) {
            setFrame(step);
          } else {
            el.setAttribute(
              "transform",
              "translate(0,0)"
            );
          }
        })(performance.now());
      }, delay);
    }

    function tweenTirante(dur, delay) {
      const el = getPart("tirante");

      if (!el) {
        return;
      }

      setTimer(() => {
        const s = performance.now();

        (function step(now) {
          const raw = Math.max(
            0,
            Math.min((now - s) / dur, 1)
          );
          const t = easeOutExpo(raw);
          const halfW = 19.85 * t;

          el.setAttribute("x", 160 - halfW);
          el.setAttribute("width", halfW * 2);
          el.setAttribute(
            "opacity",
            Math.min(t * 3, 1)
          );

          if (raw < 1) {
            setFrame(step);
          }
        })(performance.now());
      }, delay);
    }

    function tweenBase(dur, delay) {
      const el = getPart("base");

      if (!el) {
        return;
      }

      setTimer(() => {
        const s = performance.now();

        (function step(now) {
          const raw = Math.max(
            0,
            Math.min((now - s) / dur, 1)
          );
          const t = easeOut(raw);
          const halfW = 39.7 * t;

          el.setAttribute("x", 160 - halfW);
          el.setAttribute("width", halfW * 2);
          el.setAttribute(
            "opacity",
            Math.min(t * 2, 1)
          );

          if (raw < 1) {
            setFrame(step);
          }
        })(performance.now());
      }, delay);
    }

    function resetAll() {
      [
        "leg-left",
        "leg-right",
        "wordmark",
        "tagline",
      ].forEach((id) => {
        const el = getPart(id);

        if (!el) {
          return;
        }

        el.setAttribute("opacity", 0);
        el.setAttribute(
          "transform",
          "translate(0,0)"
        );
      });

      const tirante = getPart("tirante");
      const base = getPart("base");

      tirante?.setAttribute("width", 0);
      tirante?.setAttribute("x", 141);
      tirante?.setAttribute("opacity", 0);
      base?.setAttribute("width", 0);
      base?.setAttribute("x", 119.7);
      base?.setAttribute("opacity", 0);
      getPart("dot")?.setAttribute("r", 0);
      getPart("line-left")?.setAttribute("x2", 56);
      getPart("line-right")?.setAttribute("x1", 264);
    }

    function runReveal() {
      resetAll();
      fadeSlide(
        "leg-left",
        20,
        700,
        100,
        easeOut
      );
      fadeSlide(
        "leg-right",
        20,
        700,
        280,
        easeOut
      );
      tweenTirante(500, 820);
      tweenBase(450, 980);
      fadeSlide(
        "wordmark",
        14,
        700,
        1300,
        easeOut
      );
      tween(
        "line-left",
        "x2",
        56,
        148,
        500,
        1800,
        easeOutExpo
      );
      tween(
        "line-right",
        "x1",
        264,
        172,
        500,
        1800,
        easeOutExpo
      );
      tween(
        "dot",
        "r",
        0,
        1.5,
        300,
        2000,
        easeOut
      );
      fadeSlide(
        "tagline",
        8,
        900,
        2150,
        easeOut
      );
    }

    setTimer(runReveal, 600);

    return () => {
      timers.forEach((timer) =>
        window.clearTimeout(timer)
      );
      frames.forEach((frame) =>
        window.cancelAnimationFrame(frame)
      );
      container.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`arcus-logo-reveal ${className}`}
      aria-hidden="true"
    />
  );
}
