import { Link } from "react-router-dom";

import useLanguage from "../../context/useLanguage";
import logoHorizontal from "../../assets/logo/logo-horizontal.svg";

import "./Footer.css";

function Footer() {
  const { language } = useLanguage();

  const copy = {
    en: {
      description:
        "A scientific infrastructure intelligence platform dedicated to the observation, classification and analysis of bridge collapse phenomena.",
      copyright:
        "(c) 2026 ARCUS - Italian Bridge Collapse Database",
      evidencePeriod: "Evidence period 2000-2026",
      groups: [
        {
          label: "Platform",
          links: [
            ["Atlas", "/atlas"],
            ["Professional", "/professional"],
            ["Analytics", "/analytics"],
          ],
        },
        {
          label: "Research",
          links: [
            ["Methodology", "/methodology"],
            ["Data Access", "/data-access"],
            ["Publications", "/publications"],
          ],
        },
        {
          label: "About",
          links: [
            ["Identity", "/about"],
            ["Contact", "/about"],
          ],
        },
      ],
    },
    it: {
      description:
        "Una piattaforma scientifica di infrastructure intelligence dedicata all'osservazione, classificazione e analisi dei fenomeni di crollo dei ponti.",
      copyright:
        "(c) 2026 ARCUS - Italian Bridge Collapse Database",
      evidencePeriod: "Periodo evidenza 2000-2026",
      groups: [
        {
          label: "Piattaforma",
          links: [
            ["Atlante", "/atlas"],
            ["Professional", "/professional"],
            ["Analytics", "/analytics"],
          ],
        },
        {
          label: "Ricerca",
          links: [
            ["Metodologia", "/methodology"],
            ["Data Access", "/data-access"],
            ["Pubblicazioni", "/publications"],
          ],
        },
        {
          label: "About",
          links: [
            ["Identita", "/about"],
            ["Contatto", "/about"],
          ],
        },
      ],
    },
  };

  const text = copy[language] || copy.en;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-main">
          <div className="site-footer-brand">
            <Link
              aria-label="ARCUS home"
              className="site-footer-logo"
              to="/"
            >
              <img
                alt="ARCUS"
                src={logoHorizontal}
              />
            </Link>
            <p>{text.description}</p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="site-footer-nav"
          >
            {text.groups.map((group) => (
              <div
                className="site-footer-group"
                key={group.label}
              >
                <span>{group.label}</span>
                {group.links.map(([label, path]) => (
                  <Link
                    key={`${group.label}-${path}`}
                    to={path}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="site-footer-bottom">
          <span>{text.copyright}</span>
          <span>{text.evidencePeriod}</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
