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
import logoHorizontal from "../../assets/logo/logo-horizontal.svg";
import logoMark from "../../assets/logo/logo-mark.svg";
import {
  getSession,
  logoutProfessional,
} from "../../utils/apiClient";

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

  useEffect(() => {
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
  const isProfessional =
    hasWildcard ||
    session?.permissions?.includes("professional:read");
  const isAdmin =
    hasWildcard ||
    session?.permissions?.includes("admin:access");
  const accountBadge = isProfessional
    ? "Professional"
    : "Open";

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

      <div className="navbar-account">
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
                  to={
                    isProfessional
                      ? "/professional/account"
                      : "/account"
                  }
                >
                  {language === "it"
                    ? "Account"
                    : "Account"}
                </Link>
                {isProfessional ? (
                  <Link
                    onClick={() => setAccountOpen(false)}
                    to="/professional"
                  >
                    {language === "it"
                      ? "Console"
                      : "Console"}
                  </Link>
                ) : (
                  <Link
                    onClick={() => setAccountOpen(false)}
                    to="/atlas"
                  >
                    {language === "it"
                      ? "Atlas Open"
                      : "Open Atlas"}
                  </Link>
                )}
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
                <Link
                  onClick={() => setAccountOpen(false)}
                  to="/professional/login"
                >
                  <span>Professional</span>
                  {language === "it"
                    ? "Accesso controllato"
                    : "Controlled access"}
                </Link>
              </div>
            )}
          </>
        )}
      </div>

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
        {authenticated ? (
          <Link
            className="navbar-mobile-link account"
            onClick={() => setIsMenuOpen(false)}
            to={
              isProfessional
                ? "/professional/account"
                : "/account"
            }
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
            <Link
              className="navbar-mobile-link account"
              onClick={() => setIsMenuOpen(false)}
              to="/professional/login"
            >
              <span>Professional</span>
              {language === "it"
                ? "Accesso controllato"
                : "Controlled access"}
            </Link>
          </>
        )}

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
