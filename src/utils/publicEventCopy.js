import { localizedBridgeDisplayName, localizedEventDescription } from "./eventDisplayLabels.js";

// Public prose is distinct from the original working description in the private Master.
// These notes restate existing limitations; they never change an event's scientific fields.
const noteCatalog = {
  identity: ["L’identificazione puntuale dell’attraversamento non è conclusiva nelle fonti disponibili.", "The available sources do not conclusively identify the exact crossing."],
  independence: ["Le fonti non consentono di distinguere con certezza tutti gli attraversamenti menzionati nello stesso episodio.", "The sources do not conclusively distinguish every crossing mentioned within the same episode."],
  date: ["Il giorno esatto del cedimento non è documentato in modo univoco; la data della scheda è un riferimento cronologico, non una conferma della precisione giornaliera.", "The exact failure day is not unambiguously documented; the record date is a chronological reference, not confirmation of day-level precision."],
  location: ["Le coordinate indicano l’intorno del sito e non un rilievo topografico del centro del ponte.", "Coordinates indicate the site vicinity, not a surveyed bridge-centre position."],
  boundary: ["L’attribuzione amministrativa del punto non è conclusiva nelle fonti consultate.", "The administrative attribution of the point is not conclusive in the consulted sources."],
  structure: ["La configurazione strutturale originaria non è definita in modo conclusivo dalla documentazione disponibile.", "The available documentation does not conclusively establish the original structural configuration."],
  material: ["Il materiale della struttura originaria non è definito in modo conclusivo dalle fonti consultate.", "The consulted sources do not conclusively establish the material of the original structure."],
  process: ["Il meccanismo fisico di dettaglio non è accertato in modo univoco; le classificazioni riportate mantengono il livello di evidenza della scheda.", "The detailed physical mechanism is not unambiguously established; reported classifications retain the record's stated evidence level."],
  damage: ["L’estensione del danno agli elementi portanti e la transitabilità delle corsie non sono ricostruibili completamente dalle fonti disponibili. Il codice TC/PC riportato è la classificazione ARCUS, non una nuova verifica tecnica.", "The available sources do not fully establish damage to primary members and lane passability. The recorded TC/PC code is the ARCUS classification, not a new technical assessment."],
  replacement: ["Le caratteristiche delle opere ricostruite o sostitutive non sono attribuite automaticamente alla struttura originaria.", "Characteristics of rebuilt or replacement works are not automatically assigned to the original structure."],
  demolition: ["L’eventuale demolizione controllata successiva è distinta dal danno o cedimento iniziale.", "Any subsequent controlled demolition is distinct from the initial damage or failure."],
  casualties: ["I conteggi si riferiscono all’evento della scheda; il bilancio di un’alluvione, di un sisma o di un incidente distinto non è trasferito automaticamente al ponte.", "Counts refer to the event in this record; flood, earthquake or separate-accident totals are not automatically assigned to the bridge."],
  legal: ["Le notizie giudiziarie sono riferite alla fase del procedimento descritta dalle fonti e restano distinte dall’accertamento del meccanismo tecnico.", "Judicial reporting refers to the procedural stage described by the sources and is kept distinct from assessment of the technical mechanism."],
  visual: ["Le attribuzioni ricavate da fotografie sono interpretazioni visive, non risultati di prove sui materiali o di un’ispezione strutturale.", "Attributes derived from photographs are visual interpretations, not material-test results or a structural inspection."],
  review: ["La scheda conserva uno stato di revisione documentale: la presenza di un valore non equivale alla sua conferma tecnica indipendente.", "The record retains a documentary-review status: a populated value does not imply independent technical confirmation."],
};

