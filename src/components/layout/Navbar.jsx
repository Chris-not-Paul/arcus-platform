import {
  Link,
  useLocation,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";

import useLanguage from "../../context/useLanguage";
import logoHorizontal from "../../assets/logo/logo-horizontal.svg";

import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const { language, setLanguage, t } =
    useLanguage();
  const [isScrolled, setIsScrolled] =
    useState(false);
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const links = [
    {
      label: t("atlas"),
      path: "/atlas",
      group: "core",
    },

    {
      label: t("analytics"),
      path: "/analytics",
      group: "core",
    },

    {
      label: t("professional"),
      path: "/professional",
      group: "core",
      prominent: true,
    },

    {
      label: t("methodology"),
      path: "/methodology",
      group: "research",
    },

    {
      label: t("publications"),
      path: "/publications",
      group: "research",
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 18);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, []);

  return (
    <header
      className={`navbar ${
        isScrolled ? "scrolled" : ""
      } ${isMenuOpen ? "menu-open" : ""}`}
    >
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

      <nav
        className="navbar-links"
        aria-label="Primary navigation"
      >
        {links.map((link, index) => {
          const isAnchor =
            link.path.includes("#");
          const isActive =
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
            );
          const previousLink =
            links[index - 1];
          const startsGroup =
            previousLink &&
            previousLink.group !== link.group;
          const linkClassName = [
            "navbar-link",
            isActive ? "active" : "",
            startsGroup ? "group-start" : "",
            link.prominent ? "prominent" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return isAnchor ? (
            <a
              key={link.path}
              href={link.path}
              className={linkClassName}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.path}
              to={link.path}
              className={linkClassName}
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

      <button
        className="navbar-menu-button"
        type="button"
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen}
        aria-label={
          isMenuOpen
            ? "Close navigation"
            : "Open navigation"
        }
        onClick={() =>
          setIsMenuOpen((current) => !current)
        }
      >
        <span />
        <span />
      </button>

      <div
        className="navbar-mobile-panel"
        id="primary-navigation"
      >
        {links.map((link) => {
          const isActive =
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
            );

          return (
            <Link
              className={`navbar-mobile-link ${
                isActive ? "active" : ""
              } ${link.prominent ? "prominent" : ""}`}
              key={link.path}
              onClick={() => setIsMenuOpen(false)}
              to={link.path}
            >
              <span>{link.group}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

export default Navbar;
