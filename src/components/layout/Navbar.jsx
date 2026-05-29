import {
  Link,
  useLocation,
} from "react-router-dom";

import useLanguage from "../../context/useLanguage";
import logoHorizontal from "../../assets/logo/logo-horizontal.svg";

import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const { language, setLanguage, t } =
    useLanguage();

  const links = [
    {
      label: t("atlas"),
      path: "/atlas",
    },

    {
      label: t("methodology"),
      path: "/methodology",
    },

    {
      label: t("analytics"),
      path: "/analytics",
    },

    {
      label: t("plans"),
      path: "/plans",
    },

    {
      label: t("professional"),
      path: "/professional",
    },

    {
      label: t("enterprise"),
      path: "/enterprise",
    },

    {
      label: t("publications"),
      path: "/publications",
    },

    {
      label: t("about"),
      path: "/about",
    },
  ];

  return (
    <header className="navbar">
      {/* BRAND */}

      <Link
        to="/"
        className="navbar-brand"
        aria-label="ARCUS Atlas"
      >
        <img
          className="navbar-logo"
          src={logoHorizontal}
          alt="ARCUS"
        />
      </Link>

      {/* NAVIGATION */}

      <nav className="navbar-links">
        {links.map((link) => {
          const isAnchor =
            link.path.includes("#");

          return isAnchor ? (
            <a
              key={link.path}
              href={link.path}
              className="navbar-link"
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${
                location.pathname === link.path ||
                (
                  link.path === "/analytics" &&
                  location.pathname.startsWith(
                    "/analytics/"
                  )
                ) ||
                (
                  link.path === "/professional" &&
                  location.pathname.startsWith(
                    "/professional"
                  )
                ) ||
                (
                  link.path === "/enterprise" &&
                  location.pathname.startsWith(
                    "/enterprise"
                  )
                )
                  ? "active"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="navbar-language">
        {["en", "it"].map((code) => (
          <button
            className={
              language === code ? "active" : ""
            }
            key={code}
            onClick={() => setLanguage(code)}
            type="button"
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

export default Navbar;
