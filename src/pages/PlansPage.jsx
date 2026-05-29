import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";

import "../styles/plans-page.css";

function PlansPage() {
  const { language } = useLanguage();

  const copy =
    language === "it"
      ? {
          label: "ARCUS PLANS",
          title:
            "Open, Professional, Enterprise: tre livelli chiari.",
          text:
            "ARCUS non e un GIS generico. Il valore nasce dall'unione tra database proprietario sui collassi, metodo scientifico, analytics territoriali, overlay hazard e output spiegabili.",
          compare: "Architettura piattaforma",
          next: "Percorso utente",
          backendLabel: "Accesso cliente",
          backendTitle:
            "La logica backend dovra seguire i tre livelli strategici.",
          backendText:
            "Il flusso corretto diventa account -> piano -> permessi -> workspace -> export/API filtrati. Open resta pubblico, Professional abilita il workspace operativo, Enterprise aggiunge ambiente dedicato, ruoli e dati privati.",
          positionLabel: "Posizionamento finale",
          positionTitle:
            "Da database sui crolli a piattaforma di infrastructure intelligence.",
          tiers: [
            {
              action: "Apri Atlante",
              badge: "Public Atlas",
              href: "/atlas",
              name: "Open",
              objective:
                "Visibilita, credibilita scientifica, diffusione e adozione.",
              role:
                "Atlante pubblico e autorita scientifica.",
              target:
                "Studenti, ricercatori, giornalisti, cittadini, universita e comunita tecnica.",
              unlocks: [
                "Public Atlas e mappa interattiva",
                "Schede evento, fonti e riferimenti",
                "Timeline, heatmap, clustering e filtri base",
                "Statistiche pubbliche, metodologia e hazard overview",
              ],
              excludes: [
                "Export avanzati",
                "Workspace salvati",
                "Upload asset privati",
                "AI-assisted insights",
              ],
            },
            {
              action: "Entra in Professional",
              badge: "Intelligence Workspace",
              href: "/professional",
              name: "Professional",
              objective:
                "Monetizzazione e workflow operativi basati su evidenza storica.",
              role:
                "Workspace di infrastructure intelligence.",
              target:
                "Societa di ingegneria, gestori, consulenti, concessionari, analisti, assicurazioni e gruppi di ricerca.",
              unlocks: [
                "Advanced infrastructure analytics e comparazioni",
                "Workspace, filtri salvati, watchlist e snapshot progetto",
                "CSV, PDF, GeoJSON ed export GIS-ready",
                "Overlay ISPRA/INGV, multi-hazard e correlazioni hazard/collasso",
              ],
              excludes: [
                "Dataset privati istituzionali",
                "Tenant dedicato",
                "Governance multiutente avanzata",
                "Deployment white-label",
              ],
            },
            {
              action: "Valuta Enterprise",
              badge: "Institutional Platform",
              href: "/enterprise",
              name: "Enterprise",
              objective:
                "Adozione strategica su larga scala per enti e operatori nazionali.",
              role:
                "Piattaforma istituzionale di infrastructure intelligence.",
              target:
                "Agenzie pubbliche, protezione civile, ministeri, utilities, operatori ferroviari, assicurazioni e proprietari infrastrutturali.",
              unlocks: [
                "Ambiente dedicato e integrazione asset privati",
                "Dashboard istituzionali, API enterprise e monitoraggio",
                "Ruoli, permessi, governance e workflow ricorrenti",
                "Digital twin, anomaly detection e predictive workflows",
              ],
              excludes: [
                "Accesso pubblico non controllato ai dati riservati",
                "Workflow standard non personalizzati",
              ],
            },
          ],
          flow: [
            ["Open", "Dimostra metodo, autorevolezza e ampiezza del dataset pubblico."],
            ["Professional", "Trasforma il metodo in analisi, scenari, export e decision support."],
            ["Enterprise", "Integra dati privati, governance e dashboard istituzionali."],
          ],
          workflow: [
            "Explore infrastructure context",
            "Define technical scenario",
            "Compare assets with historical evidence",
            "Generate explainable insights",
            "Export operational outputs",
          ],
        }
      : {
          label: "ARCUS PLANS",
          title:
            "Open, Professional, Enterprise: three clear levels.",
          text:
            "ARCUS is not a generic GIS. Its value comes from combining proprietary collapse intelligence, scientific methodology, territorial analytics, hazard overlays and explainable outputs.",
          compare: "Platform architecture",
          next: "User journey",
          backendLabel: "Client Access",
          backendTitle:
            "The backend logic should follow the three strategic levels.",
          backendText:
            "The right flow becomes account -> plan -> permissions -> workspace -> filtered exports/APIs. Open remains public, Professional unlocks the operational workspace, Enterprise adds dedicated environments, roles and private data.",
          positionLabel: "Final positioning",
          positionTitle:
            "From bridge collapse database to infrastructure intelligence platform.",
          tiers: [
            {
              action: "Open Atlas",
              badge: "Public Atlas",
              href: "/atlas",
              name: "Open",
              objective:
                "Visibility, scientific credibility, diffusion and adoption.",
              role:
                "Public atlas and scientific authority.",
              target:
                "Students, researchers, journalists, citizens, universities and the technical community.",
              unlocks: [
                "Public Atlas and interactive map",
                "Event cards, sources and references",
                "Timeline, heatmap, clustering and base filters",
                "Public statistics, methodology and hazard overview",
              ],
              excludes: [
                "Advanced exports",
                "Saved workspaces",
                "Private asset upload",
                "AI-assisted insights",
              ],
            },
            {
              action: "Enter Professional",
              badge: "Intelligence Workspace",
              href: "/professional",
              name: "Professional",
              objective:
                "Monetization and operational workflows built on historical evidence.",
              role:
                "Infrastructure intelligence workspace.",
              target:
                "Engineering companies, managers, consultants, concessionaires, analysts, insurers and research groups.",
              unlocks: [
                "Advanced infrastructure analytics and comparisons",
                "Workspaces, saved filters, watchlists and project snapshots",
                "CSV, PDF, GeoJSON and GIS-ready exports",
                "ISPRA/INGV overlays, multi-hazard and hazard/collapse correlations",
              ],
              excludes: [
                "Institutional private datasets",
                "Dedicated tenant",
                "Advanced multi-user governance",
                "White-label deployment",
              ],
            },
            {
              action: "Evaluate Enterprise",
              badge: "Institutional Platform",
              href: "/enterprise",
              name: "Enterprise",
              objective:
                "Large-scale strategic adoption for institutions and national operators.",
              role:
                "Institutional infrastructure intelligence platform.",
              target:
                "Public agencies, civil protection, ministries, utilities, railway operators, insurers and infrastructure owners.",
              unlocks: [
                "Dedicated environment and private asset integration",
                "Institutional dashboards, enterprise APIs and monitoring",
                "Roles, permissions, governance and recurring workflows",
                "Digital twin, anomaly detection and predictive workflows",
              ],
              excludes: [
                "Uncontrolled public access to confidential data",
                "Non-custom standard workflows",
              ],
            },
          ],
          flow: [
            ["Open", "Proves methodology, authority and the breadth of the public dataset."],
            ["Professional", "Turns the method into analytics, scenarios, exports and decision support."],
            ["Enterprise", "Integrates private data, governance and institutional dashboards."],
          ],
          workflow: [
            "Explore infrastructure context",
            "Define technical scenario",
            "Compare assets with historical evidence",
            "Generate explainable insights",
            "Export operational outputs",
          ],
        };

  return (
    <main
      className="plans-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Plans"
        description={copy.text}
      />

      <Navbar />

      <section className="plans-hero">
        <div className="plans-container">
          <div className="plans-label">
            {copy.label}
          </div>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </div>
      </section>

      <section className="plans-section">
        <div className="plans-container">
          <div className="plans-section-header">
            <div>
              <div className="plans-label">
                {copy.compare}
              </div>
              <h2>{copy.title}</h2>
            </div>
          </div>

          <div className="plans-grid">
            {copy.tiers.map((tier) => (
              <article
                className="plans-card"
                key={tier.name}
              >
                <div className="plans-card-top">
                  <span>{tier.badge}</span>
                  <strong>{tier.name}</strong>
                  <em>{tier.role}</em>
                </div>

                <p>{tier.target}</p>

                <div className="plans-next">
                  <span>{copy.next}</span>
                  <p>{tier.objective}</p>
                </div>

                <ul>
                  {tier.unlocks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="plans-excludes">
                  <span>
                    {language === "it"
                      ? "Non incluso"
                      : "Not included"}
                  </span>
                  {tier.excludes.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>

                <Link to={tier.href}>{tier.action}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="plans-section plans-dark">
        <div className="plans-container plans-split">
          <div>
            <div className="plans-label">
              {copy.backendLabel}
            </div>
            <h2>{copy.backendTitle}</h2>
            <p>{copy.backendText}</p>
          </div>

          <div className="plans-flow">
            {copy.flow.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="plans-section">
        <div className="plans-container plans-split">
          <div>
            <div className="plans-label">
              {copy.positionLabel}
            </div>
            <h2>{copy.positionTitle}</h2>
          </div>

          <div className="plans-flow light">
            {copy.workflow.map((item, index) => (
              <article key={item}>
                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default PlansPage;
