// Shared by the visible pages and their crawlable HTML to keep provenance consistent.
export const researchLineage = {
  it: {
    label: "DAL DATASET ALLA RELEASE ARCUS",
    title: "Continuità scientifica, revisione e aggiornamento",
    overview: "ARCUS parte dal dataset collettivo pubblicato con l’articolo su Data in Brief. Il primo intervento sostanziale è stato aggiungere riferimenti alle fonti per ciascun evento, assenti nel dataset pubblicato di partenza, e usarli per riesaminare i crolli caso per caso.",
    steps: [
      {
        title: "Base scientifica originaria",
        text: "La raccolta originaria documenta il lavoro degli autori e delle ricerche pregresse. L’articolo descrive come sono stati raccolti i dati; il file pubblicato non associava le fonti alle singole schede.",
      },
      {
        title: "Fonti per evento e verifica caso per caso",
        text: "ARCUS collega i riferimenti alle singole schede e confronta le fonti per verificare a quale ponte e a quale evento si riferiscono. La revisione distingue ciò che le fonti documentano da ciò che sostengono solo in parte o non permettono di stabilire, anche per data, localizzazione, gravità e causa del crollo.",
      },
      {
        title: "Correzioni, duplicati e integrazioni",
        text: "Il confronto ha permesso di correggere attribuzioni e riconoscere duplicati già presenti nella release originaria. Quando più schede descrivono lo stesso crollo, ARCUS le riconcilia per non contarlo due volte, conservando traccia della revisione. I dettagli non accertabili restano non specificati; nuovi eventi e dati derivati da altri studi conservano la loro provenienza.",
      },
      {
        title: "Release e responsabilità editoriale",
        text: "Ogni release identifica la fotografia dei dati utilizzata. Correzioni e riclassificazioni introdotte da ARCUS sono responsabilità del curatore e non implicano l’approvazione degli autori dei lavori citati. La citazione della release si affianca a quella del dataset originario e degli studi effettivamente utilizzati.",
      },
    ],
    limit: "Revisione non significa modifica di ogni valore né completa rivalidazione indipendente di ogni scheda. Un valore può essere mantenuto; informazioni non risolte e classificazioni editoriali restano distinguibili dai fatti documentati. La release ARCUS non modifica retroattivamente il dataset pubblicato con l’articolo e non estende a sé la revisione tra pari di quel lavoro.",
    hydraulic: "Nei record collegati al dataset supplementare S3 di D’Angelo, Ballio e Ravazzani (2025), le lunghezze e le classificazioni idrauliche riutilizzate provengono da quel lavoro e non sono nuove misure o analisi ARCUS. Il collegamento non conferma automaticamente identità del ponte, data, TC/PC o ogni altro campo della scheda. La citazione del paper come contesto scientifico, senza corrispondenza con un record S3, non costituisce documentazione specifica dell’evento.",
    provenanceLink: "Provenienza e contributi scientifici",
    releaseLink: "Consulta la release e il changelog",
  },
  en: {
    label: "FROM THE DATASET TO THE ARCUS RELEASE",
    title: "Scientific continuity, review and updates",
    overview: "ARCUS builds on the collective dataset published with the Data in Brief article. Its first major addition was to supply event-level source references, which were absent from the published starting dataset, and use them to review collapses case by case.",
    steps: [
      {
        title: "Original scientific foundation",
        text: "The original collection reflects the work of its authors and earlier research. The article describes how the data were gathered; the published data file did not link sources to individual records.",
      },
      {
        title: "Event-level sources and case-by-case review",
        text: "ARCUS links references to individual records and compares sources to check which bridge and event they describe. The review distinguishes what sources document from what they support only in part or do not establish, including the date, location, severity and cause of collapse.",
      },
      {
        title: "Corrections, duplicates and additions",
        text: "Comparing sources has helped correct attributions and identify duplicates already present in the original release. When multiple records describe the same collapse, ARCUS reconciles them to avoid double counting and retains a record of the revision. Details that cannot be established remain unspecified; new events and data reused from other studies retain their provenance.",
      },
      {
        title: "Releases and editorial responsibility",
        text: "Each release identifies the data snapshot used. Corrections and reclassifications introduced by ARCUS are the curator’s responsibility and do not imply approval by authors of cited works. Release citations accompany citations of the original dataset and the studies actually used.",
      },
    ],
    limit: "Review does not mean changing every value or independently revalidating every record in full. A value may be retained; unresolved information and editorial classifications remain distinguishable from documented facts. An ARCUS release does not retrospectively change the article’s published dataset or inherit that work’s peer-review status.",
    hydraulic: "For records matched to supplementary dataset S3 by D’Angelo, Ballio and Ravazzani (2025), reused lengths and hydraulic classifications originate in that work and are not new ARCUS measurements or analyses. A match does not automatically confirm bridge identity, date, TC/PC or every other record field. Citing the paper as scientific context without an S3 record match does not constitute event-specific documentation.",
    provenanceLink: "Data provenance and scientific contributions",
    releaseLink: "Consult the release and changelog",
  },
};
