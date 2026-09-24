import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  contactAddresses,
  contributionFormEnabled,
} from "../config/site";
import {
  contributionAcknowledgements,
  getExpertContributionStatus,
  submitExpertContribution,
} from "#arcus-contribution-client";
import { openEvents } from "../utils/apiClient";

import "../styles/contribute-page.css";

const emptyForm = {
  affiliation: "", bridgeName: "", contributionTypes: [], creditPreference: "public",
  email: "", evidenceBasis: "published_source", eventDate: "", eventId: "", expertRole: "",
  latitude: "", longitude: "", name: "", orcid: "", place: "", sources: [""], summary: "",
  sourceAvailability: "online", targetType: "existing_event", termsAccepted: false, website: "",
  documentSource: { accessBasis: "reference_only", date: "", documentType: "", issuer: "", pages: "", reference: "", title: "" },
};

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ContributePage() {
  const { language } = useLanguage();
  const it = language === "it";
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [attachment, setAttachment] = useState(null);
  const [documentAttachment, setDocumentAttachment] = useState(null);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [status, setStatus] = useState("idle");
  const [receipt, setReceipt] = useState(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!contributionFormEnabled) return undefined;

    openEvents().then(setEvents).catch(() => setEvents([]));
    contributionAcknowledgements().then(setAcknowledgements).catch(() => setAcknowledgements([]));
  }, []);

  const eventOptions = useMemo(() => events.map((event) => ({
    id: event.id || event.event_id || event.arcus_id,
    label: event.bridge_name || event.name || event.title || event.location || "",
  })).filter((event) => event.id).sort((a, b) => a.id.localeCompare(b.id)), [events]);

  const toggleType = (value) => set("contributionTypes", form.contributionTypes.includes(value)
    ? form.contributionTypes.filter((item) => item !== value)
    : [...form.contributionTypes, value]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { setAttachment(null); return; }
    if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      event.target.value = "";
      setStatus("file_error");
      return;
    }
    setAttachment({ caption: "", creator: "", creditLine: "", dataUrl: await fileAsDataUrl(file), filename: file.name, rightsBasis: "", sourceUrl: "" });
    setStatus("idle");
  };

  const handleDocumentFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { setDocumentAttachment(null); return; }
    if (file.size > 10 * 1024 * 1024 || file.type !== "application/pdf") {
      event.target.value = "";
      setStatus("document_error");
      return;
    }
    setDocumentAttachment({ dataUrl: await fileAsDataUrl(file), filename: file.name, rightsConfirmed: false });
    setStatus("idle");
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("submitting");
    try {
      const contribution = await submitExpertContribution({ ...form, attachment, documentAttachment });
      setReceipt(contribution);
      setLookupId(contribution.id);
      setForm(emptyForm);
      setAttachment(null);
      setDocumentAttachment(null);
      event.currentTarget.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  const checkStatus = async (event) => {
    event.preventDefault();
    try {
      setLookupResult(await getExpertContributionStatus(lookupId.trim()));
    } catch {
      setLookupResult({ status: "not_found" });
    }
  };

  const types = [
    ["factual_correction", it ? "Correzione fattuale" : "Factual correction"],
    ["new_source", it ? "Nuova fonte" : "New source"],
    ["technical_context", it ? "Contesto tecnico documentato" : "Documented technical context"],
    ["missing_event", it ? "Evento mancante" : "Missing event"],
    ["photo_media", it ? "Fotografia o media" : "Photo or media"],
  ];

  if (!contributionFormEnabled) {
    const contributionSubject = encodeURIComponent(
      it ? "Proposta di contributo ARCUS" : "ARCUS evidence contribution"
    );

    return (
      <main className="contribute-page" id="main-content">
        <PageMeta
          title={it ? "Contribuisci ad ARCUS" : "Contribute to ARCUS"}
          description={it
            ? "Invia evidenze documentate, correzioni e fonti al centro editoriale ARCUS."
            : "Send documented evidence, corrections and sources to the ARCUS editorial centre."}
        />
        <Navbar />

        <header className="contribute-hero">
          <div className="contribute-shell">
            <span>ARCUS EVIDENCE CONTRIBUTION</span>
            <h1>{it ? "L’archivio cresce attraverso evidenze verificabili." : "The archive grows through verifiable evidence."}</h1>
            <p>{it ? "Ricercatori, professionisti, enti e testimoni qualificati possono proporre correzioni, nuove fonti, eventi mancanti e immagini. Nessun contenuto viene pubblicato automaticamente." : "Researchers, practitioners, institutions and qualified witnesses may propose corrections, new sources, missing events and images. Nothing is published automatically."}</p>
          </div>
        </header>

        <section className="contribute-process contribute-shell" aria-label={it ? "Processo editoriale" : "Editorial process"}>
          {[
            ["01", it ? "Invio documentato" : "Documented submission", it ? "Identifica il record ARCUS oppure descrivi chiaramente l’evento mancante." : "Identify the ARCUS record or clearly describe the missing event."],
            ["02", it ? "Verifica" : "Verification", it ? "ARCUS controlla identità, provenienza, coerenza e diritti." : "ARCUS checks identity, provenance, consistency and rights."],
            ["03", it ? "Decisione motivata" : "Reasoned decision", it ? "La proposta può richiedere chiarimenti, essere accettata o respinta." : "The proposal may need clarification, be accepted or rejected."],
            ["04", it ? "Release e credito" : "Release and credit", it ? "Gli elementi accettati entrano in una release versionata con il credito concordato." : "Accepted evidence enters a versioned release with agreed credit."],
          ].map(([number, title, text]) => (
            <article key={number}>
              <span>{number}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="contribute-email contribute-shell">
          <div>
            <span>{it ? "CANALE EDITORIALE" : "EDITORIAL CHANNEL"}</span>
            <h2>{it ? "Invia la proposta al centro ARCUS." : "Send your proposal to the ARCUS centre."}</h2>
            <p>{it ? "Durante la release Open iniziale, i contributi vengono acquisiti tramite email e revisionati manualmente. Inserisci nel messaggio soltanto informazioni che sei autorizzato a condividere." : "During the initial Open release, contributions are received by email and reviewed manually. Include only information you are authorised to share."}</p>
            <a href={`mailto:${contactAddresses.contributions}?subject=${contributionSubject}`}>
              {contactAddresses.contributions}
            </a>
            <p className="contribute-privacy-note">
              {it
                ? "Prima dell’invio, consulta come ARCUS tratta i dati contenuti nei messaggi e negli allegati."
                : "Before sending, review how ARCUS handles data contained in messages and attachments."}{" "}
              <Link to="/privacy">{it ? "Informativa privacy" : "Privacy notice"}</Link>
            </p>
          </div>
          <aside>
            <strong>{it ? "Cosa includere" : "What to include"}</strong>
            <ul>
              <li>{it ? "ID ARCUS, nome del ponte o località" : "ARCUS ID, bridge name or location"}</li>
              <li>{it ? "Correzione o informazione proposta" : "Proposed correction or information"}</li>
              <li>{it ? "Fonte verificabile o riferimento del documento" : "Verifiable source or document reference"}</li>
              <li>{it ? "Autore, credito e diritti per fotografie" : "Creator, credit and rights for photographs"}</li>
              <li>{it ? "Nome, ruolo e affiliazione, se si desidera il riconoscimento" : "Name, role and affiliation if acknowledgement is requested"}</li>
            </ul>
            <div className="contribute-editorial-boundary">
              <div>
                <span>{it ? "Contributi appropriati" : "Suitable contributions"}</span>
                <p>{it ? "Correzioni verificabili, fonti, documenti, contesto tecnico, eventi mancanti e immagini con diritti chiariti." : "Verifiable corrections, sources, documents, technical context, missing events and images with clarified rights."}</p>
              </div>
              <div>
                <span>{it ? "Non inviare" : "Do not send"}</span>
                <p>{it ? "Dati personali non necessari, materiale riservato senza autorizzazione, opinioni prive di riscontro o richieste di certificazione della sicurezza." : "Unnecessary personal data, confidential material without permission, unsupported opinions or requests for safety certification."}</p>
              </div>
            </div>
          </aside>
        </section>

        <Footer />
      </main>
    );
  }

  return (
    <main className="contribute-page" id="main-content">
      <PageMeta title={it ? "Contribuisci ad ARCUS" : "Contribute to ARCUS"} description={it ? "Contributi esperti documentati per migliorare l'archivio ARCUS." : "Documented expert contributions to improve the ARCUS archive."} />
      <Navbar />

      <header className="contribute-hero">
        <div className="contribute-shell">
          <span>ARCUS EVIDENCE CONTRIBUTION</span>
          <h1>{it ? "L’archivio cresce attraverso evidenze verificabili." : "The archive grows through verifiable evidence."}</h1>
          <p>{it ? "Ricercatori, professionisti, enti e testimoni qualificati possono segnalare correzioni, nuove fonti, eventi mancanti e immagini. Ogni proposta entra in revisione editoriale: nessun contenuto viene pubblicato automaticamente." : "Researchers, practitioners, institutions and qualified witnesses may propose corrections, sources, missing events and images. Every submission enters editorial review; nothing is published automatically."}</p>
        </div>
      </header>

      <section className="contribute-process contribute-shell" aria-label={it ? "Processo editoriale" : "Editorial process"}>
        {[
          ["01", it ? "Invio tracciato" : "Traceable submission", it ? "Ricevi un ID univoco per la proposta." : "Receive a unique submission ID."],
          ["02", it ? "Verifica" : "Verification", it ? "ARCUS controlla identità dell’evento, fonti, coerenza e diritti." : "ARCUS checks event identity, sources, consistency and rights."],
          ["03", it ? "Decisione motivata" : "Reasoned decision", it ? "La proposta può richiedere chiarimenti, essere accettata o respinta." : "The proposal may need clarification, be accepted or rejected."],
          ["04", it ? "Release e credito" : "Release and credit", it ? "Gli elementi accettati entrano in una release versionata con credito concordato." : "Accepted evidence enters a versioned release with agreed credit."],
        ].map(([number, title, text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}
      </section>

      <section className="contribute-recognition contribute-shell">
        <div>
          <span>{it ? "VALORE PER CHI CONTRIBUISCE" : "VALUE FOR CONTRIBUTORS"}</span>
          <h2>{it ? "Un contributo riconoscibile, citabile e utile." : "A recognisable, citable and useful contribution."}</h2>
        </div>
        <ul>
          <li>{it ? "ID stabile della proposta e tracciabilità editoriale" : "Stable submission ID and editorial traceability"}</li>
          <li>{it ? "Credito con nome, affiliazione e ORCID nelle release, se desiderato" : "Name, affiliation and ORCID credit in releases, if requested"}</li>
          <li>{it ? "Riconoscimento pubblico solo dopo accettazione e consenso" : "Public acknowledgement only after acceptance and consent"}</li>
          <li>{it ? "Possibilità di correggere o integrare il record nel tempo" : "Ability to correct or extend the record over time"}</li>
        </ul>
        {acknowledgements.length > 0 && <div className="contribute-acknowledgements">
          <p>{it ? `${acknowledgements.length} contributi esperti già riconosciuti nelle release ARCUS.` : `${acknowledgements.length} expert contributions already acknowledged in ARCUS releases.`}</p>
          {acknowledgements.slice(0, 8).map((item) => <span key={item.id}>{item.name}{item.affiliation ? ` · ${item.affiliation}` : ""}{item.orcid ? <a href={`https://orcid.org/${encodeURIComponent(item.orcid)}`} rel="noreferrer" target="_blank">ORCID</a> : null}</span>)}
        </div>}
      </section>

      <section className="contribute-status contribute-shell">
        <div><span>{it ? "SEGUI LA PROPOSTA" : "TRACK A SUBMISSION"}</span><p>{it ? "L’ID consente di verificare lo stato senza esporre contenuto, email o note editoriali." : "The ID checks status without exposing content, email or editorial notes."}</p></div>
        <form onSubmit={checkStatus}><input aria-label={it ? "ID contributo" : "Contribution ID"} onChange={(event) => setLookupId(event.target.value)} placeholder="contribution-…" required value={lookupId} /><button type="submit">{it ? "Verifica stato" : "Check status"}</button></form>
        {lookupResult && <strong>{lookupResult.status === "not_found" ? (it ? "ID non trovato" : "ID not found") : `${it ? "Stato" : "Status"}: ${lookupResult.status}`}</strong>}
      </section>

      <section className="contribute-layout contribute-shell">
        <aside>
          <span>{it ? "PATTO EDITORIALE" : "EDITORIAL COMMITMENT"}</span>
          <h2>{it ? "Partecipazione, senza rinunciare al rigore." : "Participation without giving up rigour."}</h2>
          <p>{it ? "Il contributo non equivale a validazione scientifica. ARCUS conserva la provenienza, distingue fatti e interpretazioni, può chiedere documenti aggiuntivi e registra le modifiche nelle release." : "A contribution is not scientific validation. ARCUS preserves provenance, separates facts from interpretations, may request further documentation and records changes in releases."}</p>
          <ul>
            <li>{it ? "Fonti primarie o verificabili preferite" : "Primary or verifiable sources preferred"}</li>
            <li>{it ? "Immagini solo con autore, credito e base giuridica" : "Images require creator, credit and rights basis"}</li>
            <li>{it ? "Massimo 5 MB; JPG, PNG o WebP" : "Maximum 5 MB; JPG, PNG or WebP"}</li>
            <li>{it ? "Dati sensibili e accuse personali non sono accettati" : "Sensitive data and personal allegations are not accepted"}</li>
          </ul>
        </aside>

        <form className="contribute-form" onSubmit={submit}>
          <fieldset>
            <legend>1 — {it ? "Chi contribuisce" : "Contributor"}</legend>
            <div className="contribute-grid two">
              <label><span>{it ? "Nome" : "Name"}</span><input required value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
              <label><span>Email</span><input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
              <label><span>{it ? "Affiliazione" : "Affiliation"}</span><input value={form.affiliation} onChange={(e) => set("affiliation", e.target.value)} /></label>
              <label><span>{it ? "Ruolo / competenza" : "Role / expertise"}</span><input value={form.expertRole} onChange={(e) => set("expertRole", e.target.value)} /></label>
              <label><span>ORCID ({it ? "facoltativo" : "optional"})</span><input value={form.orcid} onChange={(e) => set("orcid", e.target.value)} placeholder="0000-0000-0000-0000" /></label>
              <label><span>{it ? "Credito" : "Credit"}</span><select value={form.creditPreference} onChange={(e) => set("creditPreference", e.target.value)}><option value="public">{it ? "Pubblico, se accettato" : "Public if accepted"}</option><option value="anonymous">{it ? "Anonimo" : "Anonymous"}</option></select></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>2 — {it ? "Ponte o evento" : "Bridge or event"}</legend>
            <div className="contribute-choice">
              <label><input checked={form.targetType === "existing_event"} name="target" onChange={() => set("targetType", "existing_event")} type="radio" /> {it ? "Evento ARCUS esistente" : "Existing ARCUS event"}</label>
              <label><input checked={form.targetType === "missing_event"} name="target" onChange={() => set("targetType", "missing_event")} type="radio" /> {it ? "Evento non presente" : "Missing event"}</label>
            </div>
            {form.targetType === "existing_event" ? (
              <label><span>ID ARCUS</span><select required value={form.eventId} onChange={(e) => set("eventId", e.target.value)}><option value="">{it ? "Seleziona l’evento" : "Select event"}</option>{eventOptions.map((item) => <option key={item.id} value={item.id}>{item.id}{item.label ? ` — ${item.label}` : ""}</option>)}</select></label>
            ) : (
              <div className="contribute-grid two">
                <label><span>{it ? "Nome del ponte" : "Bridge name"}</span><input required value={form.bridgeName} onChange={(e) => set("bridgeName", e.target.value)} /></label>
                <label><span>{it ? "Comune / Provincia" : "Municipality / Province"}</span><input required value={form.place} onChange={(e) => set("place", e.target.value)} /></label>
                <label><span>{it ? "Data dell’evento" : "Event date"}</span><input value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} /></label>
                <label><span>{it ? "Coordinate (facoltative)" : "Coordinates (optional)"}</span><div className="contribute-coordinates"><input aria-label="Latitude" placeholder="Lat" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} /><input aria-label="Longitude" placeholder="Lon" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} /></div></label>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend>3 — {it ? "Evidenza proposta" : "Proposed evidence"}</legend>
            <div className="contribute-tags">{types.map(([value, label]) => <label key={value}><input checked={form.contributionTypes.includes(value)} onChange={() => toggleType(value)} type="checkbox" />{label}</label>)}</div>
            <label><span>{it ? "Base della conoscenza" : "Evidence basis"}</span><select value={form.evidenceBasis} onChange={(e) => set("evidenceBasis", e.target.value)}><option value="published_source">{it ? "Fonte pubblicata" : "Published source"}</option><option value="professional_knowledge">{it ? "Conoscenza professionale diretta" : "Direct professional knowledge"}</option><option value="eyewitness">{it ? "Testimonianza diretta" : "Eyewitness account"}</option><option value="archival_research">{it ? "Ricerca d’archivio" : "Archival research"}</option><option value="other">{it ? "Altro" : "Other"}</option></select></label>
            <label><span>{it ? "Informazione, correzione o contesto" : "Information, correction or context"}</span><textarea minLength="40" required rows="7" value={form.summary} onChange={(e) => set("summary", e.target.value)} /></label>
            <label><span>{it ? "Disponibilità della fonte" : "Source availability"}</span><select value={form.sourceAvailability} onChange={(e) => set("sourceAvailability", e.target.value)}><option value="online">{it ? "Disponibile online" : "Available online"}</option><option value="offline_document">{it ? "Documento non disponibile online" : "Document not available online"}</option><option value="mixed">{it ? "Fonti online e documenti privati" : "Online and private documents"}</option></select></label>
            {form.sourceAvailability !== "offline_document" && <label><span>{it ? "Fonte principale (URL)" : "Primary source (URL)"}</span><input type="url" value={form.sources[0]} onChange={(e) => set("sources", [e.target.value])} placeholder="https://" /></label>}
            {form.sourceAvailability !== "online" && <div className="contribute-document-source">
              <p>{it ? "Descrivi il documento anche se non puoi caricarlo: una citazione verificabile è più utile di un file privo di provenienza." : "Describe the document even if it cannot be uploaded: a verifiable citation is more useful than a file without provenance."}</p>
              <div className="contribute-grid two">
                <label><span>{it ? "Titolo del documento" : "Document title"}</span><input required value={form.documentSource.title} onChange={(e) => set("documentSource", { ...form.documentSource, title: e.target.value })} /></label>
                <label><span>{it ? "Autore / ente emittente" : "Author / issuing body"}</span><input required value={form.documentSource.issuer} onChange={(e) => set("documentSource", { ...form.documentSource, issuer: e.target.value })} /></label>
                <label><span>{it ? "Tipo di documento" : "Document type"}</span><select required value={form.documentSource.documentType} onChange={(e) => set("documentSource", { ...form.documentSource, documentType: e.target.value })}><option value="">—</option><option value="technical_report">{it ? "Relazione tecnica / perizia" : "Technical report / expert assessment"}</option><option value="inspection_report">{it ? "Verbale o rapporto di ispezione" : "Inspection report"}</option><option value="project_document">{it ? "Elaborato progettuale" : "Design document"}</option><option value="archive_record">{it ? "Documento d’archivio" : "Archive record"}</option><option value="publication">{it ? "Pubblicazione non digitalizzata" : "Non-digitised publication"}</option><option value="other">{it ? "Altro" : "Other"}</option></select></label>
                <label><span>{it ? "Data / anno" : "Date / year"}</span><input value={form.documentSource.date} onChange={(e) => set("documentSource", { ...form.documentSource, date: e.target.value })} /></label>
                <label><span>{it ? "Pagine o sezione rilevante" : "Relevant pages or section"}</span><input value={form.documentSource.pages} onChange={(e) => set("documentSource", { ...form.documentSource, pages: e.target.value })} /></label>
                <label><span>{it ? "Segnatura / riferimento archivistico" : "Archive reference"}</span><input value={form.documentSource.reference} onChange={(e) => set("documentSource", { ...form.documentSource, reference: e.target.value })} /></label>
                <label className="wide"><span>{it ? "Modalità di verifica" : "Verification access"}</span><select value={form.documentSource.accessBasis} onChange={(e) => set("documentSource", { ...form.documentSource, accessBasis: e.target.value })}><option value="reference_only">{it ? "Posso fornire solo il riferimento" : "Reference only"}</option><option value="inspection_on_request">{it ? "Consultabile su richiesta" : "Available for inspection on request"}</option><option value="share_copy">{it ? "Posso condividere una copia privata" : "Private copy can be shared"}</option></select></label>
              </div>
              <label><span>{it ? "PDF privato facoltativo, massimo 10 MB" : "Optional private PDF, maximum 10 MB"}</span><input accept="application/pdf" onChange={handleDocumentFile} type="file" /></label>
              {documentAttachment && <label className="contribute-consent compact"><input required checked={documentAttachment.rightsConfirmed} onChange={(e) => setDocumentAttachment({ ...documentAttachment, rightsConfirmed: e.target.checked })} type="checkbox" /><span>{it ? "Confermo di poter condividere questa copia privatamente con il centro editoriale ARCUS. Il file non sarà pubblicato senza una successiva autorizzazione esplicita." : "I confirm that I may share this copy privately with the ARCUS editorial centre. It will not be published without further explicit permission."}</span></label>}
            </div>}
          </fieldset>

          <fieldset>
            <legend>4 — {it ? "Immagine e diritti (facoltativo)" : "Image and rights (optional)"}</legend>
            <label><span>{it ? "File immagine" : "Image file"}</span><input accept="image/jpeg,image/png,image/webp" onChange={handleFile} type="file" /></label>
            {attachment && <div className="contribute-grid two">
              <label><span>{it ? "Autore / creatore" : "Creator"}</span><input required value={attachment.creator} onChange={(e) => setAttachment({ ...attachment, creator: e.target.value })} /></label>
              <label><span>{it ? "Riga di credito" : "Credit line"}</span><input required value={attachment.creditLine} onChange={(e) => setAttachment({ ...attachment, creditLine: e.target.value })} /></label>
              <label><span>{it ? "Licenza o titolarità" : "Licence or rights basis"}</span><select required value={attachment.rightsBasis} onChange={(e) => setAttachment({ ...attachment, rightsBasis: e.target.value })}><option value="">—</option><option value="own_work">{it ? "Opera propria; autorizzo ARCUS" : "Own work; ARCUS authorised"}</option><option value="cc_by">Creative Commons CC BY</option><option value="cc_by_sa">Creative Commons CC BY-SA</option><option value="public_domain">{it ? "Pubblico dominio" : "Public domain"}</option><option value="institutional_permission">{it ? "Permesso istituzionale documentato" : "Documented institutional permission"}</option></select></label>
              <label><span>{it ? "URL originale" : "Original URL"}</span><input type="url" value={attachment.sourceUrl} onChange={(e) => setAttachment({ ...attachment, sourceUrl: e.target.value })} /></label>
              <label className="wide"><span>{it ? "Didascalia" : "Caption"}</span><input value={attachment.caption} onChange={(e) => setAttachment({ ...attachment, caption: e.target.value })} /></label>
            </div>}
          </fieldset>

          <label className="contribute-consent"><input required checked={form.termsAccepted} onChange={(e) => set("termsAccepted", e.target.checked)} type="checkbox" /><span>{it ? "Confermo l’accuratezza in buona fede, il diritto a condividere i materiali e accetto la revisione editoriale ARCUS. L’invio non garantisce pubblicazione." : "I confirm good-faith accuracy, the right to share the material and accept ARCUS editorial review. Submission does not guarantee publication."}</span></label>
          <input aria-hidden="true" autoComplete="off" className="contribute-honeypot" tabIndex="-1" value={form.website} onChange={(e) => set("website", e.target.value)} />
          {status === "file_error" && <p className="contribute-message error">{it ? "Immagine non valida: usa JPG, PNG o WebP fino a 5 MB." : "Invalid image: use JPG, PNG or WebP up to 5 MB."}</p>}
          {status === "document_error" && <p className="contribute-message error">{it ? "Documento non valido: usa un PDF fino a 10 MB." : "Invalid document: use a PDF up to 10 MB."}</p>}
          {status === "error" && <p className="contribute-message error">{it ? "Invio non riuscito. Controlla i campi, le fonti e i diritti dell’immagine." : "Submission failed. Check fields, sources and image rights."}</p>}
          {status === "success" && <p className="contribute-message success">{it ? `Proposta ricevuta. Conserva l’ID ${receipt?.id}.` : `Submission received. Keep ID ${receipt?.id}.`}</p>}
          <button className="contribute-submit" disabled={status === "submitting"} type="submit">{status === "submitting" ? (it ? "Invio in corso…" : "Submitting…") : (it ? "Invia alla revisione ARCUS" : "Submit for ARCUS review")}</button>
        </form>
      </section>
      <Footer />
    </main>
  );
}
