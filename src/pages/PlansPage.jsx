import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";

import "../styles/plans-page.css";

const pageCopy = {
  en: {
    label: "ARCUS SOLUTIONS",
    title:
      "Infrastructure risk decisions, built from verified evidence.",
    text:
      "ARCUS helps public bodies, infrastructure managers, engineering teams and research groups move from bridge-collapse records to territorial screening, asset prioritisation and mitigation planning.",
    primaryCta: "Explore Atlas",
    secondaryCta: "Open Professional",
    heroStack: [
      ["Evidence base", "Verified bridge-collapse records"],
      ["Territorial context", "Hydraulic, landslide, seismic and exposure layers"],
      ["Operational output", "Rankings, watchlists, reports and GIS-ready exports"],
    ],
    heroMetrics: [
      ["01", "Evidence"],
      ["02", "Scenario"],
      ["03", "Decision"],
    ],
    audienceLabel: "Reference clients",
    audienceTitle:
      "Different stakeholders, one traceable intelligence layer.",
    audienceText:
      "The platform is not a generic dashboard. Each solution path starts from a technical decision, reads ARCUS evidence against territorial context and produces an output that can be reviewed, shared or exported.",
    audiences: [
      {
        label: "Public authorities",
        title: "Territorial screening",
        problem:
          "Identify provinces, corridors and local contexts where historical evidence and hazard exposure deserve technical attention.",
        output:
          "Priority maps, public briefings, mitigation-oriented summaries.",
      },
      {
        label: "Infrastructure managers",
        title: "Asset prioritisation",
        problem:
          "Compare managed assets with collapse precedents, territorial exposure and scenario stress conditions.",
        output:
          "Asset watchlists, inspection queues, project snapshots.",
      },
      {
        label: "Engineering firms",
        title: "Due diligence support",
        problem:
          "Prepare technical readings for tenders, feasibility work, preliminary risk assessments and client meetings.",
        output:
          "Comparable cases, hazard profiles, PDF and GIS-ready exports.",
      },
      {
        label: "Research teams",
        title: "Evidence interpretation",
        problem:
          "Explore collapse patterns, classification logic, data limitations and source-linked event histories.",
        output:
          "Dataset readings, methodological references, reproducible summaries.",
      },
      {
        label: "Risk and asset strategy",
        title: "Exposure benchmarking",
        problem:
          "Understand where infrastructure vulnerability, territorial exposure and documented failures overlap.",
        output:
          "Scenario benchmarks, province-level rankings, executive briefs.",
      },
    ],
    scenariosLabel: "Concrete scenarios",
    scenariosTitle:
      "From a technical question to a usable output.",
    scenariosText:
      "ARCUS is designed around repeatable workflows: define the question, read the evidence, intersect the relevant layers and produce a deliverable that remains explainable.",
    scenarioColumns: ["Question", "ARCUS reading", "Output"],
    scenarios: [
      [
        "Which territories should be reviewed first?",
        "Collapse records, province-normalised indicators and declared hazard layers.",
        "Territorial priority ranking.",
      ],
      [
        "Which assets need a closer look?",
        "Asset inventory compared with precedents, exposure and multi-hazard context.",
        "Professional asset watchlist.",
      ],
      [
        "What should we bring to a technical meeting?",
        "Source-linked evidence, classification notes and scenario interpretation.",
        "Briefing package with maps and tables.",
      ],
      [
        "How does risk change under a specific domain?",
        "Hydraulic, landslide, seismic, degradation and exposure emphasis.",
        "Scenario matrix and recalibrated priorities.",
      ],
    ],
    previewLabel: "Professional output preview",
    previewTitle:
      "What the client receives is not a dashboard view. It is a decision package.",
    previewText:
      "Professional turns the ARCUS evidence layer into ranked territories, asset-level watchlists and exportable briefing material for technical coordination.",
    previewRows: [
      ["Province ranking", "Normalized collapse ratio", "Priority class"],
      ["Asset watchlist", "Precedent match + exposure", "Review queue"],
      ["Scenario matrix", "Hydraulic / landslide / seismic emphasis", "Recalibrated ranking"],
      ["Export package", "PDF, CSV, Excel, GeoJSON", "Meeting-ready output"],
    ],
    previewNotes: [
      ["Input", "Territory, corridor or asset inventory"],
      ["Reading", "Evidence, hazard context and method traceability"],
      ["Output", "Ranking, watchlist, scenario brief and GIS export"],
    ],
    domainsLabel: "Risk domains",
    domainsTitle:
      "The solution is multi-domain by design.",
    domainsText:
      "ARCUS keeps collapse evidence connected to the risk dimensions that technical and institutional teams actually discuss.",
    domains: [
      ["Hydraulic vulnerability", "Flooding, river interaction, scour and hydro-geomorphic exposure."],
      ["Landslide context", "Slope instability, terrain dynamics and local geomorphological pressure."],
      ["Seismic exposure", "Seismic hazard context and territorial sensitivity."],
      ["Degradation and structural factors", "Material decay, typology, age and documented failure conditions."],
      ["Territorial exposure", "Province-level comparison, infrastructure density and affected context."],
      ["Intervention priority", "A combined reading for ranking, briefing and mitigation planning."],
    ],
    accessLabel: "Open and Professional",
    accessTitle:
      "Open builds trust. Professional turns it into work.",
    accessText:
      "The same scientific base supports two levels of use: a public evidence layer for transparency and a Professional workspace for operational analysis.",
    access: [
      {
        title: "Open Atlas",
        label: "Public evidence layer",
        text:
          "Inspect verified events, classifications, timelines, public analytics and source traceability.",
        items: [
          "Interactive collapse map",
          "Event cards and source links",
          "Public indicators and methodology",
        ],
        cta: "Open Atlas",
        href: "/atlas",
      },
      {
        title: "ARCUS Professional",
        label: "Operational intelligence layer",
        text:
          "Build scenarios, screen territories and assets, export deliverables and document the analytical path.",
        items: [
          "Normalized rankings and hazard intersections",
          "Asset watchlists and scenario matrices",
          "PDF, CSV, Excel, GeoJSON and GIS exports",
        ],
        cta: "Open Professional",
        href: "/professional",
      },
    ],
    methodLabel: "Method boundary",
    methodTitle:
      "Decision support, not a black-box judgement.",
    methodText:
      "ARCUS does not replace inspections, structural assessment or institutional responsibility. It organises evidence, declares its sources and helps technical teams decide where deeper analysis is justified.",
    methodPoints: [
      "Source-linked event database",
      "Transparent classification framework",
      "Public ISPRA and INGV territorial layers",
      "Internal calculation inputs kept separate from public copy",
      "Outputs designed for review, not automatic certification",
    ],
    finalLabel: "Next step",
    finalTitle:
      "Use ARCUS to move from evidence to infrastructure action.",
    finalText:
      "Start from the public Atlas, then move into Professional when the work requires scenarios, asset screening and exportable outputs.",
  },
  it: {
    label: "ARCUS SOLUTIONS",
    title:
      "Decisioni sul rischio infrastrutturale, costruite su evidenze verificate.",
    text:
      "ARCUS aiuta enti pubblici, gestori infrastrutturali, team di ingegneria e gruppi di ricerca a trasformare i record di crollo dei ponti in screening territoriale, priorita asset e pianificazione della mitigazione.",
    primaryCta: "Esplora Atlante",
    secondaryCta: "Apri Professional",
    heroStack: [
      ["Base evidenziale", "Record verificati di crolli di ponti"],
      ["Contesto territoriale", "Layer idraulici, frane, sismici ed esposizione"],
      ["Output operativo", "Ranking, watchlist, report ed export GIS-ready"],
    ],
    heroMetrics: [
      ["01", "Evidenza"],
      ["02", "Scenario"],
      ["03", "Decisione"],
    ],
    audienceLabel: "Clienti di riferimento",
    audienceTitle:
      "Stakeholder diversi, un unico layer di intelligence tracciabile.",
    audienceText:
      "La piattaforma non e una dashboard generica. Ogni percorso parte da una decisione tecnica, legge l'evidenza ARCUS rispetto al contesto territoriale e produce un output verificabile, condivisibile o esportabile.",
    audiences: [
      {
        label: "Enti pubblici",
        title: "Screening territoriale",
        problem:
          "Individuare province, corridoi e contesti locali dove evidenza storica ed esposizione hazard meritano attenzione tecnica.",
        output:
          "Mappe di priorita, brief pubblici, sintesi orientate alla mitigazione.",
      },
      {
        label: "Gestori infrastrutturali",
        title: "Priorita asset",
        problem:
          "Confrontare gli asset gestiti con precedenti di collasso, esposizione territoriale e condizioni di scenario.",
        output:
          "Watchlist asset, code di ispezione, snapshot progetto.",
      },
      {
        label: "Societa di ingegneria",
        title: "Supporto due diligence",
        problem:
          "Preparare letture tecniche per gare, studi di fattibilita, risk assessment preliminari e meeting cliente.",
        output:
          "Casi comparabili, profili hazard, export PDF e GIS-ready.",
      },
      {
        label: "Gruppi di ricerca",
        title: "Interpretazione evidenze",
        problem:
          "Esplorare pattern di collasso, logiche di classificazione, limiti del dato e storie evento collegate alle fonti.",
        output:
          "Letture dataset, riferimenti metodologici, sintesi riproducibili.",
      },
      {
        label: "Risk e asset strategy",
        title: "Benchmark esposizione",
        problem:
          "Comprendere dove vulnerabilita infrastrutturale, esposizione territoriale e cedimenti documentati si sovrappongono.",
        output:
          "Benchmark di scenario, ranking provinciali, executive brief.",
      },
    ],
    scenariosLabel: "Casi concreti",
    scenariosTitle:
      "Da una domanda tecnica a un output utilizzabile.",
    scenariosText:
      "ARCUS e progettato intorno a workflow ripetibili: definire la domanda, leggere l'evidenza, intersecare i layer rilevanti e produrre un deliverable spiegabile.",
    scenarioColumns: ["Domanda", "Lettura ARCUS", "Output"],
    scenarios: [
      [
        "Quali territori vanno analizzati prima?",
        "Record di collasso, indicatori normalizzati provinciali e layer hazard dichiarati.",
        "Ranking territoriale di priorita.",
      ],
      [
        "Quali asset richiedono attenzione?",
        "Inventario asset confrontato con precedenti, esposizione e contesto multi-hazard.",
        "Watchlist asset Professional.",
      ],
      [
        "Cosa portiamo a un tavolo tecnico?",
        "Evidenze con fonti, note di classificazione e interpretazione di scenario.",
        "Pacchetto briefing con mappe e tabelle.",
      ],
      [
        "Come cambia il rischio su un dominio specifico?",
        "Enfasi idraulica, frane, sismica, degrado ed esposizione.",
        "Matrice scenario e priorita ricalibrate.",
      ],
    ],
    previewLabel: "Preview output Professional",
    previewTitle:
      "Il cliente non riceve una vista dashboard. Riceve un pacchetto decisionale.",
    previewText:
      "Professional trasforma il layer evidenziale ARCUS in territori ordinati per priorita, watchlist asset e materiali esportabili per il coordinamento tecnico.",
    previewRows: [
      ["Ranking provinciale", "Rapporto collassi normalizzato", "Classe priorita"],
      ["Watchlist asset", "Precedenti comparabili + esposizione", "Coda revisione"],
      ["Matrice scenario", "Enfasi idraulica / frane / sismica", "Ranking ricalibrato"],
      ["Export package", "PDF, CSV, Excel, GeoJSON", "Output per tavolo tecnico"],
    ],
    previewNotes: [
      ["Input", "Territorio, corridoio o inventario asset"],
      ["Lettura", "Evidenza, contesto hazard e tracciabilita metodo"],
      ["Output", "Ranking, watchlist, scenario brief ed export GIS"],
    ],
    domainsLabel: "Domini di rischio",
    domainsTitle:
      "La soluzione nasce multi-dominio.",
    domainsText:
      "ARCUS mantiene l'evidenza dei crolli collegata alle dimensioni di rischio che team tecnici e istituzionali discutono davvero.",
    domains: [
      ["Vulnerabilita idraulica", "Alluvioni, interazione con corsi d'acqua, scalzamento ed esposizione idro-geomorfologica."],
      ["Contesto frane", "Instabilita di versante, dinamiche del terreno e pressione geomorfologica locale."],
      ["Esposizione sismica", "Contesto di pericolosita sismica e sensibilita territoriale."],
      ["Degrado e fattori strutturali", "Decadimento materiale, tipologia, eta e condizioni documentate di cedimento."],
      ["Esposizione territoriale", "Confronto provinciale, densita infrastrutturale e contesto interessato."],
      ["Priorita di intervento", "Lettura combinata per ranking, briefing e pianificazione della mitigazione."],
    ],
    accessLabel: "Open e Professional",
    accessTitle:
      "Open costruisce fiducia. Professional la trasforma in lavoro.",
    accessText:
      "La stessa base scientifica supporta due livelli di utilizzo: un layer pubblico di evidenza per la trasparenza e un workspace Professional per l'analisi operativa.",
    access: [
      {
        title: "Open Atlas",
        label: "Layer evidenza pubblica",
        text:
          "Consulta eventi verificati, classificazioni, timeline, analytics pubblici e tracciabilita delle fonti.",
        items: [
          "Mappa interattiva dei crolli",
          "Schede evento e link fonte",
          "Indicatori pubblici e metodologia",
        ],
        cta: "Apri Atlante",
        href: "/atlas",
      },
      {
        title: "ARCUS Professional",
        label: "Layer intelligence operativa",
        text:
          "Costruisci scenari, filtra territori e asset, esporta deliverable e documenta il percorso analitico.",
        items: [
          "Ranking normalizzati e intersezioni hazard",
          "Watchlist asset e matrici scenario",
          "Export PDF, CSV, Excel, GeoJSON e GIS",
        ],
        cta: "Apri Professional",
        href: "/professional",
      },
    ],
    methodLabel: "Confine metodologico",
    methodTitle:
      "Supporto decisionale, non giudizio black-box.",
    methodText:
      "ARCUS non sostituisce ispezioni, valutazioni strutturali o responsabilita istituzionali. Organizza evidenze, dichiara le fonti e aiuta i team tecnici a decidere dove approfondire.",
    methodPoints: [
      "Database eventi collegato alle fonti",
      "Framework di classificazione trasparente",
      "Layer territoriali pubblici ISPRA e INGV",
      "Input interni di calcolo separati dalla comunicazione pubblica",
      "Output pensati per revisione, non certificazione automatica",
    ],
    finalLabel: "Prossimo passo",
    finalTitle:
      "Usa ARCUS per passare dall'evidenza all'azione infrastrutturale.",
    finalText:
      "Parti dall'Atlante pubblico, poi passa a Professional quando servono scenari, screening asset ed export operativi.",
  },
};

function PlansPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language] || pageCopy.en;

  useLayoutEffect(() => {
    const revealSelector = [
      ".solutions-hero-copy > *",
      ".solutions-stack",
      ".solutions-metric",
      ".solutions-section-header",
      ".solutions-audience-card",
      ".solutions-scenario-row",
      ".solutions-output-panel",
      ".solutions-output-row",
      ".solutions-output-note",
      ".solutions-domain-item",
      ".solutions-access-card",
      ".solutions-method-copy > *",
      ".solutions-method-list li",
      ".solutions-final-inner > *",
    ].join(",");

    const page = document.querySelector(".solutions-page");
    const elements = Array.from(document.querySelectorAll(revealSelector));

    page?.classList.add("is-motion-ready");

    elements.forEach((element, index) => {
      element.classList.add("solutions-reveal");
      element.style.setProperty("--reveal-index", String(index % 7));
    });

    let frame = 0;
    let interval = 0;

    const revealVisibleElements = () => {
      const trigger = window.innerHeight * 0.9;
      let hiddenCount = 0;

      elements.forEach((element) => {
        if (element.classList.contains("is-visible")) {
          return;
        }

        if (element.getBoundingClientRect().top < trigger) {
          element.classList.add("is-visible");
          return;
        }

        hiddenCount += 1;
      });

      if (hiddenCount === 0 && interval) {
        window.clearInterval(interval);
        interval = 0;
      }
    };

    const requestReveal = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        revealVisibleElements();
      });
    };

    revealVisibleElements();
    window.setTimeout(revealVisibleElements, 80);
    interval = window.setInterval(revealVisibleElements, 260);

    window.addEventListener("scroll", requestReveal, { passive: true });
    window.addEventListener("resize", requestReveal);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      if (interval) {
        window.clearInterval(interval);
      }

      window.removeEventListener("scroll", requestReveal);
      window.removeEventListener("resize", requestReveal);
    };
  }, []);

  return (
    <main
      className="solutions-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Solutions"
        description={copy.text}
      />

      <Navbar />

      <section className="solutions-hero">
        <div className="solutions-grid" />
        <div className="solutions-container solutions-hero-layout">
          <div className="solutions-hero-copy">
            <div className="solutions-label">
              {copy.label}
            </div>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>

            <div className="solutions-actions">
              <Link
                className="solutions-button primary"
                to="/atlas"
              >
                {copy.primaryCta}
              </Link>
              <Link
                className="solutions-button ghost"
                to="/professional"
              >
                {copy.secondaryCta}
              </Link>
            </div>
          </div>

          <aside
            aria-label="ARCUS decision stack"
            className="solutions-stack"
          >
            <div className="solutions-stack-top">
              <span>Decision stack</span>
              <strong>ARCUS</strong>
            </div>
            {copy.heroStack.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>

        <div className="solutions-container solutions-hero-metrics">
          {copy.heroMetrics.map(([number, label]) => (
            <div
              className="solutions-metric"
              key={label}
            >
              <strong>{number}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="solutions-section solutions-light">
        <div className="solutions-container">
          <div className="solutions-section-header">
            <div className="solutions-label">
              {copy.audienceLabel}
            </div>
            <h2>{copy.audienceTitle}</h2>
            <p>{copy.audienceText}</p>
          </div>

          <div className="solutions-audience-grid">
            {copy.audiences.map((item, index) => (
              <article
                className="solutions-audience-card"
                key={item.label}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <em>{item.label}</em>
                  <h3>{item.title}</h3>
                  <p>{item.problem}</p>
                  <strong>{item.output}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="solutions-section solutions-dark">
        <div className="solutions-container">
          <div className="solutions-section-header compact">
            <div className="solutions-label">
              {copy.scenariosLabel}
            </div>
            <h2>{copy.scenariosTitle}</h2>
            <p>{copy.scenariosText}</p>
          </div>

          <div className="solutions-scenario-table">
            <div className="solutions-scenario-head">
              {copy.scenarioColumns.map((column) => (
                <span key={column}>{column}</span>
              ))}
            </div>
            {copy.scenarios.map((scenario) => (
              <article
                className="solutions-scenario-row"
                key={scenario[0]}
              >
                {scenario.map((cell) => (
                  <p key={cell}>{cell}</p>
                ))}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="solutions-section solutions-output-preview">
        <div className="solutions-container solutions-output-layout">
          <div className="solutions-section-header sticky">
            <div className="solutions-label">
              {copy.previewLabel}
            </div>
            <h2>{copy.previewTitle}</h2>
            <p>{copy.previewText}</p>
          </div>

          <div className="solutions-output-panel">
            <div className="solutions-output-top">
              <span>ARCUS PROFESSIONAL</span>
              <strong>Output package</strong>
            </div>

            <div className="solutions-output-table">
              {copy.previewRows.map((row, index) => (
                <article
                  className="solutions-output-row"
                  key={row[0]}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {row.map((cell) => (
                    <p key={cell}>{cell}</p>
                  ))}
                </article>
              ))}
            </div>

            <div className="solutions-output-notes">
              {copy.previewNotes.map(([label, value]) => (
                <article
                  className="solutions-output-note"
                  key={label}
                >
                  <span>{label}</span>
                  <p>{value}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="solutions-section solutions-light">
        <div className="solutions-container solutions-domain-layout">
          <div className="solutions-section-header sticky">
            <div className="solutions-label">
              {copy.domainsLabel}
            </div>
            <h2>{copy.domainsTitle}</h2>
            <p>{copy.domainsText}</p>
          </div>

          <div className="solutions-domain-list">
            {copy.domains.map(([title, text], index) => (
              <article
                className="solutions-domain-item"
                key={title}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="solutions-section solutions-paper">
        <div className="solutions-container">
          <div className="solutions-section-header compact">
            <div className="solutions-label">
              {copy.accessLabel}
            </div>
            <h2>{copy.accessTitle}</h2>
            <p>{copy.accessText}</p>
          </div>

          <div className="solutions-access-grid">
            {copy.access.map((tier) => (
              <article
                className="solutions-access-card"
                key={tier.title}
              >
                <span>{tier.label}</span>
                <h3>{tier.title}</h3>
                <p>{tier.text}</p>
                <ul>
                  {tier.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link to={tier.href}>{tier.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="solutions-section solutions-dark solutions-method">
        <div className="solutions-container solutions-method-layout">
          <div className="solutions-method-copy">
            <div className="solutions-label">
              {copy.methodLabel}
            </div>
            <h2>{copy.methodTitle}</h2>
            <p>{copy.methodText}</p>
          </div>

          <ul className="solutions-method-list">
            {copy.methodPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="solutions-final">
        <div className="solutions-container solutions-final-inner">
          <div className="solutions-label">
            {copy.finalLabel}
          </div>
          <h2>{copy.finalTitle}</h2>
          <p>{copy.finalText}</p>
          <div className="solutions-actions centered">
            <Link
              className="solutions-button primary"
              to="/professional"
            >
              {copy.secondaryCta}
            </Link>
            <Link
              className="solutions-button ghost dark"
              to="/methodology"
            >
              Methodology
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default PlansPage;
