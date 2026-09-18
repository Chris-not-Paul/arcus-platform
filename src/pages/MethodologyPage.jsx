import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import { professionalEnabled } from "../config/site";
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
        "This distinction is central: the database stores verified collapse records; Professional reads official point exposure and retrieves comparable failures without turning contextual evidence into an asset score.",
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
          text: "Hydraulic, landslide and seismic layers are read at the classified point. Inventory denominators and provincial collapse rates are not used by the Professional learning engine.",
        },
        {
          title: "Decision support limit",
          text: "Outputs support investigation and learning from failures; they do not certify structural safety, rank portfolios or replace inspections.",
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
        "Professional connects a verified project point with official exposure and comparable failures.",
      layerMatrixText:
        "The Professional layer does not replace the original database. It keeps official point exposure, nearby context and historical failures separate, then retrieves a declared evidence cohort for source-linked lessons or explicit abstention.",
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
          "Point exposure and comparable hydraulic failure processes",
          "Supported investigation priorities or abstention",
        ],
        [
          "Landslide cause / slope instability",
          "ISPRA IdroGEO landslide WMS and geomorphological context",
          "Slope-related failure environment",
          "Explicit support status and abstention until the evidence contract is met",
        ],
        [
          "Earthquake / seismic action",
          "INGV seismic hazard and territorial classification layers",
          "Seismic exposure context at the selected point",
          "Reference value and explicit collapse-learning support status",
        ],
        [
          "Material, degradation, age, typology",
          "ARCUS event attributes",
          "Technical similarity with documented precedents",
          "Explainable analogue evidence",
        ],
        [
          "Location, severity, source reliability",
          "Municipality, province, network and event density",
          "Evidence strength and independent episodes",
          "Traceable Lessons from Failures evidence package",
        ],
      ],
      layerMatrixNote:
        "Public and institutional sources used for official exposure, including ISPRA and INGV, are declared with status and provenance. Nearby context is never assigned to the point, and source unavailability is never interpreted as zero risk.",
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
        "Historical bridge collapse records are inherently heterogeneous and often affected by incomplete documentation, inconsistent reporting quality and varying levels of technical detail. Earlier decades may present underreporting biases, especially for localized events occurring outside major urban areas. In some cases, spatial information is limited to municipality-level accuracy due to the absence of reliable georeferenced documentation. Professional analogues and official-layer intersections support learning and investigation; they are not causal proof, collapse probability or structural safety certification.",
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
          "Official point exposure, comparable failures, evidence strength, supported lessons or abstention.",
        ],
      ],
      sourceTiers: [
        ["TIER 01", "Official Authorities"],
        ["TIER 02", "Technical Reports"],
        ["TIER 03", "Scientific Publications"],
        ["TIER 04", "Verified News Archives"],
        ["TIER 05", "Local Corroborated Sources"],
      ],
      scoringLabel: "EVIDENCE TRANSPARENCY",
      scoringTitle:
        "How Professional evidence should be read",
      scoringText:
        "ARCUS makes evidence strength, comparable failures and limitations explicit. It does not convert them into a portfolio ranking, structural diagnosis or safety certification.",
      scoringModels: [
        [
          "Evidence strength",
          "Describes documentary support using source role, confidence, spatial precision and traceability.",
        ],
        [
          "Independent episodes",
          "Prevents multiple records from the same failure episode from inflating the learning signal.",
        ],
        [
          "Official exposure",
          "Keeps ISPRA and INGV point observations separate from nearby and historical context.",
        ],
        [
          "Analogue retrieval",
          "Retrieves comparable failures on a declared basis and exposes the cases, coverage and sensitivity behind each lesson.",
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
      contextTitle: "Perché esiste ARCUS",
      contextParagraphs: [
        "Le informazioni sui crolli dei ponti sono spesso disperse tra archivi istituzionali, pubblicazioni scientifiche, relazioni tecniche e fonti giornalistiche.",
        "ARCUS nasce per costruire un’infrastruttura di ricerca strutturata e in continua evoluzione, capace di rendere più accessibili, coerenti e interpretabili le informazioni sui crolli dei ponti in Italia.",
        "Il quadro metodologico armonizza registri storici, classificazioni tecniche, tracciabilità delle fonti e informazioni geospaziali in un’architettura dei dati unificata, pensata per la ricerca, l’analisi e la conoscenza infrastrutturale.",
      ],
      scopeLabel: "COME LEGGERE IL METODO",
      scopeTitle:
        "ARCUS separa evidenza, classificazione e interpretazione Professional.",
      scopeText:
        "Questa distinzione e centrale: il database conserva record di crollo verificati; Professional legge l'esposizione ufficiale al punto e recupera collassi comparabili senza trasformare il contesto in uno score asset.",
      scopeCards: [
        {
          title: "Record di evidenza",
          text: "Ogni evento viene validato, collegato alle fonti e geolocalizzato prima di essere usato in analytics o workflow Professional.",
        },
        {
          title: "Classificazione database",
          text: "Gravità, evento innescante, causa, attendibilità spaziale e affidabilità delle fonti sono campi ARCUS espliciti.",
        },
        {
          title: "Intersezione layer",
          text: "I layer idraulici, frane e sismici sono letti al punto classificato. Denominatori inventariali e tassi provinciali di collasso non sono usati dal motore di apprendimento Professional.",
        },
        {
          title: "Limite decisionale",
          text: "Gli output supportano indagine e apprendimento dai collassi; non certificano la sicurezza, non ordinano patrimoni e non sostituiscono ispezioni.",
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
          "Verifica attraverso rapporti tecnici, autorità, pubblicazioni scientifiche e fonti indipendenti.",
        ],
        [
          "04",
          "Localizzazione geospaziale",
          "Assegnazione di coordinate WGS84 e standardizzazione spaziale su base territoriale.",
        ],
        [
          "05",
          "Classificazione evento",
          "Attribuzione della gravità, del meccanismo di innesco e della causa specifica del crollo.",
        ],
        [
          "06",
          "Revisione continua",
          "Aggiornamento iterativo e arricchimento dei metadati attraverso attività di ricerca.",
        ],
      ],
      taxonomyLabel: "TASSONOMIA EVENTI",
      taxonomyTitle: "Sistema di classificazione",
      severity: "Gravità",
      mechanism: "Meccanismo",
      generalCause: "Causa generale",
      specificCauses: "Cause specifiche",
      classificationLogicLabel: "CLASSIFICAZIONE DATABASE",
      classificationLogicTitle:
        "Il database separa cio che e accaduto dal contesto territoriale intorno all'evento.",
      classificationLogicText:
        "ARCUS classifica innanzitutto ogni crollo come record di evidenza. Causa, evento innescante, gravità e localizzazione sono attributi del database precedenti all’applicazione di qualsiasi livello informativo Professional.",
      classificationAxes: [
        {
          code: "DB.01",
          title: "Gravità dell’evento",
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
          text: "Precisione delle coordinate, attribuzione comunale e affidabilità della georeferenziazione restano campi separati.",
        },
        {
          code: "DB.05",
          title: "Evidenza documentale",
          text: "Ogni evento conserva una traccia delle fonti per correzioni, riclassificazioni e uso professionale auditabile.",
        },
      ],
      layerMatrixLabel: "MATRICE LAYER PROFESSIONAL",
      layerMatrixTitle:
        "Professional connette un punto progetto verificato con esposizione ufficiale e collassi comparabili.",
      layerMatrixText:
        "Il livello Professional non sostituisce il database originario. Mantiene separati esposizione ufficiale al punto, contesto vicino e collassi storici, poi recupera una coorte dichiarata per produrre lezioni collegate alle fonti oppure astensione esplicita.",
      layerMatrixColumns: [
        "Campo database ARCUS",
        "Layer territoriale",
        "Lettura Professional",
        "Output operativo",
      ],
      layerMatrixRows: [
        [
          "Causa idraulica / trigger di piena",
          "WMS ISPRA IdroGEO per pericolosità alluvionale, reticolo idrografico e contesto idrografico",
          "Esposizione al punto e processi di collasso idraulico comparabili",
          "Priorità d’indagine supportate oppure astensione",
        ],
        [
          "Causa frana / instabilita di versante",
          "WMS ISPRA IdroGEO frane e contesto geomorfologico",
          "Ambiente di cedimento legato a dinamiche di versante",
          "Stato del supporto e astensione finché i requisiti evidenziali non sono soddisfatti",
        ],
        [
          "Terremoto / azione sismica",
          "Livello INGV per pericolosità sismica e classificazione territoriale",
          "Contesto di esposizione sismica al punto selezionato",
          "Valore di riferimento e stato esplicito del supporto derivato dai collassi",
        ],
        [
          "Materiale, degrado, età e tipologia",
          "Attributi degli eventi ARCUS",
          "Similarita tecnica con precedenti documentati",
          "Evidenza analoga spiegabile",
        ],
        [
          "Localizzazione, gravità e affidabilità della fonte",
          "Comune, provincia, rete e densità degli eventi",
          "Forza dell'evidenza ed episodi indipendenti",
          "Evidence package Lessons from Failures tracciabile",
        ],
      ],
      layerMatrixNote:
        "Le fonti pubbliche e istituzionali usate per l'esposizione ufficiale, incluse ISPRA e INGV, sono dichiarate con stato e provenienza. Il contesto vicino non viene mai assegnato al punto e l'indisponibilita della sorgente non viene interpretata come rischio zero.",
      sourceLabel: "FRAMEWORK DI VALIDAZIONE",
      sourceTitle:
        "Gerarchia e tracciabilità delle fonti",
      sourceText:
        "Ogni evento viene sottoposto a verifiche incrociate tra documentazione tecnica, scientifica, istituzionale e giornalistica. I metadati di tracciabilità sono conservati nell’architettura ARCUS per migliorare trasparenza, riproducibilità e future revisioni del database.",
      extensionLabel: "ESTENSIONI ARCUS",
      extensionTitle:
        "Oltre il dataset originario",
      extensions: [
        "Architettura per la tracciabilità delle fonti",
        "Sistema di arricchimento dei metadati",
        "Documentazione multi-fonte degli eventi",
        "Standardizzazione geospaziale",
        "Framework di aggiornamento continuo",
        "Integrazione di infrastructure intelligence",
      ],
      limitsLabel: "LIMITI E INCERTEZZA",
      limitsTitle: "Completezza dei dati",
      limitsText:
        "I registri storici sui crolli dei ponti sono per natura eterogenei e spesso condizionati da documentazione incompleta, qualità della registrazione non uniforme e livelli variabili di dettaglio tecnico. I periodi meno recenti possono presentare distorsioni dovute alla sottorappresentazione, soprattutto per gli eventi locali avvenuti lontano dai principali centri urbani. In alcuni casi l’informazione spaziale resta limitata alla scala comunale per l’assenza di documentazione georeferenziata affidabile. Gli eventi analoghi e le intersezioni con livelli ufficiali supportano l’apprendimento e l’indagine; non costituiscono una prova causale, una probabilità di collasso o una certificazione di sicurezza.",
      references: "RIFERIMENTI",
      researchFramework: "Framework di ricerca",
      outputLabel: "OUTPUT PIATTAFORMA",
      outputTitle:
        "Dal record validato agli strumenti operativi",
      outputText:
        "Lo stesso nucleo metodologico alimenta l’osservatorio pubblico e l’ambiente Professional: trasparenza, analisi e risultati operativi interpretabili.",
      outputs: [
        [
          "Open Atlas",
          "Eventi validati, timeline, tassonomia, geolocalizzazione e fonti documentate.",
        ],
        [
          "Professional",
          "Esposizione ufficiale al punto, collassi comparabili, forza dell'evidenza, lezioni sostenute oppure astensione.",
        ],
      ],
      sourceTiers: [
        ["LIVELLO 01", "Autorità ufficiali"],
        ["TIER 02", "Report tecnici"],
        ["TIER 03", "Pubblicazioni scientifiche"],
        ["TIER 04", "Archivi stampa verificati"],
        ["TIER 05", "Fonti locali corroborate"],
      ],
      scoringLabel: "TRASPARENZA EVIDENZA",
      scoringTitle:
        "Come leggere l'evidenza Professional",
      scoringText:
        "ARCUS rende espliciti forza dell'evidenza, collassi comparabili e limiti. Non li converte in ranking di patrimonio, diagnosi strutturale o certificazione di sicurezza.",
      scoringModels: [
        [
          "Forza dell'evidenza",
          "Descrive il supporto documentale attraverso il ruolo della fonte, il grado di attendibilità, la precisione spaziale e la tracciabilità.",
        ],
        [
          "Episodi indipendenti",
          "Evita che più record dello stesso episodio di collasso amplifichino artificialmente il segnale di apprendimento.",
        ],
        [
          "Esposizione ufficiale",
          "Mantiene le osservazioni ISPRA e INGV al punto separate dal contesto vicino e storico.",
        ],
        [
          "Retrieval analoghi",
          "Recupera collassi comparabili su base dichiarata ed espone casi, copertura e sensibilita dietro ogni lezione.",
        ],
      ],
    },
  };

  const baseContent = copy[language] || copy.en;
  const openContent = language === "it"
    ? {
        subtitle:
          "Un metodo trasparente per individuare, verificare, classificare e pubblicare record di collasso come base di evidenza versionata e riproducibile.",
        title: "Come ARCUS costruisce l’evidenza",
        validationFramework: "Validazione multi-fonte",
        contextTitle: "Dai documenti dispersi a record verificabili",
        contextParagraphs: [
          "Le informazioni sui crolli dei ponti sono distribuite tra atti istituzionali, relazioni tecniche, pubblicazioni scientifiche, archivi di stampa e fonti locali.",
          "ARCUS non tratta tutte le fonti come equivalenti e non confonde la presenza di un evento con la certezza della sua causa. Ogni affermazione viene collegata alla fonte che la sostiene e al relativo livello di evidenza.",
          "Il risultato è una release di ricerca interrogabile: i record possono essere corretti, riclassificati e confrontati senza perdere la provenienza dell’informazione.",
        ],
        scopeTitle:
          "Il metodo separa fatti osservati, classificazioni editoriali e informazioni non disponibili.",
        scopeText:
          "Questa separazione evita che un dato mancante diventi uno zero e che un’ipotesi tecnica venga presentata come conclusione accertata.",
        scopeCards: [
          {
            title: "Identità dell’evento",
            text: "Data, luogo, ponte e natura del cedimento vengono risolti prima di aggregare fonti o varianti dello stesso episodio.",
          },
          {
            title: "Fatto e interpretazione",
            text: "I valori osservati restano distinti dalle classi ARCUS derivate attraverso il processo editoriale.",
          },
          {
            title: "Incertezza esplicita",
            text: "Documented, Probable, Needs review e Unspecified descrivono il supporto disponibile senza colmare artificialmente i vuoti.",
          },
          {
            title: "Uso corretto",
            text: "I record sostengono ricerca comparativa e learning from failures; non stimano probabilità di collasso e non certificano la sicurezza.",
          },
        ],
        workflowTitle: "Dal caso segnalato alla release pubblica",
        workflowDescription:
          "Ogni record attraversa controlli progressivi prima di entrare in una release ARCUS citabile.",
        workflowSteps: [
          ["01", "Individuazione", "Ricerca mirata in fonti istituzionali, tecniche, scientifiche, giornalistiche e locali."],
          ["02", "Ammissibilità", "Esclusione di demolizioni controllate, soli danneggiamenti e casi privi di riscontro sufficiente."],
          ["03", "Risoluzione dell’identità", "Allineamento di data, ponte, località e fonti per evitare duplicazioni dello stesso episodio."],
          ["04", "Verifica documentale", "Confronto tra fonti indipendenti e attribuzione del ruolo svolto da ciascuna evidenza."],
          ["05", "Georeferenziazione e classi", "Coordinate WGS84, severità, causa, trigger, processo ed evidenza sono registrati in campi distinti."],
          ["06", "QA e versionamento", "Controlli automatici e revisione editoriale precedono ogni rilascio; correzioni e limiti restano tracciabili."],
        ],
        taxonomyTitle: "Una tassonomia leggibile e dichiarata",
        severity: "Esito del cedimento",
        mechanism: "Presenza del trigger",
        generalCause: "Famiglia causale",
        specificCauses: "Causa specifica prevalente",
        classificationLogicTitle:
          "Cinque assi impediscono di comprimere un evento complesso in una sola etichetta.",
        classificationLogicText:
          "Causa, trigger e processo non sono sinonimi. ARCUS conserva inoltre gravità, precisione spaziale e forza documentale per rendere ogni confronto auditabile.",
        classificationAxes: [
          { code: "DB.01", title: "Esito", text: "Collasso totale o parziale, distinto dal solo danneggiamento non incluso nel perimetro del database." },
          { code: "DB.02", title: "Trigger", text: "Evento immediato identificabile, come piena, frana, sisma, impatto o sovraccarico; può restare non specificato." },
          { code: "DB.03", title: "Causa e processo", text: "Famiglia causale prevalente e, quando documentato, meccanismo fisico e componente coinvolta." },
          { code: "DB.04", title: "Posizione", text: "Coordinate, territorio amministrativo, precisione e anomalie geografiche sono verificati senza correzioni silenziose." },
          { code: "DB.05", title: "Evidenza", text: "Ruolo delle fonti, indipendenza, confidenza e livello documentale restano disponibili per revisione e riuso." },
        ],
        sourceTitle: "Ruoli delle fonti e tracciabilità",
        sourceText:
          "Le categorie non sono una graduatoria automatica di verità: una fonte è valutata rispetto all’affermazione che deve sostenere. Contano prossimità all’evento, competenza, indipendenza, specificità e possibilità di verifica. Titolo, URL o riferimento, data, lingua e ruolo sono conservati nella release.",
        sourceTiers: [
          ["RUOLO 01", "Atti e comunicazioni istituzionali"],
          ["RUOLO 02", "Relazioni tecniche e giudiziarie"],
          ["RUOLO 03", "Pubblicazioni e dataset scientifici"],
          ["RUOLO 04", "Cronaca contemporanea verificabile"],
          ["RUOLO 05", "Archivi e fonti locali corroboranti"],
        ],
        extensionLabel: "CONTROLLI DELLA RELEASE",
        extensionTitle: "La qualità resta ispezionabile",
        extensions: [
          "Manifest e versione della release",
          "Dizionario dei campi pubblicati",
          "Tassonomia con definizioni operative",
          "Audit di errori e avvertenze",
          "Statistiche di completezza",
          "Changelog delle revisioni",
        ],
        scoringLabel: "COME LEGGERE I DATI",
        scoringTitle: "L’evidenza viene descritta, non trasformata in certezza",
        scoringText:
          "ARCUS rende visibili supporto e limiti di ogni record. La completezza di un campo non equivale alla sicurezza di un ponte né alla probabilità di un evento futuro.",
        scoringModels: [
          ["Supporto documentale", "Documented e Probable distinguono una conclusione esplicita da un’attribuzione fortemente sostenuta ma non definitiva."],
          ["Vuoto informativo", "Unspecified è un valore intenzionale: indica che il dettaglio non è ricostruibile dalle fonti disponibili."],
          ["Revisione aperta", "Needs review conserva conflitti o anomalie senza nasconderli e senza forzare una classificazione."],
          ["Comparabilità", "Le analisi devono dichiarare filtri, periodo, variabili disponibili e denominatore; frequenza osservata non significa rischio."],
        ],
        outputLabel: "STRUMENTI OPEN",
        outputTitle: "Un metodo, tre modi verificabili di usare la release",
        outputText:
          "Atlante, Analytics e pacchetto dati leggono la stessa release versionata e mantengono accessibili fonti, tassonomia e limiti.",
        outputs: [
          ["Atlante", "Consultazione geografica dei 261 eventi, schede, coordinate e fonti documentate."],
          ["Analytics", "Esplorazione descrittiva con filtri dichiarati ed esportazioni adatte al riuso scientifico."],
          ["Pacchetto dati", "CSV, GeoJSON, fonti, dizionario, tassonomia, audit, statistiche e changelog senza account."],
        ],
        limitsTitle: "Cosa il database può — e non può — rappresentare",
        limitsText:
          "ARCUS descrive eventi documentati, non l’universo completo dei cedimenti avvenuti. Copertura delle fonti, precisione spaziale e dettaglio tecnico variano tra record e periodi; gli eventi meno recenti e locali possono essere sottorappresentati. Le frequenze dipendono anche dalla disponibilità documentale e non costituiscono tassi di rischio in assenza di un denominatore esposto affidabile. Il database non stima probabilità di collasso, non diagnostica strutture esistenti e non sostituisce ispezioni o valutazioni professionali.",
        researchFramework: "Base scientifica e risorse riproducibili",
        paperRelation:
          "La pubblicazione costituisce la base scientifica originaria; la release ARCUS Open è successiva, versionata e soggetta a revisione continua.",
      }
    : {
        subtitle:
          "A transparent method for identifying, verifying, classifying and publishing bridge-collapse records as a versioned, reproducible evidence base.",
        title: "How ARCUS builds evidence",
        validationFramework: "Multi-source validation",
        contextTitle: "From fragmented documents to verifiable records",
        contextParagraphs: [
          "Bridge-collapse information is distributed across institutional records, technical reports, scientific publications, news archives and local sources.",
          "ARCUS does not treat every source as equivalent and does not confuse the occurrence of an event with certainty about its cause. Each claim remains linked to the evidence that supports it.",
          "The result is an inspectable research release: records can be corrected, reclassified and compared without losing provenance.",
        ],
        scopeTitle:
          "The method separates observed facts, editorial classifications and unavailable information.",
        scopeText:
          "This separation prevents missing information from becoming zero and technical hypotheses from being presented as established conclusions.",
        scopeCards: [
          { title: "Event identity", text: "Date, location, bridge and failure type are resolved before sources or variants of the same episode are combined." },
          { title: "Fact and interpretation", text: "Observed values remain distinct from ARCUS classes derived through the editorial process." },
          { title: "Explicit uncertainty", text: "Documented, Probable, Needs review and Unspecified describe support without artificially filling gaps." },
          { title: "Proper use", text: "Records support comparative research and learning from failures; they do not estimate collapse probability or certify safety." },
        ],
        workflowTitle: "From reported case to public release",
        workflowDescription: "Each record passes progressive controls before entering a citable ARCUS release.",
        workflowSteps: [
          ["01", "Discovery", "Targeted searches across institutional, technical, scientific, journalistic and local sources."],
          ["02", "Eligibility", "Controlled demolitions, damage-only cases and events without sufficient corroboration are excluded."],
          ["03", "Identity resolution", "Date, bridge, place and sources are aligned to prevent duplicate records for the same episode."],
          ["04", "Evidence review", "Independent sources are compared and the role of each item of evidence is recorded."],
          ["05", "Geolocation and classes", "WGS84 coordinates, severity, cause, trigger, process and evidence are stored in separate fields."],
          ["06", "QA and versioning", "Automated checks and editorial review precede release; corrections and limitations remain traceable."],
        ],
        taxonomyTitle: "A declared, readable taxonomy",
        severity: "Failure outcome",
        mechanism: "Trigger presence",
        generalCause: "Cause family",
        specificCauses: "Prevalent specific cause",
        classificationLogicTitle: "Five axes prevent a complex event from being compressed into one label.",
        classificationLogicText: "Cause, trigger and process are not synonyms. ARCUS also preserves severity, spatial precision and documentary strength so comparisons remain auditable.",
        classificationAxes: [
          { code: "DB.01", title: "Outcome", text: "Total or partial collapse, kept distinct from damage-only cases outside the database scope." },
          { code: "DB.02", title: "Trigger", text: "An identifiable immediate event such as flood, landslide, earthquake, impact or overload; it may remain unspecified." },
          { code: "DB.03", title: "Cause and process", text: "Prevalent cause family and, when documented, physical process and component involved." },
          { code: "DB.04", title: "Location", text: "Coordinates, administrative context, precision and geographic anomalies are checked without silent corrections." },
          { code: "DB.05", title: "Evidence", text: "Source role, independence, confidence and documentary level remain available for review and reuse." },
        ],
        sourceTitle: "Source roles and traceability",
        sourceText: "The categories are not an automatic hierarchy of truth: a source is assessed against the claim it must support. Proximity, expertise, independence, specificity and verifiability matter. Title, URL or reference, date, language and role are retained in the release.",
        sourceTiers: [
          ["ROLE 01", "Institutional records and notices"],
          ["ROLE 02", "Technical and forensic reports"],
          ["ROLE 03", "Scientific publications and datasets"],
          ["ROLE 04", "Verifiable contemporary reporting"],
          ["ROLE 05", "Corroborating local archives and sources"],
        ],
        extensionLabel: "RELEASE CONTROLS",
        extensionTitle: "Quality remains inspectable",
        extensions: ["Release manifest and version", "Published-field dictionary", "Taxonomy with operational definitions", "Error and warning audit", "Completeness statistics", "Revision changelog"],
        scoringLabel: "HOW TO READ THE DATA",
        scoringTitle: "Evidence is described, not converted into certainty",
        scoringText: "ARCUS exposes the support and limitations of each record. Field completeness is neither bridge safety nor the probability of a future event.",
        scoringModels: [
          ["Documentary support", "Documented and Probable separate an explicit conclusion from a strongly supported but non-final attribution."],
          ["Information gap", "Unspecified is intentional: the detail cannot be reconstructed from the available sources."],
          ["Open review", "Needs review retains conflicts or anomalies without hiding them or forcing a classification."],
          ["Comparability", "Analyses must declare filters, period, available variables and denominator; observed frequency is not risk."],
        ],
        outputLabel: "OPEN TOOLS",
        outputTitle: "One method, three verifiable ways to use the release",
        outputText: "The Atlas, Analytics and data package read the same versioned release and keep sources, taxonomy and limitations accessible.",
        outputs: [
          ["Atlas", "Geographic consultation of 261 events, records, coordinates and documented sources."],
          ["Analytics", "Descriptive exploration with declared filters and exports suitable for scientific reuse."],
          ["Data package", "CSV, GeoJSON, sources, dictionary, taxonomy, audit, statistics and changelog without an account."],
        ],
        limitsTitle: "What the database can — and cannot — represent",
        limitsText: "ARCUS describes documented events, not the complete universe of failures. Source coverage, spatial precision and technical detail vary across records and periods; older and local events may be underrepresented. Frequencies also reflect documentary availability and are not risk rates without a reliable exposed denominator. The database does not estimate collapse probability, diagnose existing structures or replace inspection and professional assessment.",
        researchFramework: "Scientific foundation and reproducible resources",
        paperRelation: "The publication is the original scientific foundation; the ARCUS Open release is subsequent, versioned and continuously reviewed.",
      };

  const content = professionalEnabled
    ? baseContent
    : { ...baseContent, ...openContent };

  return (
    <main
      className="methodology-page"
      id="main-content"
    >
      <PageMeta
        title={content.title}
        description={
          !professionalEnabled
            ? language === "it"
              ? "Metodo ARCUS per identificare, verificare, classificare e pubblicare record di collasso dei ponti come evidenza scientifica versionata."
              : "ARCUS method for identifying, verifying, classifying and publishing bridge-collapse records as versioned scientific evidence."
            : language === "it"
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

          <div className="methodology-hero-evidence">
            <div className="methodology-hero-stats">
              <div className="methodology-stat">
                <span className="methodology-stat-value">2000-2026</span>
                <span className="methodology-stat-label">{content.temporalCoverage}</span>
              </div>

              <div className="methodology-stat">
                <span className="methodology-stat-value">261</span>
                <span className="methodology-stat-label">{language === "it" ? "Eventi pubblicati" : "Published events"}</span>
              </div>

              <div className="methodology-stat">
                <span className="methodology-stat-value">716</span>
                <span className="methodology-stat-label">{language === "it" ? "Fonti documentate" : "Documented sources"}</span>
              </div>

              <div className="methodology-stat">
                <span className="methodology-stat-value">WGS84</span>
                <span className="methodology-stat-label">{content.geospatialStandard}</span>
              </div>
            </div>

            <a
              className="methodology-paper-card"
              href="https://doi.org/10.1016/j.dib.2025.112375"
              target="_blank"
              rel="noreferrer"
            >
              <div className="methodology-paper-label">{content.relatedPublication}</div>
              <div className="methodology-paper-title">
                Dataset of bridge collapses in Italy from 2000 to 2025
              </div>
              <div className="methodology-paper-meta">Data in Brief · Elsevier</div>
              <div className="methodology-paper-authors">Paolini et al.</div>
              {content.paperRelation && (
                <p className="methodology-paper-relation">{content.paperRelation}</p>
              )}
            </a>
          </div>

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
                <span>{language === "it" ? "TC · Collasso totale" : "TC · Total collapse"}</span>
                <span>{language === "it" ? "PC · Collasso parziale" : "PC · Partial collapse"}</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.mechanism}
              </div>

              <div className="classification-tags">
                <span>{language === "it" ? "Trigger identificato" : "Identified trigger"}</span>
                <span>{language === "it" ? "Nessun trigger identificabile" : "No identifiable trigger"}</span>
                <span>{language === "it" ? "Non specificato" : "Unspecified"}</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.generalCause}
              </div>

              <div className="classification-tags">
                <span>{language === "it" ? "Naturale" : "Natural"}</span>
                <span>{language === "it" ? "Antropica" : "Human-induced"}</span>
                <span>{language === "it" ? "Non specificata" : "Unspecified"}</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                {content.specificCauses}
              </div>

              <div className="classification-tags">

                <span className="taxonomy-hydraulic">
                  {language === "it" ? "Hydraulic · Idraulica" : "Hydraulic"}
                </span>

                <span className="taxonomy-material">
                  {language === "it" ? "Material · Materiali" : "Material"}
                </span>

                <span className="taxonomy-earthquake">
                  {language === "it" ? "Earthquake · Sisma" : "Earthquake"}
                </span>

                <span className="taxonomy-impact">
                  {language === "it" ? "Impact · Impatto" : "Impact"}
                </span>

                <span className="taxonomy-landslide">
                  {language === "it" ? "Landslide · Frana" : "Landslide"}
                </span>

                <span className="taxonomy-overload">
                  {language === "it" ? "Overload · Sovraccarico" : "Overload"}
                </span>

                <span className="taxonomy-design">
                  {language === "it" ? "Design & Construction · Progetto e costruzione" : "Design & Construction"}
                </span>

                <span className="taxonomy-fire">
                  {language === "it" ? "Fire & Explosion · Incendio ed esplosione" : "Fire & Explosion"}
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

      {professionalEnabled && <section className="methodology-section methodology-dark">

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

      </section>}

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

      <Footer />
    </main>
  );
}

export default MethodologyPage;
