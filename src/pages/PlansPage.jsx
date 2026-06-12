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
          label: "ARCUS SOLUTIONS",
          title:
            "Scegli quanto in profondita vuoi lavorare con ARCUS.",
          text:
            "ARCUS parte da un osservatorio pubblico verificabile e cresce in un workspace professionale per analisi, scenari, report ed export operativi.",
          compare: "Livelli di accesso",
          next: "Percorso utente",
          accessLabel: "Accesso cliente",
          accessTitle:
            "Un percorso semplice: esplora, analizza, produci output.",
          accessText:
            "Open serve a capire il metodo, verificare le fonti e leggere il dataset pubblico. Professional aggiunge strumenti di lavoro: scenari territoriali, screening asset, watchlist, report e formati esportabili.",
          positionLabel: "Posizionamento finale",
          positionTitle:
            "Un nucleo scientifico, due modi di usarlo.",
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
                "Ricercatori, universita, tecnici, giornalisti, studenti e stakeholder che vogliono consultare evidenze pubbliche.",
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
                "Workflow operativi basati su evidenza storica, scenari e output esportabili.",
              role:
                "Workspace di infrastructure intelligence.",
              target:
                "Societa di ingegneria, gestori, consulenti, concessionari, analisti, assicurazioni e gruppi di ricerca che devono produrre letture operative.",
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
          ],
          flow: [
            ["Open", "Dimostra metodo, autorevolezza e ampiezza del dataset pubblico."],
            ["Professional", "Trasforma il metodo in analisi, scenari, export e decision support."],
          ],
          workflow: [
            "Esplora il contesto infrastrutturale",
            "Definisci uno scenario tecnico",
            "Confronta asset ed evidenze storiche",
            "Genera letture spiegabili",
            "Esporta output operativi",
          ],
        }
      : {
          label: "ARCUS SOLUTIONS",
          title:
            "Choose how deeply you need to work with ARCUS.",
          text:
            "ARCUS starts as a verifiable public observatory and grows into a Professional workspace for analysis, scenarios, reports and operational exports.",
          compare: "Access levels",
          next: "User journey",
          accessLabel: "Client Access",
          accessTitle:
            "A simple path: explore, analyze, produce outputs.",
          accessText:
            "Open helps users understand the method, verify the sources and read the public dataset. Professional adds working tools: territorial scenarios, asset screening, watchlists, reports and exportable formats.",
          positionLabel: "Final positioning",
          positionTitle:
            "One scientific core, two ways to use it.",
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
                "Researchers, universities, technical users, journalists, students and stakeholders who need to inspect public evidence.",
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
                "Operational workflows built on historical evidence, scenarios and exportable outputs.",
              role:
                "Infrastructure intelligence workspace.",
              target:
                "Engineering companies, infrastructure managers, consultants, concessionaires, analysts, insurers and research groups that need operational readings.",
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
          ],
          flow: [
            ["Open", "Proves methodology, authority and the breadth of the public dataset."],
            ["Professional", "Turns the method into analytics, scenarios, exports and decision support."],
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
        title="ARCUS Solutions"
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
              {copy.accessLabel}
            </div>
            <h2>{copy.accessTitle}</h2>
            <p>{copy.accessText}</p>
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