// Specific context that must not be flattened into a generic caution.
const specificNotes = {
  "IT00.01.01": ["Le fonti disponibili non stabiliscono con certezza identità del ponte, anno ed estensione del cedimento attribuito al 25 gennaio 2000. Il riferimento giornalistico reca una data di pubblicazione del gennaio 2001; l’alluvione del Biferno del gennaio 2003 è un episodio distinto. La data e il codice TC della scheda non costituiscono conferma indipendente dell’evento.", "The available sources do not establish the bridge identity, year and failure extent attributed to 25 January 2000. The news reference carries a January 2001 publication date; the January 2003 Biferno flood is a separate episode. The record date and TC code do not independently confirm the event."],
  "IT01.03.01": ["Il cedimento riguarda il rilevato d’accesso di via Stalingrado, non un crollo accertato dell’impalcato. TC è applicato come esito operativo ARCUS. Le fonti descrivono lavori di scavo presso il muro di contenimento, ma non definiscono completamente la transitabilità delle corsie e la causa tecnica definitiva.", "The failure concerns the Via Stalingrado approach embankment, not an established deck collapse. TC is applied as an ARCUS operational outcome. Sources describe excavation near the retaining wall but do not fully establish lane passability or the definitive technical cause."],
  "IT03.09.01": ["Il crollo del settembre 2003 e quello dell’ottobre 2005 sono episodi distinti attribuiti dalle fonti al medesimo Ponte Cernera. La ricostruzione intermedia è riportata dalla stampa; non è documentata qui da un atto di collaudo. Le caratteristiche del ponte sostitutivo non descrivono automaticamente l’opera del 2003.", "The September 2003 and October 2005 losses are distinct episodes attributed by sources to the same Ponte Cernera. The intervening reconstruction is reported by the press, not documented here by an acceptance record. Replacement-bridge characteristics do not automatically describe the 2003 structure."],
  "IT05.10.01": ["L’episodio del 2005 riguarda lo stesso attraversamento Cernera interessato nel 2003. La gara comunale identifica il ponte, mentre la cronaca dell’8 ottobre non lo nomina e non ne conferma da sola il giorno esatto di cedimento. Il rapporto tra manufatto e rilevato originario non è definito in modo conclusivo.", "The 2005 episode concerns the same Cernera crossing affected in 2003. The municipal tender identifies the bridge, whereas the 8 October report does not name it or independently confirm its exact failure day. The relationship between the original structure and embankment is not conclusively established."],
  "IT09.04.05": ["ARCUS registra PC in associazione al sisma del 2009. La ricostruzione de Il Capoluogo del 2021 riporta però assenza di gravi danni strutturali da sisma e prove di carico positive. Questa divergenza resta esplicita: la chiusura e il successivo degrado non costituiscono da soli prova di una grave deformazione degli elementi portanti nel 2009.", "ARCUS records PC in association with the 2009 earthquake. Il Capoluogo's 2021 retrospective nevertheless reports an absence of severe structural earthquake damage and positive load tests. This conflict remains explicit: closure and subsequent deterioration do not alone demonstrate severe primary-member deformation in 2009."],
  "IT10.01.01": ["L’incidente mortale a un manutentore dell’11 febbraio 2010 avvenne durante lavori successivi e non è conteggiato come vittima del crollo del ponte del 27 gennaio.", "The fatal maintenance-worker accident on 11 February 2010 occurred during subsequent works and is not counted as a fatality of the 27 January bridge collapse."],
  "IT11.11.02": ["L’episodio riguarda il ponte ferroviario e il deragliamento del treno regionale 3793, non il vicino ponte stradale. Il numero dei feriti riportato nella scheda non è confermato in modo conclusivo dalla documentazione esaminata.", "The event concerns the railway bridge and derailment of regional train 3793, not the nearby road bridge. The injury count recorded in the dataset is not conclusively confirmed by the reviewed documentation."],
  "IT13.02.01": ["Il cedimento riguarda le campate del ponte storico in muratura sul Verdura. L’erosione idraulica è attribuita al dataset S3. L’articolo giudiziario del 2016 riferisce richieste dell’accusa e della difesa, non una sentenza che accerti un errore umano. I cedimenti delle opere provvisorie successive non sono cause del crollo originario.", "The loss concerns spans of the historic masonry bridge over the Verdura. Hydraulic erosion is attributed to dataset S3. The 2016 judicial report describes prosecution and defence submissions, not a judgment establishing human error. Failures of subsequent temporary works are not causes of the original collapse."],
  "IT13.11.03": ["Il documento regionale descrive la perdita di circa 20 metri di rilevato presso un attraversamento idraulico e tre vittime. Non documenta la distruzione di un intero impalcato. L’appartenenza del manufatto alla categoria dei rilevati d’accesso direttamente connessi a un ponte e il materiale originario non sono conclusivamente stabiliti.", "The regional document describes loss of about 20 metres of embankment at a hydraulic crossing and three fatalities. It does not document destruction of an entire deck. Eligibility as an approach embankment directly connected to a bridge, and the original material, are not conclusively established."],
  "IT14.11.01": ["Il ponte pedonale storico in pietra sul Rio Ciliegio, tra Trasta e Murta, fu asportato durante l’alluvione del novembre 2014. Il giorno esatto e la configurazione originaria a due campate non sono confermati dalle fonti disponibili. Nel record S3 P079 è indicato il carico idraulico; l’eventuale sormonto non è specificato.", "The historic stone pedestrian bridge over Rio Ciliegio, between Trasta and Murta, was swept away in the November 2014 flood. The exact day and original two-span configuration are not confirmed by the available sources. S3 record P079 indicates hydraulic loading; overtopping is not specified."],
  "IT14.12.01": ["Le fonti descrivono il cedimento del rilevato dietro la spalla, non il crollo di pile o campate. La determinazione ANAC distingue l’apertura del 23 dicembre 2014 senza collaudo statico dal cedimento del 31 dicembre e dalla successiva fase del febbraio 2015.", "Sources describe failure of the embankment behind the abutment, not collapse of piers or spans. The ANAC determination distinguishes opening on 23 December 2014 without static acceptance testing, the 31 December failure and a subsequent February 2015 stage."],
  "IT16.10.01": ["Il trasporto eccezionale pesava circa 107,5 tonnellate, entro l’autorizzazione di peso rilasciata. Autorizzazione del percorso, capacità del ponte e condizioni pregresse sono aspetti distinti. La documentazione parlamentare riporta cinque feriti, contro quattro delle prime notizie.", "The exceptional transport weighed about 107.5 tonnes, within its issued weight authorization. Route authorization, bridge capacity and pre-existing condition are distinct issues. Parliamentary documentation records five injuries, whereas initial news reports gave four."],
  "IT16.11.04": ["PC descrive la deformazione progressiva dei sostegni e lo spostamento dell’impalcato del Ponte Bavera, non la caduta del ponte o il cedimento della vicina SP100. L’interazione con la frana precedeva il 2016; l’incremento attribuibile alla piena non è isolabile dalle fonti disponibili. La chiusura risale al settembre 2017.", "PC describes progressive support deformation and deck displacement at Ponte Bavera, not a fall of the bridge or failure of nearby SP100. Landslide interaction pre-dated 2016; the increment attributable to the flood cannot be isolated from available sources. Closure occurred in September 2017."],
  "IT17.06.01": ["Il crollo del 15 giugno 2017 è successivo all’erosione di piena e alla chiusura del ponte. Il nesso con il progressivo indebolimento della fondazione è probabile, non un cedimento istantaneo durante la piena.", "The 15 June 2017 collapse followed earlier flood erosion and bridge closure. The link to progressive foundation weakening is probable, not an instantaneous failure during the flood."],
  "IT18.08.01": ["Il crollo interessò il sistema della pila 9 e le sezioni d’impalcato associate. La comunicazione del Tribunale di Genova del 17 luglio 2026 riguarda il giudizio di primo grado; responsabilità individuali e sviluppi processuali restano distinti dalle evidenze ingegneristiche sul meccanismo di collasso.", "The collapse affected the pylon 9 system and associated deck sections. The Tribunal of Genoa communication of 17 July 2026 concerns the first-instance judgment; individual responsibility and procedural developments remain distinct from engineering evidence on the collapse mechanism."],
  "IT18.10.08": ["Il manufatto è la passerella della chiusa di San Bartolo sul Ronco, non un ponte stradale a Forlì. Il cedimento avvenne durante un sopralluogo tecnico; ARPAE documenta sifonamento ed erosione della sponda che sosteneva il tratto di passerella.", "The structure is the walkway at the San Bartolo weir over the Ronco, not a road bridge in Forlì. Failure occurred during a technical inspection; ARPAE documents piping and erosion of the bank supporting the walkway section."],
  "IT20.04.02": ["Le perizie riferite nelle fonti giudiziarie attribuiscono un ruolo principale al movimento di una frana preesistente lungo l’allineamento del ponte, considerando anche fattori costruttivi e di monitoraggio. La classificazione è Landslide; il processo strutturale di dettaglio non è definito in modo univoco.", "Expert findings reported in judicial sources attribute a principal role to movement of a pre-existing landslide along the bridge alignment, also considering construction and monitoring factors. The classification is Landslide; the detailed structural process is not unambiguously established."],
  "IT20.10.04": ["La cronaca giudiziaria dell’aprile 2026 riferisce la spinta della frana di Carisasca e il proscioglimento dei tecnici, distinguendo il meccanismo geologico dal contesto di piena. I giunti previsti e non realizzati sono descritti come mitigazione non attuata, non come difetto costruttivo intrinseco definitivamente accertato. Il record S3 P157 conserva una diversa classificazione degli autori.", "April 2026 court reporting describes pressure from the Carisasca landslide and discharge of the technicians, distinguishing the geological mechanism from the flood context. Planned but unbuilt joints are described as unimplemented mitigation, not a definitively established intrinsic construction defect. S3 record P157 preserves a different classification by its authors."],
  "IT20.10.06": ["Per Ponte Manfredi le prime notizie parlano di crollo, mentre il piano regionale descrive rottura della sede stradale, danni alle spalle e consolidamento del ponte esistente. PC è la classificazione ARCUS; le fonti non definiscono l’effettiva transitabilità delle corsie o l’estensione della deformazione degli elementi portanti. Non è il ponte SP83 di Borghetto d’Arroscia.", "For Ponte Manfredi, early reports describe collapse, whereas the regional plan describes roadway rupture, abutment damage and consolidation of the existing bridge. PC is the ARCUS classification; the sources do not establish actual lane passability or the extent of primary-member deformation. This is not the SP83 bridge at Borghetto d'Arroscia."],
  "IT20.11.02": ["Le prime notizie segnalano fessurazioni e danni; il successivo resoconto ANAS dello stesso giorno riferisce assenza di particolari anomalie e riapertura. Entrambe le versioni sono conservate nelle fonti. PC si riferisce ai danni inizialmente riportati, non a un collasso degli elementi portanti accertato dal successivo sopralluogo.", "Early reporting describes cracking and damage; the subsequent same-day ANAS account reports no particular anomalies and reopening. Both accounts remain in the source list. PC refers to the initially reported damage, not to a primary-member collapse established by the later inspection."],
  "IT20.11.04": ["Le fonti identificano il collegamento Osidda–Bitti, ma non ne definiscono punto esatto, corso d’acqua, dimensioni e componenti danneggiate. Il precedente collegamento al record S3 P175 del Riu de Malò resta un riferimento storico, non la prova che si tratti del medesimo ponte: lunghezza e classificazioni di quel record non sono trasferite a questo attraversamento.", "Sources identify the Osidda–Bitti connection but do not establish its exact point, watercourse, dimensions or damaged components. The former link to S3 P175 on Riu de Malò remains a historical reference, not proof of the same bridge: that record's length and classifications are not transferred to this crossing."],
  "IT23.01.02": ["Le fonti contemporanee datano l’urto al 30 gennaio 2023; un resoconto retrospettivo indica il 31. ANAS descrive una trave portante lesionata e un sostegno provvisorio, non la caduta dell’intero impalcato al momento dell’urto. La demolizione è successiva.", "Contemporary sources date the impact to 30 January 2023; a retrospective account gives 31 January. ANAS describes a cracked primary girder and temporary support, not a fall of the entire deck at impact. Demolition occurred later."],
  "IT23.05.02": ["Lo studio tecnico sul Ponte della Motta descrive la rottura arginale a valle, l’aumento della pendenza del flusso e l’incisione dell’alveo, con perdita di sostegno delle spalle e crollo delle campate. La classificazione sintetica S3 P202 indica erosione laterale di sponda. Le due descrizioni hanno livelli di dettaglio diversi e sono attribuite ai rispettivi lavori.", "The Ponte della Motta technical study describes downstream levee failure, increased flow gradient and bed incision, with loss of abutment support and span collapse. The summary classification in S3 P202 indicates lateral bank erosion. These accounts have different levels of detail and are attributed to their respective works."],
  "IT23.05.05": ["La perdita della spalla sinistra e della campata adiacente interrompe l’attraversamento: TC si riferisce alla campata persa, anche se la cronaca descrive il danno come parziale rispetto all’intero ponte.", "Loss of the left-bank abutment and adjacent span interrupts the crossing: TC refers to the lost span even where reporting calls the loss partial relative to the entire bridge."],
  "IT23.07.01": ["La cronaca documenta l’urto e la caduta di frammenti in calcestruzzo armato su un’automobile, senza feriti. Il codice PC non equivale a prova di caduta di una campata completa; la fonte non identifica in modo preciso l’elemento portante e l’entità della sua deformazione.", "Reporting documents the impact and reinforced-concrete fragments falling onto a car, without injuries. PC is not proof that a complete span fell; the source does not precisely identify the primary member or its deformation extent."],
  "IT23.10.01": ["Il Ponte di Ozzanello attraversa la Sporzana, non il Taro indicato in un primo titolo giornalistico. TC si riferisce alla perdita della campata e della continuità stradale; la definizione giornalistica di crollo parziale riguarda l’intero ponte.", "Ponte di Ozzanello crosses the Sporzana, not the Taro named in an early news headline. TC refers to loss of the span and road continuity; reporting of partial collapse refers to the bridge as a whole."],
  "IT23.11.01": ["L’atto comunale per La Cartaia descrive il distacco delle spallette laterali, ma non le identifica come spalle o elementi portanti principali. PC è la classificazione ARCUS, non un accertamento tecnico ricavabile da quella sola espressione. Il 2 novembre è l’inizio dell’intervallo fino al verbale del 6 novembre, non il giorno certo del danno.", "The municipal record for La Cartaia describes detachment of lateral spallette, but does not identify them as abutments or primary load-bearing members. PC is the ARCUS classification, not a technical finding established by that expression alone. 2 November starts the interval ending with the 6 November report; it is not a confirmed damage day."],
  "IT23.11.02": ["Il luogo del cedimento è distinto da quello del ritrovamento dell’automobile e delle vittime a valle. Le fonti differiscono tra territorio di Lamporecchio e Comune di Vinci; punto esatto e confine amministrativo non sono conclusivamente stabiliti.", "The failure location is distinct from the downstream location where the car and victims were found. Sources differ between Lamporecchio territory and the municipality of Vinci; the exact point and administrative boundary are not conclusively established."],
};

