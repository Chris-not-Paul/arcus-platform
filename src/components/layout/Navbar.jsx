import {
  Link,
  useLocation,
} from "react-router-dom";

import "./Navbar.css";

function Navbar() {
  const location = useLocation();

  const links = [
    {
      label: "Atlas",
      path: "/atlas",
    },

    {
      label: "Methodology",
      path: "/#methodology",
    },

    {
      label: "Analytics",
      path: "/analytics",
    },

    {
      label: "Publications",
      path: "/publications",
    },

    {
      label: "About",
      path: "/about",
    },
  ];

  return (
    <header className="navbar">
      {/* BRAND */}

      <Link
        to="/"
        className="navbar-brand"
      >
        <div className="navbar-title">
          ARCUS ATLAS
        </div>

        <div className="navbar-subtitle">
          Infrastructure Failure
          Observatory
        </div>
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
                location.pathname ===
                link.path
                  ? "active"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export default Navbar;