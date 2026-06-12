import {
  useEffect,
  useRef,
  useState,
} from "react";

import "../../styles/motion.css";

function canAnimateReveal() {
  if (typeof window === "undefined") {
    return false;
  }

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  return !reduceMotion && "IntersectionObserver" in window;
}

function ScrollReveal({
  as: Component = "div",
  children,
  className = "",
  delay = 0,
  once = true,
  variant = "rise",
}) {
  const ref = useRef(null);
  const canAnimate = canAnimateReveal();
  const [isVisible, setIsVisible] = useState(
    () => !canAnimateReveal()
  );

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof window === "undefined") {
      return undefined;
    }

    if (!canAnimate) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);

            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.16,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [canAnimate, once]);

  return (
    <Component
      ref={ref}
      className={[
        "scroll-reveal",
        canAnimate ? "scroll-reveal-can-animate" : "",
        `scroll-reveal-${variant}`,
        isVisible ? "is-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--reveal-delay": `${delay}ms`,
      }}
    >
      {children}
    </Component>
  );
}

export default ScrollReveal;
