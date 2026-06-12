import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import "../styles/methodology/methodologypage.css";

function MethodologyPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      label: "ARCUS RESEARCH FRAMEWORK",
      subtitle:
        "A transparent framework for identifying, validating, classifying and geolocating bridge collapse events across the Italian infrastructure network.",
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
        "Historical bridge collapse records are inherently heterogeneous and often affected by incomplete documentation, inconsistent reporting quality and varying levels of technical detail. Earlier decades may present underreporting biases, especially for localized events occurring outside major urban areas. In some cases, spatial information is limited to municipality-level accuracy due to the absence of reliable georeferenced documentation.",
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
          "Combines declared public layers and official-source scores for hydraulic, landslide and seismic exposure.",
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
        "Un framework trasparente per identificare, validare, classificare e geolocalizzare gli eventi di collasso dei ponti nella rete infrastrutturale italiana.",
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
        "I registri storici sui crolli dei ponti sono per natura eterogenei e spesso condizionati da documentazione incompleta, qualita di reporting non uniforme e livelli variabili di dettaglio tecnico. I periodi meno recenti possono presentare bias di sottorappresentazione, soprattutto per eventi locali fuori dai principali centri urbani. In alcuni casi l'informazione spaziale resta limitata alla scala comunale per assenza di documentazione georeferenziata affidabile.",
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
          "Integra layer pubblici dichiarati e score da fonti ufficiali per esposizione idraulica, frane e sismicita.",
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
            ? "Metodo ARCUS per identificare, validare, classificare e geolocalizzare eventi di collasso dei ponti."
            : "ARCUS methodology for identifying, validating, classifying and geolocating bridge collapse events."
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
                2000-2025
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
