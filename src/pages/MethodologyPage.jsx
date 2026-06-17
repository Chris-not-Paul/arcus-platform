import { useLayoutEffect } from "react";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import "../styles/methodology/methodologypage.css";

function MethodologyAxisGrid({ items }) {
  return (
    <div className="methodology-axis-grid">
      {items.map((item) => (
        <article key={item.code}>
          <span>{item.code}</span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function LayerIntersectionMatrix({ columns, rows }) {
  return (
    <div className="methodology-layer-matrix">
      <div className="methodology-layer-matrix-head">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>

      {rows.map((row) => (
        <article key={row[0]}>
          {row.map((cell) => (
            <p key={cell}>{cell}</p>
          ))}
        </article>
      ))}
    </div>
  );
}

function MethodologyScopeGrid({ items }) {
  return (
    <div className="methodology-scope-grid">
      {items.map((item, index) => (
        <article key={item.title}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function MethodologyPage() {
  const { language } = useLanguage();

  useLayoutEffect(() => {
    const revealSelector = [
      ".methodology-hero .methodology-label",
      ".methodology-title",
      ".methodology-subtitle",
      ".methodology-stat",
      ".methodology-paper-card",
      ".methodology-section-header",
      ".methodology-split-left",
      ".methodology-split-right p",
      ".methodology-scope-grid article",
      ".workflow-grid",
      ".workflow-card",
      ".classification-card",
      ".methodology-axis-grid article",
      ".methodology-layer-matrix article",
      ".source-card",
      ".extension-card",
      ".methodology-output-grid article",
      ".methodology-scoring-grid article",
      ".reference-card",
    ].join(",");

    const page = document.querySelector(".methodology-page");
    const elements = Array.from(document.querySelectorAll(revealSelector));

    page?.classList.add("is-motion-ready");

    elements.forEach((element, index) => {
      element.classList.add("methodology-reveal");
      element.style.setProperty("--reveal-index", String(index % 6));
    });

    let frame = 0;
    let interval = 0;

    const revealVisibleElements = () => {
      const trigger = window.innerHeight * 0.88;
      let hiddenCount = 0;

      elements.forEach((element) => {
        if (element.classList.contains("is-visible")) {
          return;
        }

        const top = element.getBoundingClientRect().top;

        if (top < trigger) {
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
      page?.classList.remove("is-motion-ready");

      elements.forEach((element) => {
        element.classList.remove("methodology-reveal", "is-visible");
        element.style.removeProperty("--reveal-index");
      });
    };
  }, []);

  const copy = {
    en: {
      label: "ARCUS RESEARCH FRAMEWORK",
      subtitle:
        "A transparent framework for identifying, validating, classifying and geolocating bridge collapse events, then intersecting the evidence base with declared territorial layers for Professional outputs.",
      temporalCoverage: "Temporal Coverage",
      title:
        "Methodology & Classification System",
      validationFramework:
        "Validation Framework",
      geospatialStandard:
        "Geospatial Standard",
      relatedPublication:
        "RELATED PUBLICATION",
      contextLabel: "CONTEXT",
      contextTitle: "Why ARCUS Exists",
      contextParagraphs: [
        "Information regarding bridge collapse events is often fragmented across institutional archives, scientific publications, technical reports and journalistic sources.",
        "ARCUS was conceived to provide a structured and continuously evolving research infrastructure capable of improving the accessibility, consistency and interpretability of bridge collapse information across Italy.",
        "The framework harmonizes historical records, technical classifications, source traceability and geospatial information into a unified database architecture designed for research, analysis and infrastructure intelligence applications.",
      ],
      scopeLabel: "HOW TO READ THE METHOD",
      scopeTitle:
        "ARCUS separates evidence, classification and Professional interpretation.",
      scopeText:
        "This distinction is central: the database stores verified collapse records; Professional products are generated by intersecting those records with declared layers and client-side assets.",
      scopeCards: [
        {
          title: "Evidence record",
          text: "Each event is validated, source-linked and geolocated before it is used in analytics or Professional workflows.",
        },
        {
          title: "Database classification",
          text: "Severity, trigger, cause, spatial confidence and source reliability are stored as explicit ARCUS fields.",
        },
        {
          title: "Layer intersection",
          text: "Hydraulic, landslide, seismic and exposure layers are read against the classified record; restricted denominators may support calculation without being exposed publicly.",
        },
        {
          title: "Decision support limit",
          text: "Outputs support screening and prioritisation; they do not certify structural safety or replace inspections.",
        },
      ],
      workflowLabel: "OPERATIONAL WORKFLOW",
      workflowTitle: "Data Collection Pipeline",
      workflowDescription:
        "Each event included in ARCUS follows a structured multi-step validation and classification workflow.",
      workflowSteps: [
        [
          "01",
          "Event Detection",
          "Keyword-based searches across news archives, institutional reports and technical repositories.",
        ],
        [
          "02",
          "Screening",
          "Removal of demolitions, non-collapse events and unverified records.",
        ],
        [
          "03",
          "Cross-Source Validation",
          "Verification through technical reports, authorities, scientific papers and independent sources.",
        ],
        [
          "04",
          "Geospatial Localization",
          "WGS84 coordinate assignment and municipality-level spatial standardization.",
        ],
        [
          "05",
          "Event Classification",
          "Severity, trigger mechanism and specific collapse cause assignment.",
        ],
        [
          "06",
          "Continuous Revision",
          "Iterative review and metadata enrichment through evolving research activities.",
        ],
      ],
      taxonomyLabel: "EVENT TAXONOMY",
      taxonomyTitle: "Classification System",
      severity: "Severity",
      mechanism: "Mechanism",
      generalCause: "General Cause",
      specificCauses: "Specific Causes",
      classificationLogicLabel: "DATABASE CLASSIFICATION",
      classificationLogicTitle:
        "The database separates what happened from the territorial context around it.",
      classificationLogicText:
        "ARCUS first classifies each bridge-collapse event as an evidence record. Cause, trigger, severity and location are stored as database attributes before any Professional overlay is applied.",
      classificationAxes: [
        {
          code: "DB.01",
          title: "Event severity",
          text: "Total or partial collapse, used to distinguish structural loss from localized failure or damage.",
        },
        {
          code: "DB.02",
          title: "Trigger mechanism",
          text: "Whether the event is associated with a triggering condition, such as flood, landslide, impact, overload or seismic action.",
        },
        {
          code: "DB.03",
          title: "Specific cause",
          text: "Hydraulic, landslide, earthquake, material degradation, impact, overload, design/construction or fire/explosion classification.",
        },
        {
          code: "DB.04",
          title: "Spatial confidence",
          text: "Coordinate precision, municipality attribution and georeferencing confidence are stored separately from the event narrative.",
        },
        {
          code: "DB.05",
          title: "Source evidence",
          text: "Each event keeps a documentary trail so future corrections, reclassification and professional use remain auditable.",
        },
      ],
      layerMatrixLabel: "PROFESSIONAL LAYER MATRIX",
      layerMatrixTitle:
        "Professional outputs come from intersecting classified events with declared territorial layers.",
      layerMatrixText:
        "The Professional layer does not replace the original database. It reads ARCUS records against public and institutional overlays, then normalizes selected indicators at territorial scale to produce exposure, context and priority indicators.",
      layerMatrixColumns: [
        "ARCUS database field",
        "Territorial layer",
        "Professional reading",
        "Operational output",
      ],
      layerMatrixRows: [
        [
          "Hydraulic cause / flood trigger",
          "ISPRA IdroGEO flood-hazard WMS, river network, hydrographic context",
          "Hydraulic exposure around documented failures",
          "Hydraulic attention layer, asset screening, report note",
        ],
        [
          "Landslide cause / slope instability",
          "ISPRA IdroGEO landslide WMS and geomorphological context",
          "Slope-related failure environment",
          "Landslide attention layer and corridor review priority",
        ],
        [
          "Earthquake / seismic action",
          "INGV seismic hazard and territorial classification layers",
          "Seismic exposure context for affected assets",
          "Seismic context flag in Professional outputs",
        ],
        [
          "Material, degradation, age, typology",
          "Asset attributes and infrastructure inventory",
          "Technical similarity with documented precedents",
          "Asset watchlist and inspection prioritisation",
        ],
        [
          "Location, severity, source reliability",
          "Municipality, province, network and event density",
          "Territorial recurrence and evidence strength",
          "Priority index, exported tables and GIS-ready evidence",
        ],
        [
          "Province-level collapse ratio",
          "Internal bridge-stock denominator by province, not exposed publicly",
          "Collapsed bridges compared with the estimated bridge stock in the same province",
          "Provincial attention class and Professional priority ranking",
        ],
      ],
      layerMatrixNote:
        "Where a denominator is required, ARCUS may use restricted bridge-stock data only as an internal calculation input. These values are not exposed in the public interface. Public WMS layers used for territorial context, such as ISPRA IdroGEO and INGV seismic hazard services, are declared when available.",
      sourceLabel: "VALIDATION FRAMEWORK",
      sourceTitle:
        "Source Hierarchy & Traceability",
      sourceText:
        "Each event undergoes cross-source verification and consistency checks between technical, scientific, institutional and journalistic records. Source traceability metadata are stored within the ARCUS architecture to improve transparency, reproducibility and future database revisions.",
      extensionLabel: "ARCUS EXTENSIONS",
      extensionTitle:
        "Beyond the Original Dataset",
      extensions: [
        "Source traceability architecture",
        "Metadata enrichment system",
        "Multi-source event documentation",
        "Geospatial standardization",
        "Continuous update framework",
        "Infrastructure intelligence integration",
      ],
      limitsLabel: "LIMITATIONS & UNCERTAINTY",
      limitsTitle: "Data Completeness",
      limitsText:
        "Historical bridge collapse records are inherently heterogeneous and often affected by incomplete documentation, inconsistent reporting quality and varying levels of technical detail. Earlier decades may present underreporting biases, especially for localized events occurring outside major urban areas. In some cases, spatial information is limited to municipality-level accuracy due to the absence of reliable georeferenced documentation. Professional layer intersections must be read as contextual evidence for screening and prioritisation, not as causal proof or structural safety certification.",
      references: "REFERENCES",
      researchFramework: "Research Framework",
      outputLabel: "PLATFORM OUTPUTS",
      outputTitle:
        "From validated records to operational products",
      outputText:
        "The same methodological core powers the public observatory and the Professional workspace: transparency, analytics and explainable operational outputs.",
      outputs: [
        [
          "Open Atlas",
          "Validated events, timeline, taxonomy, geolocation and documented sources.",
        ],
        [
          "Professional",
          "Evidence indicators, vulnerability context, asset screening and operational reports.",
        ],
      ],
      sourceTiers: [
        ["TIER 01", "Official Authorities"],
        ["TIER 02", "Technical Reports"],
        ["TIER 03", "Scientific Publications"],
        ["TIER 04", "Verified News Archives"],
        ["TIER 05", "Local Corroborated Sources"],
      ],
      scoringLabel: "SCORING TRANSPARENCY",
      scoringTitle:
        "How Professional indicators should be read",
      scoringText:
        "ARCUS indicators support technical decision-making, but they are not structural diagnoses or safety certifications. They make evidence, vulnerability context and territorial exposure easier to compare before an inspection or institutional workflow.",
      scoringModels: [
        [
          "Reliability",
          "Ranks the documentary strength of an event using source volume, role, confidence, spatial precision and traceability.",
        ],
        [
          "Vulnerability",
          "Classifies historical fragility using severity, trigger, specific cause, structure type, material, age and human impact.",
        ],
        [
          "Territorial hazard",
          "Combines declared public layers, such as ISPRA IdroGEO and INGV seismic hazard services, with internal provincial normalization based on collapse count versus bridge-stock denominator.",
        ],
        [
          "Asset screening",
          "Crosses client inventories with ARCUS precedents, local events, technical similarity and territorial context.",
        ],
      ],
    },
    it: {
      label: "QUADRO SCIENTIFICO ARCUS",
      subtitle:
        "Un framework trasparente per identificare, validare, classificare e geolocalizzare gli eventi di collasso dei ponti, quindi intersecare la base di evidenza con layer territoriali dichiarati per gli output Professional.",
      temporalCoverage:
        "Copertura Temporale",
      title:
        "Metodologia e Sistema di Classificazione",
      validationFramework:
        "Framework di Validazione",
      geospatialStandard:
        "Standard Geospaziale",
      relatedPublication:
        "PUBBLICAZIONE CORRELATA",
      contextLabel: "CONTESTO",
      contextTitle: "Perche esiste ARCUS",
      contextParagraphs: [
        "Le informazioni sui crolli dei ponti sono spesso disperse tra archivi istituzionali, pubblicazioni scientifiche, relazioni tecniche e fonti giornalistiche.",
        "ARCUS nasce per costruire un'infrastruttura di ricerca strutturata e in continua evoluzione, capace di rendere piu accessibili, coerenti e interpretabili le informazioni sui collassi dei ponti in Italia.",
        "Il framework armonizza registri storici, classificazioni tecniche, tracciabilita delle fonti e informazione geospaziale in un'architettura dati unificata, pensata per ricerca, analisi e infrastructure intelligence.",
      ],
      scopeLabel: "COME LEGGERE IL METODO",
      scopeTitle:
        "ARCUS separa evidenza, classificazione e interpretazione Professional.",
      scopeText:
        "Questa distinzione e centrale: il database conserva record di crollo verificati; i prodotti Professional nascono dall'intersezione di quei record con layer dichiarati e asset del cliente.",
      scopeCards: [
        {
          title: "Record di evidenza",
          text: "Ogni evento viene validato, collegato alle fonti e geolocalizzato prima di essere usato in analytics o workflow Professional.",
        },
        {
          title: "Classificazione database",
          text: "Gravita, trigger, causa, confidenza spaziale e affidabilita delle fonti sono campi ARCUS espliciti.",
        },
        {
          title: "Intersezione layer",
          text: "Layer idraulici, frane, sismici ed esposizione sono letti rispetto al record classificato; eventuali denominatori riservati supportano il calcolo senza essere esposti pubblicamente.",
        },
        {
          title: "Limite decisionale",
          text: "Gli output supportano screening e priorita; non certificano la sicurezza strutturale e non sostituiscono ispezioni.",
        },
      ],
      workflowLabel: "WORKFLOW OPERATIVO",
      workflowTitle: "Pipeline di raccolta dati",
      workflowDescription:
        "Ogni evento incluso in ARCUS segue un processo strutturato di validazione e classificazione.",
      workflowSteps: [
        [
          "01",
          "Individuazione evento",
          "Ricerche mirate su archivi stampa, report istituzionali e repository tecnici.",
        ],
        [
          "02",
          "Screening",
          "Esclusione di demolizioni, eventi non pertinenti e record non verificati.",
        ],
        [
          "03",
          "Validazione multi-fonte",
          "Verifica attraverso report tecnici, autorita, pubblicazioni scientifiche e fonti indipendenti.",
        ],
        [
          "04",
          "Localizzazione geospaziale",
          "Assegnazione di coordinate WGS84 e standardizzazione spaziale su base territoriale.",
        ],
        [
          "05",
          "Classificazione evento",
          "Attribuzione di gravita, meccanismo di innesco e causa specifica del collasso.",
        ],
        [
          "06",
          "Revisione continua",
          "Aggiornamento iterativo e arricchimento dei metadati attraverso attivita di ricerca.",
        ],
      ],
      taxonomyLabel: "TASSONOMIA EVENTI",
      taxonomyTitle: "Sistema di classificazione",
      severity: "Gravita",
      mechanism: "Meccanismo",
      generalCause: "Causa generale",
      specificCauses: "Cause specifiche",
      classificationLogicLabel: "CLASSIFICAZIONE DATABASE",
      classificationLogicTitle:
        "Il database separa cio che e accaduto dal contesto territoriale intorno all'evento.",
      classificationLogicText:
        "ARCUS classifica prima ogni crollo come record di evidenza. Causa, trigger, gravita e localizzazione sono attributi del database prima dell'applicazione di qualunque overlay Professional.",
      classificationAxes: [
        {
          code: "DB.01",
          title: "Gravita evento",
          text: "Collasso totale o parziale, per distinguere perdita strutturale da cedimento o danno localizzato.",
        },
        {
          code: "DB.02",
          title: "Meccanismo di innesco",
          text: "Associazione dell'evento a condizioni come piena, frana, impatto, sovraccarico o azione sismica.",
        },
        {
          code: "DB.03",
          title: "Causa specifica",
          text: "Classificazione hydraulic, landslide, earthquake, degrado/materiale, impact, overload, design/construction o fire/explosion.",
        },
        {
          code: "DB.04",
          title: "Confidenza spaziale",
          text: "Precisione delle coordinate, attribuzione comunale e affidabilita della georeferenziazione restano campi separati.",
        },
        {
          code: "DB.05",
          title: "Evidenza documentale",
          text: "Ogni evento conserva una traccia delle fonti per correzioni, riclassificazioni e uso professionale auditabile.",
        },
      ],
      layerMatrixLabel: "MATRICE LAYER PROFESSIONAL",
      layerMatrixTitle:
        "Gli output Professional nascono dall'intersezione tra eventi classificati e layer territoriali dichiarati.",
      layerMatrixText:
        "Il livello Professional non sostituisce il database originario. Legge i record ARCUS rispetto a overlay pubblici e istituzionali, poi normalizza alcuni indicatori alla scala territoriale per produrre esposizione, contesto e priorita.",
      layerMatrixColumns: [
        "Campo database ARCUS",
        "Layer territoriale",
        "Lettura Professional",
        "Output operativo",
      ],
      layerMatrixRows: [
        [
          "Causa idraulica / trigger di piena",
          "WMS ISPRA IdroGEO per pericolosita alluvionale, reticolo idrografico, contesto idrografico",
          "Esposizione idraulica intorno a cedimenti documentati",
          "Layer attenzione idraulica, screening asset, nota report",
        ],
        [
          "Causa frana / instabilita di versante",
          "WMS ISPRA IdroGEO frane e contesto geomorfologico",
          "Ambiente di cedimento legato a dinamiche di versante",
          "Layer attenzione frane e priorita di revisione corridoio",
        ],
        [
          "Terremoto / azione sismica",
          "Layer INGV per pericolosita sismica e classificazione territoriale",
          "Contesto di esposizione sismica per asset interessati",
          "Flag contesto sismico negli output Professional",
        ],
        [
          "Materiale, degrado, eta, tipologia",
          "Attributi asset e inventario infrastrutturale",
          "Similarita tecnica con precedenti documentati",
          "Watchlist asset e priorita ispettiva",
        ],
        [
          "Localizzazione, gravita, affidabilita fonte",
          "Comune, provincia, rete e densita eventi",
          "Ricorrenza territoriale e forza dell'evidenza",
          "Priority index, tabelle esportate ed evidenza GIS-ready",
        ],
        [
          "Rapporto provinciale di collasso",
          "Denominatore interno di stock ponti per provincia, non esposto pubblicamente",
          "Ponti crollati rispetto allo stock infrastrutturale stimato nella stessa provincia",
          "Classe di attenzione provinciale e ranking Professional",
        ],
      ],
      layerMatrixNote:
        "Quando serve un denominatore, ARCUS puo usare dati di stock infrastrutturale a uso interno solo come input di calcolo. Questi valori non vengono esposti nell'interfaccia pubblica. I layer WMS pubblici usati per il contesto territoriale, come ISPRA IdroGEO e INGV, vengono invece dichiarati quando disponibili.",
      sourceLabel: "FRAMEWORK DI VALIDAZIONE",
      sourceTitle:
        "Gerarchia e tracciabilita delle fonti",
      sourceText:
        "Ogni evento viene sottoposto a verifiche incrociate tra documentazione tecnica, scientifica, istituzionale e giornalistica. I metadati di tracciabilita sono conservati nell'architettura ARCUS per migliorare trasparenza, riproducibilita e future revisioni del database.",
      extensionLabel: "ESTENSIONI ARCUS",
      extensionTitle:
        "Oltre il dataset originario",
      extensions: [
        "Architettura di tracciabilita delle fonti",
        "Sistema di arricchimento dei metadati",
        "Documentazione multi-fonte degli eventi",
        "Standardizzazione geospaziale",
        "Framework di aggiornamento continuo",
        "Integrazione di infrastructure intelligence",
      ],
      limitsLabel: "LIMITI E INCERTEZZA",
      limitsTitle: "Completezza dei dati",
      limitsText:
        "I registri storici sui crolli dei ponti sono per natura eterogenei e spesso condizionati da documentazione incompleta, qualita di reporting non uniforme e livelli variabili di dettaglio tecnico. I periodi meno recenti possono presentare bias di sottorappresentazione, soprattutto per eventi locali fuori dai principali centri urbani. In alcuni casi l'informazione spaziale resta limitata alla scala comunale per assenza di documentazione georeferenziata affidabile. Le intersezioni con layer Professional vanno lette come evidenza di contesto per screening e priorita, non come prova causale o certificazione di sicurezza strutturale.",
      references: "RIFERIMENTI",
      researchFramework: "Framework di ricerca",
      outputLabel: "OUTPUT PIATTAFORMA",
      outputTitle:
        "Dal record validato agli strumenti operativi",
      outputText:
        "Lo stesso nucleo metodologico alimenta l'osservatorio pubblico e il workspace Professional: trasparenza, analytics e output operativi spiegabili.",
      outputs: [
        [
          "Open Atlas",
          "Eventi validati, timeline, tassonomia, geolocalizzazione e fonti documentate.",
        ],
        [
          "Professional",
          "Indicatori di evidenza, contesto di vulnerabilita, asset screening e report operativi.",
        ],
      ],
      sourceTiers: [
        ["TIER 01", "Autorita ufficiali"],
        ["TIER 02", "Report tecnici"],
        ["TIER 03", "Pubblicazioni scientifiche"],
        ["TIER 04", "Archivi stampa verificati"],
        ["TIER 05", "Fonti locali corroborate"],
      ],
      scoringLabel: "TRASPARENZA SCORE",
      scoringTitle:
        "Come leggere gli indicatori Professional",
      scoringText:
        "Gli indicatori ARCUS supportano la decisione tecnica, ma non sono diagnosi strutturali o certificazioni di sicurezza. Servono a rendere confrontabili evidenza, contesto di vulnerabilita ed esposizione territoriale prima di un'ispezione o di un workflow istituzionale.",
      scoringModels: [
        [
          "Affidabilita",
          "Misura la forza documentale dell'evento usando volume fonti, ruolo, confidenza, precisione spaziale e tracciabilita.",
        ],
        [
          "Vulnerabilita",
          "Classifica la fragilita storica usando gravita, trigger, causa specifica, tipologia, materiale, eta e impatto umano.",
        ],
        [
          "Hazard territoriale",
          "Integra layer pubblici dichiarati, come ISPRA IdroGEO e INGV, con normalizzazione provinciale interna basata sul rapporto tra crolli e stock ponti.",
        ],
        [
          "Asset screening",
          "Incrocia inventari cliente con precedenti ARCUS, eventi locali, similarita tecnica e contesto territoriale.",
        ],
      ],
    },
  };

  const content = copy[language] || copy.en;

  return (
    <main
      className="methodology-page"
      id="main-content"
    >
      <PageMeta
        title={content.title}
        description={
          language === "it"
            ? "Metodo ARCUS per validare e classificare eventi di collasso dei ponti e intersecarli con layer territoriali per output Professional."
            : "ARCUS methodology for validating and classifying bridge collapse events and intersecting them with territorial layers for Professional outputs."
        }
      />

      <Navbar />

      {/* HERO */}

      <section className="methodology-hero methodology-section">

        <div className="methodology-hero-overlay" />

        <div className="methodology-hero-grid" />

        <div className="methodology-container">

          <div className="methodology-label">
            {content.label}
          </div>

          <h1 className="methodology-title">
            {content.title}
          </h1>

          <p className="methodology-subtitle">
            {content.subtitle}
          </p>

          <div className="methodology-hero-stats">

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                2000-2026
              </span>

              <span className="methodology-stat-label">
                {content.temporalCoverage}
              </span>
            </div>

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                Multi-Source
              </span>

              <span className="methodology-stat-label">
                {content.validationFramework}
              </span>
            </div>

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                WGS84
              </span>

              <span className="methodology-stat-label">
                {content.geospatialStandard}
              </span>
            </div>

          </div>

          <a
            className="methodology-paper-card"
            href="https://doi.org/10.1016/j.dib.2025.112375"
            target="_blank"
            rel="noreferrer"
          >

            <div className="methodology-paper-label">
              {content.relatedPublication}
            </div>

            <div className="methodology-paper-title">
              Dataset of bridge collapses in Italy
              from 2000 to 2025
            </div>

            <div className="methodology-paper-meta">
              Data in Brief - Elsevier
            </div>

            <div className="methodology-paper-authors">
              Paolini et al.
            </div>

          </a>

        </div>
      </section>

      {/* WHY ARCUS EXISTS */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">

            <div className="methodology-section-label">
              {content.contextLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.contextTitle}
            </h2>

          </div>

          <div className="methodology-split-right">

            {content.contextParagraphs.map(
              (paragraph) => (
                <p key={paragraph}>
                  {paragraph}
                </p>
              )
            )}

          </div>

        </div>

      </section>

      {/* METHOD SCOPE */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">

            <div className="methodology-section-label">
              {content.scopeLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.scopeTitle}
            </h2>

            <p className="methodology-section-description light">
              {content.scopeText}
            </p>

          </div>

          <MethodologyScopeGrid
            items={content.scopeCards}
          />

        </div>

      </section>

      {/* WORKFLOW */}

      <section className="methodology-section methodology-dark">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.workflowLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.workflowTitle}
            </h2>

            <p className="methodology-section-description">
              {content.workflowDescription}
            </p>

          </div>

          <div className="workflow-grid">

            {content.workflowSteps.map((step) => (
              <div
                className="workflow-card"
                key={step[0]}
              >
                <div className="workflow-number">
                  {step[0]}
                </div>

                <div className="workflow-title">
                  {step[1]}
                </div>

                <div className="workflow-text">
                  {step[2]}
                </div>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* CLASSIFICATION */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.taxonomyLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.taxonomyTitle}
            </h2>

          </div>

          <div className="classification-grid">

            <div className="classification-card">
              <div className="classification-title">
                {content.severity}
              </div>

              <div className="classification-tags">
                <span>TC - Total Collapse</span>
                <span>PC - Partial Collapse</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.mechanism}
              </div>

              <div className="classification-tags">
                <span>Triggered</span>
                <span>Not-Triggered</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.generalCause}
              </div>

              <div className="classification-tags">
                <span>Natural</span>
                <span>Human-Induced</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.specificCauses}
              </div>

              <div className="classification-tags">

                <span className="taxonomy-hydraulic">
                  Hydraulic
                </span>

                <span className="taxonomy-material">
                  Material
                </span>

                <span className="taxonomy-earthquake">
                  Earthquake
                </span>

                <span className="taxonomy-impact">
                  Impact
                </span>

                <span className="taxonomy-landslide">
                  Landslide
                </span>

                <span className="taxonomy-overload">
                  Overload
                </span>

                <span className="taxonomy-design">
                  Design & Construction
                </span>

                <span className="taxonomy-fire">
                  Fire & Explosion
                </span>

              </div>
            </div>

          </div>

        </div>

      </section>

      {/* DATABASE CLASSIFICATION LOGIC */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">
            <div className="methodology-section-label">
              {content.classificationLogicLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.classificationLogicTitle}
            </h2>

            <p className="methodology-section-description light">
              {content.classificationLogicText}
            </p>
          </div>

          <MethodologyAxisGrid
            items={content.classificationAxes}
          />

        </div>

      </section>

      {/* PROFESSIONAL LAYER MATRIX */}

      <section className="methodology-section methodology-dark">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.layerMatrixLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.layerMatrixTitle}
            </h2>

            <p className="methodology-section-description">
              {content.layerMatrixText}
            </p>

          </div>

          <LayerIntersectionMatrix
            columns={content.layerMatrixColumns}
            rows={content.layerMatrixRows}
          />

          <p className="methodology-layer-note">
            {content.layerMatrixNote}
          </p>

        </div>

      </section>

      {/* SOURCE VALIDATION */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.sourceLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.sourceTitle}
            </h2>

          </div>

          <div className="source-grid">

            {content.sourceTiers.map(([tier, label]) => (
              <div
                className="source-card"
                key={tier}
              >

                <div className="source-tier">
                  {tier}
                </div>

                {label}

              </div>
            ))}

          </div>

          <div className="methodology-body-text">
            {content.sourceText}
          </div>

        </div>

      </section>

      {/* ARCUS EXTENSIONS */}

      <section className="methodology-section methodology-dark">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.extensionLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.extensionTitle}
            </h2>

          </div>

          <div className="extensions-grid">

            {content.extensions.map((item) => (
              <div
                className="extension-card"
                key={item}
              >
                {item}
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* SCORING TRANSPARENCY */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">
            <div className="methodology-section-label">
              {content.scoringLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.scoringTitle}
            </h2>

            <p className="methodology-section-description light">
              {content.scoringText}
            </p>
          </div>

          <div className="methodology-scoring-grid">
            {content.scoringModels.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>

        </div>

      </section>

      {/* PLATFORM OUTPUTS */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">
            <div className="methodology-section-label">
              {content.outputLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.outputTitle}
            </h2>

            <p className="methodology-section-description light">
              {content.outputText}
            </p>
          </div>

          <div className="methodology-output-grid">
            {content.outputs.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>

        </div>

      </section>

      {/* LIMITATIONS */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-narrow">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              {content.limitsLabel}
            </div>

            <h2 className="methodology-section-title">
              {content.limitsTitle}
            </h2>

          </div>

          <div className="methodology-body-text">

            {content.limitsText}

          </div>

        </div>

      </section>

      {/* REFERENCES */}

      <section className="methodology-section methodology-footer">

        <div className="methodology-container methodology-narrow">

          <div className="methodology-section-label">
            {content.references}
          </div>

          <h2 className="methodology-section-title">
            {content.researchFramework}
          </h2>

          <a
            className="reference-card"
            href="https://doi.org/10.1016/j.dib.2025.112375"
            target="_blank"
            rel="noreferrer"
          >

            <div className="reference-paper-label">
              {content.relatedPublication}
            </div>

            <div className="reference-paper-title">
              Dataset of bridge collapses in Italy
              from 2000 to 2025
            </div>

            <div className="reference-paper-meta">
              Data in Brief - Elsevier
            </div>

            <div className="reference-authors">
              Paolini et al.
            </div>

          </a>

        </div>

      </section>

    </main>
  );
}

export default MethodologyPage;
