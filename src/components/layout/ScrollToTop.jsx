import { useEffect } from "react";

import { useLocation } from "react-router-dom";

function ScrollToTop() {

  const { hash, pathname } = useLocation();

  useEffect(() => {

    const frame = window.requestAnimationFrame(() => {
      const anchor = hash
        ? document.getElementById(decodeURIComponent(hash.slice(1)))
        : null;

      if (anchor) {
        anchor.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
        return;
      }

      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    });

    return () => window.cancelAnimationFrame(frame);

  }, [hash, pathname]);

  return null;
}

export default ScrollToTop;