function uncertainTextMatches(text, subject) {
  // Match uncertainty within the same clause, not an unrelated working-history date.
  const uncertainty = /unresolved|unverified|unconfirmed|unknown|not (?:yet )?(?:established|confirmed|identified|inspected)|not been|not .*establish|remain.*provisional|require|requires|pending|to be|should be|later confirmation|da verificare|non specificat|non ricostruibile|non confermat/i;
  return text.split(/[.;\n]/).some((clause) => subject.test(clause) && uncertainty.test(clause));
}

function calendarDate(value, language, monthOnly) {
  if (!value) return language === "it" ? "non specificata" : "not specified";
  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", {
    ...(monthOnly ? {} : { day: "numeric" }), month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function buildPublicEventCopy(event, rawDescription = event.description || "") {
  const text = String(rawDescription);
  const keys = new Set();
  if (uncertainTextMatches(text, /identity|identify|identif|matching|match .*crossing|crossing represented|precise crossing|exact crossing/i)) keys.add("identity");
  if (/pending proof of distinct|finalizing identity and independence|may represent a distinct|not.*distinguish.*crossing/i.test(text)) keys.add("independence");
  if (uncertainTextMatches(text, /date|day|giorno/i) || /Date convention|conventional interval|stored .*beginning|day-level/i.test(text)) keys.add("date");
  if (event.exact_location !== true) keys.add("location");
  if (uncertainTextMatches(text, /boundary|municipality|administrative|comune|confine/i)) keys.add("boundary");
  if (uncertainTextMatches(text, /structur(?:al|e)|configuration|span arrangement|two-span|original.*system|tipologia/i)) keys.add("structure");
  if (uncertainTextMatches(text, /material|steel versus|concrete.*configuration/i)) keys.add("material");
  if (uncertainTextMatches(text, /mechanism|process|caus(?:e|al)|diagnos|meccanismo/i)) keys.add("process");
  if (/do not .*establish (?:TC|PC)|alone do not establish|not.*qualifying|qualifying.*not|primary.member.*not.*(?:establish|confirm)|(?:extent|passability).*not.*(?:establish|confirm)|not.*(?:extent|passability)|not.*complete.span|not.*severe.*(?:damage|deformation)/i.test(text)) keys.add("damage");
  if (/replacement|reconstructed|ricostruz|sostitutiv/i.test(text)) keys.add("replacement");
  if (/demolition|demolizion/i.test(text)) keys.add("demolition");
  if (/regional.*(?:death|casualt)|flood.wide|wider.*(?:death|flood)|not.*collapse fatalit|subsequent.*accident|bilancio|not.*bridge.*casualt/i.test(text)) keys.add("casualties");
  if (/court|judg|prosecut|acquitt|convict|GUP|judicial|Tribunal|sentenz|inchiesta|Procura/i.test(text)) keys.add("legal");
  if (/visual interpretation|visually supported|from.*photograph|photograph.*interpret|interpretazione.*visiv/i.test(text)) keys.add("visual");
  if (event.curation_level === "Needs review") keys.add("review");

  const notes = { it: [], en: [] };
  const specific = specificNotes[event.event_id];
  if (specific) { notes.it.push(specific[0]); notes.en.push(specific[1]); }
  for (const key of keys) { notes.it.push(noteCatalog[key][0]); notes.en.push(noteCatalog[key][1]); }
  const s3 = text.match(/S3 source attribution[^:]*:[\s\S]*?record (P\d+)/i)
    || text.match(/(?:S3|supplementary)[^.;]{0,90}\b(P\d+)\b/i);
  if (s3 && event.event_id !== "IT20.11.04") {
    notes.it.push(`La classificazione del dataset supplementare S3 di D’Angelo, Ballio e Ravazzani (2025), record ${s3[1]}, è attribuita agli autori e non costituisce una nuova misura ARCUS.`);
    notes.en.push(`The classification in supplementary dataset S3 by D’Angelo, Ballio and Ravazzani (2025), record ${s3[1]}, is attributed to its authors and is not a new ARCUS measurement.`);
  }
  if (/codes[^.]*hydraulic load|S3 overtopping/i.test(text) && event.event_id !== "IT14.11.01") {
    notes.it.push("Il carico idraulico non costituisce, da solo, evidenza di sormonto del ponte.");
    notes.en.push("Hydraulic loading alone does not establish bridge overtopping.");
    if (/S3 overtopping:\s*\?/i.test(text)) {
      notes.it.push("Il dato sul sormonto non è specificato nel supplemento.");
      notes.en.push("Overtopping is not specified in the supplement.");
    }
  }
  const interval = text.match(/documented event window ([^;]+); the stored date (\d{4}-\d{2}-\d{2})/i);
  if (interval) {
    const parts = interval[1].split(/\s[–—]\s/).map((part) => new Date(`${part} 12:00:00 GMT`));
    if (parts.length === 2 && parts.every((date) => !Number.isNaN(date.valueOf()))) {
      const dates = parts.map((date) => date.toISOString().slice(0, 10));
      notes.it.push(`Intervallo documentato: ${calendarDate(dates[0], "it", false)} – ${calendarDate(dates[1], "it", false)}. La data registrata corrisponde al primo giorno dell’intervallo.`);
      notes.en.push(`Documented interval: ${calendarDate(dates[0], "en", false)} – ${calendarDate(dates[1], "en", false)}. The recorded date is the first day of that interval.`);
    }
  }

  // Use structured, explicitly attributed summaries rather than republish the working log.
  const hasUncertainDay = keys.has("date");
  let it = localizedEventDescription({ ...event, description: "", description_it: null }, "it")
    .replace("si è verificato un", "il record descrive un")
    .replace("Il processo osservato è", "Il processo riportato è")
    .replace("La componente coinvolta è", "La componente indicata è");
  if (hasUncertainDay && event.date) it = it.replace(`In data ${calendarDate(event.date, "it", false)}`, `Nel periodo di ${calendarDate(event.date, "it", true)}`);
  const hydraulicLoadingOnly = /codes[^.]*hydraulic load|S3 overtopping:\s*(?:\?|no)/i.test(text) && !/S3 overtopping:\s*(?:si|yes)/i.test(text);
  if (hydraulicLoadingOnly) it = it.replace("Il processo riportato è sormonto o azione idrodinamica.", "Il processo riportato è il carico idraulico sulla struttura.");
  const name = localizedBridgeDisplayName(event, "en") || "the crossing";
  const en = [
    `This record concerns ${name}${event.municipality ? ` in ${event.municipality}` : ""}.`,
    `Recorded ${hasUncertainDay ? "period" : "date"}: ${calendarDate(event.date, "en", hasUncertainDay)}.`,
    `ARCUS outcome classification: ${event.collapse_severity || "not specified"}${event.component_involved === "Approach embankment" ? " (approach-embankment failure)" : ""}.`,
    `Recorded cause category: ${event.specific_cause || "not specified"}.`,
    event.failure_trigger && event.failure_trigger !== "Unspecified" ? `Reported trigger: ${event.failure_trigger}.` : "",
    event.failure_process ? `Reported process: ${hydraulicLoadingOnly && event.failure_process === "Overtopping / hydrodynamic action" ? "hydraulic loading (overtopping not established)" : event.failure_process}.` : "",
    event.component_involved ? `Reported component: ${event.component_involved}.` : "",
    `Recorded fatalities: ${event.victims ?? "not documented"}; injuries: ${event.injuries ?? "not documented"}.`,
    `Cause evidence: ${event.failure_cause_evidence || "not specified"}.`,
  ].filter(Boolean).join(" ");
  return {
    description: en,
    description_it: it,
    documentary_notes_en: [...new Set(notes.en)].join(" "),
    documentary_notes_it: [...new Set(notes.it)].join(" "),
  };
}
