import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  buildTerritoryProfiles,
  formatValue,
  percentage,
} from "../utils/analytics";

import "../styles/platform-levels.css";

export default function EnterprisePage() {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then(setEvents);

    fetch("/data/processed/sources.json")
      .then((response) => response.json())
      .then(setSources);
  }, []);

  const copy =
    language === "it"
      ? {
          atlas: "Apri Atlas Enterprise",
          api: "API enterprise",
          assets: "Inventario asset",
          consulting: "Consulenza custom",
          description:
            "ARCUS Enterprise/Government mostra come l'intelligence sui cedimenti puo entrare nei processi decisionali di enti, ministeri, protezione civile, assicurazioni e grandi operatori.",
          heroLabel:
            "ENTERPRISE / GOVERNMENT",
          heroTitle:
            "Dashboard istituzionale per priorita, scenari e integrazioni.",
          integrations:
            "Integrazioni private",
          maintenance:
            "Predictive maintenance",
          reports:
            "Executive reports",
          scenario:
            "Scenario planning",
          score:
            "Asset prioritization score",
          strategy:
            "Visione istituzionale",
        }
      : {
          atlas: "Open Enterprise Atlas",
          api: "Enterprise APIs",
          assets: "Asset inventory",
          consulting: "Custom consulting",
          description:
            "ARCUS Enterprise/Government shows how failure intelligence can enter decision workflows for ministries, civil protection agencies, insurers and major infrastructure operators.",
          heroLabel:
            "ENTERPRISE / GOVERNMENT",
          heroTitle:
            "Institutional dashboard for priorities, scenarios and integrations.",
          integrations:
            "Private Integrations",
          maintenance:
            "Predictive maintenance",
          reports:
            "Executive reports",
          scenario:
            "Scenario planning",
          score:
            "Asset prioritization score",
          strategy:
            "Institutional vision",
        };

  const profiles = useMemo(
    () =>
      buildTerritoryProfiles(
        events,
        sources,
        "region"
      ).slice(0, 6),
    [events, sources]
  );

  const integrationStack = [
    copy.assets,
    "Inspection records",
    "Maintenance history",
    "Known criticalities",
    copy.api,
    copy.consulting,
  ];

  return (
    <main
      className="platform-page enterprise"
      id="main-content"
    >
      <PageMeta
        title="Enterprise Government"
        description={copy.description}
      />

      <Navbar />

      <section className="platform-hero">
        <div className="platform-grid" />

        <div className="platform-container">
          <div className="platform-label">
            {copy.heroLabel}
          </div>

          <h1>{copy.heroTitle}</h1>
          <p>{copy.description}</p>

          <div className="platform-actions">
            <Link to="/about">
              {copy.strategy}
            </Link>
            <Link to="/atlas?mode=enterprise">
              {copy.atlas}
            </Link>
          </div>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.score}
            </div>
            <h2>
              Explainable scoring for asset and territory prioritization.
            </h2>
            <p>
              Risk score combines historical recurrence,
              collapse severity, triggered-event share,
              human impact and evidence strength.
            </p>
          </div>

          <div className="platform-table enterprise-table">
            {profiles.map((profile) => (
              <article key={profile.territory}>
                <div>
                  <strong>
                    {profile.territory}
                  </strong>
                  <span>
                    {formatValue(profile.total)} events
                    ·{" "}
                    {percentage(
                      profile.triggered,
                      profile.total
                    )}
                    % triggered
                  </span>
                </div>
                <div>
                  <b>{profile.riskScore}</b>
                  <span>priority</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="platform-section platform-dark">
        <div className="platform-container platform-three">
          <article className="platform-panel">
            <span>{copy.scenario}</span>
            <h3>Hydraulic stress scenario</h3>
            <p>
              Prioritize territories where hydraulic
              collapse mechanisms overlap with high
              recurrence and verified source density.
            </p>
          </article>

          <article className="platform-panel">
            <span>{copy.maintenance}</span>
            <h3>Maintenance intelligence</h3>
            <p>
              Connect ARCUS historical signals with
              inspections, asset age, material and
              internal maintenance records.
            </p>
          </article>

          <article className="platform-panel">
            <span>{copy.reports}</span>
            <h3>Annual institutional brief</h3>
            <p>
              Generate executive summaries with maps,
              rankings, evidence tables and recommended
              intervention priorities.
            </p>
          </article>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.integrations}
            </div>
            <h2>
              Designed to accept private institutional data.
            </h2>
            <p>
              The Enterprise tier is not a larger public
              dashboard. It is the controlled integration
              layer where ARCUS can be connected to an
              institution's infrastructure inventory and
              decision workflows.
            </p>
          </div>

          <div className="platform-card-grid">
            {integrationStack.map((item) => (
              <article key={item}>
                <span>{item}</span>
                <p>
                  Integration-ready module for custom
                  institutional deployments.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
