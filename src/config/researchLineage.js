// Shared by the visible pages and their crawlable HTML to keep provenance consistent.
export const researchLineage = {
  it: {
    label: "DAL DATASET ALLA RELEASE ARCUS",
    title: "Continuità scientifica, revisione e aggiornamento",
    overview: "ARCUS sviluppa il dataset italiano pubblicato su Data in Brief attraverso una successiva curatela dei record. La release conserva la provenienza della raccolta collettiva e distingue le revisioni ARCUS dalle informazioni riprese dai lavori citati.",
    steps: [
      {
        title: "Base scientifica originaria",
        text: "Il dataset dell’articolo costituisce il punto di partenza. Il contributo degli autori e delle ricerche pregresse resta riconosciuto anche quando un record viene successivamente corretto o integrato.",
      },
      {
        title: "Revisione dei record",
        text: "La curatela riguarda anche informazioni già presenti nell’originale: identità dell’evento, date, localizzazione, attraversamento, uso, TC/PC, attribuzione causale e persone coinvolte. I campi vengono mantenuti, precisati, corretti o resi non specificati in funzione del supporto disponibile. Vengono inoltre riesaminate inclusioni, esclusioni e possibili duplicazioni.",
      },
      {
        title: "Integrazioni con provenienza esplicita",
        text: "Fonti ulteriori, nuovi eventi e campi strutturati ampliano la raccolta. Le informazioni riprese da studi o dataset esterni restano attribuite ai rispettivi autori. La revisione dei campi originari e l’integrazione di nuove informazioni sono attività distinte.",
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
    overview: "ARCUS develops the Italian dataset published in Data in Brief through subsequent record curation. The release preserves the provenance of the collective collection and distinguishes ARCUS revisions from information reused from cited works.",
    steps: [
      {
        title: "Original scientific foundation",
        text: "The article’s dataset is the starting point. Contributions by its authors and the earlier research remain acknowledged when a record is subsequently corrected or enriched.",
      },
      {
        title: "Review of existing records",
        text: "Curation also covers information already present in the original: event identity, dates, location, crossing, use, TC/PC, causal attribution and casualties. Fields are retained, clarified, corrected or left unspecified according to available support. Inclusions, exclusions and possible duplicates are also reassessed.",
      },
      {
        title: "Additions with explicit provenance",
        text: "Further sources, additional events and structured fields expand the collection. Information reused from external studies or datasets remains attributed to its authors. Reviewing original fields and adding new information are distinct activities.",
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
