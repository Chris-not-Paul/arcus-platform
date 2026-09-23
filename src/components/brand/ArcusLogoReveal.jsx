import {
  useLayoutEffect,
  useRef,
} from "react";

const logoMarkup = `
<svg id="arcus-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <defs>
    <style>
      .tg { font-family:'IBM Plex Mono',ui-monospace,monospace; fill:#FCFBF7; fill-opacity:.78; font-size:7px; letter-spacing:2.2px; font-weight:600; }
    </style>
  </defs>

  <path id="leg-left"
    d="M119.7 132.2 149.8 75.1 153.9 82.6 133.3 132.2Z M151.8 71.4 160 55.9 160 70.1 155.4 78.8Z"
    fill="#C58A32" opacity="0"/>

  <polygon id="leg-right"
    points="160,55.9  200.3,132.2  186.7,132.2  160,70.1"
    fill="#C58A32" opacity="0"/>

  <rect id="tirante" x="140" y="100.4" width="0" height="3.7" rx="0.5" fill="#C58A32" opacity="0"/>

  <rect id="base" x="119.7" y="127.8" width="0" height="4.4" rx="0.6" fill="#C58A32" opacity="0"/>

  <g id="wordmark" opacity="0">
    <path d="M107.44 54 105.1 46.96H95.38L93.1 54H88.82L97.68 28H102.97L111.84 54ZM100.33 31.87H100.14L96.38 43.35H104.05Z M134.07 54H129.86V28H141.07Q144.58 28 146.59 30.11Q148.6 32.21 148.6 35.82Q148.6 38.62 147.31 40.46Q146.03 42.3 143.53 43.05L149.16 54H144.46L139.25 43.5H134.07ZM140.78 39.96Q142.38 39.96 143.27 39.12Q144.17 38.28 144.17 36.72V34.93Q144.17 33.36 143.27 32.52Q142.38 31.69 140.78 31.69H134.07V39.96Z M178.02 54.45Q172.92 54.45 170.01 51.01Q167.11 47.56 167.11 41Q167.11 37.72 167.86 35.22Q168.6 32.73 170.01 31.02Q171.43 29.3 173.46 28.43Q175.49 27.55 178.02 27.55Q181.41 27.55 183.7 29.04Q185.99 30.53 187.3 33.44L183.76 35.38Q183.09 33.51 181.69 32.41Q180.29 31.32 178.02 31.32Q175 31.32 173.29 33.36Q171.58 35.41 171.58 39.03V42.97Q171.58 46.59 173.29 48.64Q175 50.68 178.02 50.68Q180.37 50.68 181.84 49.47Q183.31 48.26 184.02 46.36L187.41 48.41Q186.1 51.24 183.75 52.84Q181.41 54.45 178.02 54.45Z M209.86 28V44.02Q209.86 47.33 211.13 49Q212.4 50.68 215.45 50.68Q218.5 50.68 219.77 49Q221.04 47.33 221.04 44.02V28H225.17V43.35Q225.17 46.21 224.65 48.3Q224.13 50.39 222.97 51.75Q221.82 53.11 219.97 53.78Q218.13 54.45 215.45 54.45Q212.77 54.45 210.93 53.78Q209.08 53.11 207.93 51.75Q206.77 50.39 206.25 48.3Q205.73 46.21 205.73 43.35V28Z M253.21 54.45Q249.94 54.45 247.65 53.26Q245.36 52.06 243.72 50.05L246.62 47.33Q248 49.01 249.66 49.86Q251.32 50.72 253.44 50.72Q255.93 50.72 257.2 49.61Q258.47 48.49 258.47 46.59Q258.47 45.06 257.58 44.17Q256.68 43.27 254.41 42.83L252.1 42.42Q248.3 41.71 246.4 39.92Q244.5 38.13 244.5 35Q244.5 33.29 245.15 31.89Q245.8 30.5 246.98 29.55Q248.15 28.6 249.82 28.08Q251.5 27.55 253.59 27.55Q256.53 27.55 258.69 28.58Q260.85 29.6 262.38 31.54L259.44 34.15Q258.43 32.84 256.98 32.06Q255.52 31.28 253.36 31.28Q251.13 31.28 249.9 32.17Q248.67 33.07 248.67 34.78Q248.67 36.42 249.68 37.22Q250.68 38.02 252.81 38.43L255.11 38.91Q259.03 39.66 260.83 41.44Q262.64 43.23 262.64 46.36Q262.64 48.19 262 49.68Q261.37 51.17 260.16 52.23Q258.95 53.29 257.2 53.87Q255.45 54.45 253.21 54.45Z" transform="translate(-18 112)" fill="#FCFBF7"/>
  </g>

  <line id="line-left"  x1="56"  y1="181" x2="56"  y2="181" stroke="#202826" stroke-width="0.5"/>
  <line id="line-right" x1="264" y1="181" x2="264" y2="181" stroke="#202826" stroke-width="0.5"/>
  <circle id="dot" cx="160" cy="181" r="0" fill="#C58A32"/>

  <text id="tagline" x="160" y="200" text-anchor="middle" class="tg" opacity="0">BRIDGE FAILURE OBSERVATORY</text>
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
