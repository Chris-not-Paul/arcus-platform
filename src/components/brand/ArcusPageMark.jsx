import logoMark from "../../assets/logo/logo-mark.svg";

import "../../styles/arcus-page-mark.css";

function ArcusPageMark({ className = "" }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`arcus-page-mark ${className}`.trim()}
      decoding="async"
      src={logoMark}
    />
  );
}

export default ArcusPageMark;
