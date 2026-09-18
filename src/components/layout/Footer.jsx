import { Link } from "react-router-dom";

import useLanguage from "../../context/useLanguage";
import logoHorizontal from "../../assets/logo/logo-horizontal.svg";
import {
  contactAddresses,
  professionalEnabled,
} from "../../config/site";

import "./Footer.css";

function Footer() {
  const { language } = useLanguage();

  const copy = {
    en: {
      description:
        "A scientific observatory for documented bridge-collapse records, sources and reproducible research.",
      copyright:
        "(c) 2026 ARCUS - Italian Bridge Collapse Database",
      evidencePeriod: "Evidence period 2000-2026",
      groups: [
        {
          label: "Platform",
          links: [
            ["Atlas", "/atlas"],
            ["Analytics", "/analytics"],
            ...(professionalEnabled
              ? [["Professional", "/professional"]]
              : []),
          ],
        },
        {
          label: "Research",
          links: [
            ["Methodology", "/methodology"],
            ["Data Access", "/data-access"],
            ["Publications", "/publications"],
            ["Research contact", `mailto:${contactAddresses.research}`],
          ],
        },
        {
          label: "About",
          links: [
            ["Identity", "/about"],
            ["Contribute", "/contribute"],
            ["Contact", `mailto:${contactAddresses.general}`],
          ],
        },
      ],
    },
    it: {
      description:
        "Un osservatorio scientifico per record documentati di collasso, fonti verificabili e ricerca riproducibile.",
      copyright:
        "(c) 2026 ARCUS - Italian Bridge Collapse Database",
      evidencePeriod: "Periodo evidenza 2000-2026",
      groups: [
        {
          label: "Piattaforma",
          links: [
            ["Atlante", "/atlas"],
            ["Analytics", "/analytics"],
            ...(professionalEnabled
              ? [["Professional", "/professional"]]
              : []),
          ],
        },
        {
          label: "Ricerca",
          links: [
            ["Metodologia", "/methodology"],
            ["Data Access", "/data-access"],
            ["Pubblicazioni", "/publications"],
            ["Contatto ricerca", `mailto:${contactAddresses.research}`],
          ],
        },
        {
          label: "About",
          links: [
            ["Identità", "/about"],
            ["Contribuisci", "/contribute"],
            ["Contatto", `mailto:${contactAddresses.general}`],
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
                {group.links.map(([label, path]) =>
                  path.startsWith("mailto:") ? (
                    <a
                      href={path}
                      key={`${group.label}-${label}-${path}`}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link
                      key={`${group.label}-${label}-${path}`}
                      to={path}
                    >
                      {label}
                    </Link>
                  )
                )}
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
