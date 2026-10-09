import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";

import useLanguage from "../../context/useLanguage";
import logoHorizontal from "../../assets/logo/logo-horizontal-dark.svg";
import logoMark from "../../assets/logo/logo-mark.svg";
import {
  getSession,
  logoutProfessional,
} from "#arcus-session-client";
import { accountsEnabled } from "../../config/site";

import "./Navbar.css";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } =
    useLanguage();
  const [isScrolled, setIsScrolled] =
    useState(false);
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);
  const [accountOpen, setAccountOpen] =
    useState(false);
  const [session, setSession] = useState(null);

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
      label: t("methodology"),
      path: "/methodology",
      group: "research",
    },

    {
      label: t("publications"),
      path: "/publications",
      group: "research",
    },

    {
      label:
        language === "it"
          ? "Dati"
          : "Data",
      path: "/data-access",
      group: "research",
    },

    {
      label: language === "it" ? "Contribuisci" : "Contribute",
      path: "/contribute",
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

  useEffect(() => {
    if (!accountsEnabled) {
      return undefined;
    }

    let active = true;

    getSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession);
        }
      })
      .catch(() => {
        if (active) {
          setSession(null);
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const authenticated = Boolean(session?.authenticated);
  const hasWildcard =
    session?.permissions?.includes("*");
  const isAdmin =
    hasWildcard ||
    session?.permissions?.includes("admin:access");
  const accountBadge = "Open";

  const handleSignOut = () => {
    logoutProfessional()
      .catch(() => null)
      .finally(() => {
        setSession(null);
        navigate("/");
      });
  };

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
        aria-label="ARCUS"
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
            link.path?.includes("#");
          const isActive =
            location.pathname === link.path ||
            (
              link.path === "/analytics" &&
              location.pathname.startsWith(
                "/analytics/"
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

      {accountsEnabled && <div className="navbar-account">
        {authenticated ? (
          <>
            <button
              aria-expanded={accountOpen}
              aria-label={
                language === "it"
                  ? "Menu account"
                  : "Account menu"
              }
              className="navbar-account-trigger"
              onClick={() =>
                setAccountOpen((current) => !current)
              }
              type="button"
            >
              <span>
                <img src={logoMark} alt="" />
              </span>
              <strong>{accountBadge}</strong>
            </button>
            {accountOpen && (
              <div className="navbar-account-menu">
                <p>
                  <span>
                    {language === "it"
                      ? "Accesso attivo"
                      : "Signed in"}
                  </span>
                  <strong>{session.username}</strong>
                </p>
                <Link
                  onClick={() => setAccountOpen(false)}
                  to="/account"
                >
                  {language === "it"
                    ? "Account"
                    : "Account"}
                </Link>
                <Link
                  onClick={() => setAccountOpen(false)}
                  to="/atlas"
                >
                  {language === "it"
                    ? "Atlas Open"
                    : "Open Atlas"}
                </Link>
                {isAdmin && (
                  <Link
                    onClick={() => setAccountOpen(false)}
                    to="/admin"
                  >
                    Admin
                  </Link>
                )}
                <button type="button" onClick={handleSignOut}>
                  {language === "it" ? "Esci" : "Sign out"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <button
              aria-expanded={accountOpen}
              className="navbar-signin-trigger"
              onClick={() =>
                setAccountOpen((current) => !current)
              }
              type="button"
            >
              {language === "it" ? "Accedi" : "Sign in"}
            </button>
            {accountOpen && (
              <div className="navbar-account-menu signin">
                <Link
                  onClick={() => setAccountOpen(false)}
                  to="/account"
                >
                  <span>Open</span>
                  {language === "it"
                    ? "Account free"
                    : "Free account"}
                </Link>
              </div>
            )}
          </>
        )}
      </div>}

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
        {accountsEnabled && (authenticated ? (
          <Link
            className="navbar-mobile-link account"
            onClick={() => setIsMenuOpen(false)}
            to="/account"
          >
            <span>{accountBadge}</span>
            {session.username}
          </Link>
        ) : (
          <>
            <Link
              className="navbar-mobile-link account"
              onClick={() => setIsMenuOpen(false)}
              to="/account"
            >
              <span>Open</span>
              {language === "it"
                ? "Account free"
                : "Free account"}
            </Link>
          </>
        ))}

        {links.map((link) => {
          const isActive =
            location.pathname === link.path ||
            (
              link.path === "/analytics" &&
              location.pathname.startsWith(
                "/analytics/"
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
