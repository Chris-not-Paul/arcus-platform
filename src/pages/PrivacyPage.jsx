import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import { contactAddresses } from "../config/site";

import "../styles/privacy-page.css";

const EXTERNAL_POLICIES = {
  esri: "https://www.esri.com/en-us/privacy/privacy-statements/privacy-statement",
  garante: "https://www.garanteprivacy.it/home",
  osm: "https://osmfoundation.org/wiki/Privacy_Policy",
};

function PrivacyPage() {
  const { language } = useLanguage();
  const it = language === "it";

  const content = it
    ? {
        eyebrow: "PRIVACY E TRASPARENZA",
        title: "Informativa sul trattamento dei dati personali",
        lead:
          "Questa informativa descrive in modo concreto quali dati può trattare ARCUS Open durante la consultazione del sito, l’uso dell’Atlante e i contatti volontari via e-mail.",
        updated: "Ultimo aggiornamento: 23 settembre 2026",
        controllerLabel: "Titolare del trattamento",
        controller: "Christian Paolini — Italia",
        contactLabel: "Contatto privacy",
        scopeLabel: "Perimetro attuale",
        scope: "ARCUS Open, senza account, profilazione o pubblicità",
        sections: {
          overview: {
            title: "1. In sintesi",
            paragraphs: [
              "ARCUS è un osservatorio scientifico dedicato ai cedimenti dei ponti. La versione Open è consultabile senza registrazione e non utilizza i dati di navigazione per creare profili, inviare pubblicità o assumere decisioni automatizzate.",
              "Il trattamento è limitato ai dati tecnici necessari a rendere disponibile e proteggere il sito, alla preferenza linguistica salvata sul dispositivo e alle informazioni che l’utente sceglie di inviare via e-mail.",
            ],
          },
          data: {
            title: "2. Dati, finalità e basi giuridiche",
            rows: [
              {
                data: "Dati tecnici di navigazione",
                detail:
                  "Indirizzo IP, data e ora, risorsa richiesta, user agent ed eventuali errori possono comparire nei log tecnici del servizio di hosting.",
                purpose:
                  "Erogazione del sito, sicurezza, prevenzione degli abusi e diagnosi dei malfunzionamenti.",
                basis:
                  "Legittimo interesse del titolare alla disponibilità e sicurezza del servizio.",
              },
              {
                data: "Preferenza linguistica",
                detail:
                  "La scelta italiano/inglese è memorizzata localmente nel browser con la chiave tecnica arcus-language.",
                purpose:
                  "Mantenere la lingua scelta tra una visita e la successiva.",
                basis:
                  "Funzionalità tecnica richiesta dall’utente. La preferenza non è usata per profilazione.",
              },
              {
                data: "Comunicazioni volontarie",
                detail:
                  "Indirizzo e-mail, nome, contenuto del messaggio ed eventuali allegati inviati agli indirizzi ARCUS.",
                purpose:
                  "Rispondere alle richieste, gestire contatti scientifici ed esaminare contributi documentali o fotografici.",
                basis:
                  "Esecuzione della richiesta dell’interessato, legittimo interesse alla curatela scientifica e, quando applicabile, adempimento di obblighi di legge.",
              },
              {
                data: "Attribuzione dei contributi",
                detail:
                  "Nome, affiliazione o credito fotografico comunicati dal contributore.",
                purpose:
                  "Documentare provenienza, diritti e riconoscimento pubblico del contributo.",
                basis:
                  "Accordo con il contributore e legittimo interesse alla tracciabilità delle evidenze. La pubblicazione viene concordata durante la revisione editoriale.",
              },
            ],
            labels: {
              basis: "Base giuridica",
              purpose: "Finalità",
            },
          },
          maps: {
            title: "3. Mappe e servizi esterni",
            paragraphs: [
              "Quando viene aperto l’Atlante, il browser può richiedere tasselli cartografici a Esri e OpenStreetMap Foundation. Per completare tali richieste, i fornitori ricevono dati tecnici come l’indirizzo IP, il tipo di browser e i tasselli visualizzati. ARCUS non controlla i trattamenti autonomamente svolti da questi fornitori.",
              "L’uso delle mappe serve esclusivamente a rappresentare geograficamente i record documentati. Non viene usato da ARCUS per profilare l’utente o ricostruirne gli spostamenti.",
            ],
            links: {
              esri: "Informativa privacy Esri",
              osm: "Informativa privacy OpenStreetMap Foundation",
            },
          },
          cookies: {
            title: "4. Cookie e strumenti di tracciamento",
            paragraphs: [
              "ARCUS Open non installa cookie di profilazione, non mostra pubblicità e non integra strumenti di analisi comportamentale di prima o terza parte.",
              "La sola preferenza persistente gestita direttamente dall’applicazione è la lingua, conservata nel local storage del browser. Per questo perimetro tecnico non viene mostrato un banner di consenso. Se in futuro saranno introdotti strumenti non essenziali, questa informativa e il meccanismo di scelta saranno aggiornati prima della loro attivazione.",
            ],
          },
          sharing: {
            title: "5. Destinatari e trasferimenti",
            paragraphs: [
              "I dati possono essere trattati dai fornitori tecnici strettamente necessari al funzionamento del sito e della posta elettronica, in qualità di responsabili o titolari autonomi secondo il servizio prestato. Possono inoltre essere comunicati alle autorità quando previsto dalla legge.",
              "I servizi cartografici esterni possono comportare trattamenti nel Regno Unito, negli Stati Uniti o in altri Paesi indicati dai rispettivi fornitori. Le relative condizioni e garanzie sono descritte nelle informative collegate sopra.",
              "ARCUS non vende dati personali e non li cede per finalità pubblicitarie.",
            ],
          },
          retention: {
            title: "6. Conservazione",
            bullets: [
              "I log tecnici sono conservati per il tempo strettamente necessario alla sicurezza, alla diagnosi tecnica e agli obblighi applicabili, secondo le configurazioni del servizio di hosting.",
              "Le comunicazioni generiche sono conservate fino alla conclusione della richiesta e successivamente solo quando necessario a documentare il rapporto o adempiere obblighi di legge.",
              "I contributi scientifici, le autorizzazioni e le informazioni di provenienza possono essere conservati per tutta la durata della relativa pubblicazione e delle release collegate, per garantirne verificabilità e corretta attribuzione.",
              "La preferenza linguistica rimane sul dispositivo finché l’utente non cancella i dati del sito o modifica le impostazioni del browser.",
            ],
          },
          rights: {
            title: "7. Diritti dell’interessato",
            paragraphs: [
              "Nei casi previsti dal Regolamento (UE) 2016/679, l’interessato può chiedere accesso, rettifica, cancellazione, limitazione, portabilità o opposizione al trattamento dei propri dati. Può inoltre proporre reclamo al Garante per la protezione dei dati personali.",
              "Per esercitare i diritti o segnalare un problema è sufficiente scrivere al contatto privacy indicato in questa pagina. Potranno essere richieste le sole informazioni necessarie a verificare l’identità del richiedente.",
            ],
            authority: "Garante per la protezione dei dati personali",
          },
          records: {
            title: "8. Record scientifici e fonti collegate",
            paragraphs: [
              "La release Open descrive eventi infrastrutturali e metadati documentali. Le fonti esterne collegate restano pubblicate e disciplinate dai rispettivi editori. ARCUS non assume il controllo dei dati eventualmente presenti sui siti di origine.",
              "Richieste motivate di rettifica relative a dati personali o attribuzioni presenti direttamente in ARCUS sono valutate insieme alla documentazione disponibile, preservando tracciabilità scientifica e obblighi di legge.",
            ],
          },
          changes: {
            title: "9. Aggiornamenti",
            paragraphs: [
              "L’informativa sarà aggiornata quando cambieranno il perimetro pubblico, i fornitori o le funzionalità di ARCUS. La data riportata in apertura consente di identificare la versione applicabile.",
            ],
          },
        },
      }
    : {
        eyebrow: "PRIVACY AND TRANSPARENCY",
        title: "Privacy notice",
        lead:
          "This notice explains in practical terms which personal data ARCUS Open may process when the website and Atlas are used or when someone contacts the project voluntarily by email.",
        updated: "Last updated: 23 September 2026",
        controllerLabel: "Data controller",
        controller: "Christian Paolini — Italy",
        contactLabel: "Privacy contact",
        scopeLabel: "Current scope",
        scope: "ARCUS Open, without accounts, profiling or advertising",
        sections: {
          overview: {
            title: "1. Overview",
            paragraphs: [
              "ARCUS is a scientific observatory for bridge-collapse evidence. Its Open release can be consulted without registration and does not use browsing data to build profiles, deliver advertising or make automated decisions.",
              "Processing is limited to technical data required to deliver and protect the website, a language preference stored on the device, and information that a user chooses to send by email.",
            ],
          },
          data: {
            title: "2. Data, purposes and legal bases",
            rows: [
              {
                data: "Technical access data",
                detail:
                  "IP address, date and time, requested resource, user agent and errors may be recorded in technical hosting logs.",
                purpose:
                  "Website delivery, security, abuse prevention and troubleshooting.",
                basis:
                  "The controller’s legitimate interest in providing a secure and available service.",
              },
              {
                data: "Language preference",
                detail:
                  "The Italian/English choice is stored locally in the browser under the technical key arcus-language.",
                purpose:
                  "Remember the selected language between visits.",
                basis:
                  "A technical function requested by the user. The preference is not used for profiling.",
              },
              {
                data: "Voluntary communications",
                detail:
                  "Email address, name, message content and any attachments sent to ARCUS addresses.",
                purpose:
                  "Reply to requests, manage scientific contacts and review documentary or photographic contributions.",
                basis:
                  "Taking steps at the data subject’s request, legitimate interest in scientific curation and, where applicable, compliance with legal obligations.",
              },
              {
                data: "Contribution attribution",
                detail:
                  "Name, affiliation or photographic credit supplied by a contributor.",
                purpose:
                  "Document provenance, rights and public acknowledgement of the contribution.",
                basis:
                  "Agreement with the contributor and legitimate interest in evidence traceability. Publication is agreed during editorial review.",
              },
            ],
            labels: {
              basis: "Legal basis",
              purpose: "Purpose",
            },
          },
          maps: {
            title: "3. Maps and external services",
            paragraphs: [
              "When the Atlas is opened, the browser may request map tiles from Esri and the OpenStreetMap Foundation. To fulfil those requests, the providers receive technical data such as the IP address, browser type and tiles viewed. ARCUS does not control processing independently carried out by these providers.",
              "The maps are used solely to locate documented records. ARCUS does not use them to profile users or reconstruct their movements.",
            ],
            links: {
              esri: "Esri privacy statement",
              osm: "OpenStreetMap Foundation privacy policy",
            },
          },
          cookies: {
            title: "4. Cookies and tracking",
            paragraphs: [
              "ARCUS Open does not set profiling cookies, display advertising or integrate first- or third-party behavioural analytics.",
              "The only persistent preference managed directly by the application is the language, stored in the browser’s local storage. No consent banner is displayed for this technical scope. If non-essential tools are introduced in the future, this notice and the choice mechanism will be updated before they are enabled.",
            ],
          },
          sharing: {
            title: "5. Recipients and international processing",
            paragraphs: [
              "Data may be processed by technical suppliers strictly required to operate the website and email service, acting as processors or independent controllers according to the service. Data may also be disclosed to public authorities where required by law.",
              "External mapping services may involve processing in the United Kingdom, the United States or other countries identified by their providers. Their applicable terms and safeguards are described in the policies linked above.",
              "ARCUS does not sell personal data or disclose it for advertising.",
            ],
          },
          retention: {
            title: "6. Retention",
            bullets: [
              "Technical logs are retained only for as long as needed for security, troubleshooting and applicable obligations, according to the hosting service configuration.",
              "General correspondence is retained until the request is concluded and afterwards only when needed to document the relationship or comply with legal obligations.",
              "Scientific contributions, permissions and provenance details may be retained for the lifetime of the related publication and connected releases to preserve verification and correct attribution.",
              "The language preference remains on the device until the user clears site data or changes browser settings.",
            ],
          },
          rights: {
            title: "7. Data subject rights",
            paragraphs: [
              "Where provided by Regulation (EU) 2016/679, data subjects may request access, rectification, erasure, restriction, portability or object to the processing of their personal data. They may also lodge a complaint with the Italian Data Protection Authority.",
              "To exercise these rights or report a concern, contact the privacy address shown on this page. Only the information necessary to verify the requester’s identity may be requested.",
            ],
            authority: "Italian Data Protection Authority",
          },
          records: {
            title: "8. Scientific records and linked sources",
            paragraphs: [
              "The Open release describes infrastructure events and documentary metadata. Linked external sources remain published and governed by their respective publishers. ARCUS does not control personal data that may appear on the source websites.",
              "Reasoned correction requests concerning personal data or attribution published directly by ARCUS are reviewed against the available documentation while preserving scientific traceability and legal obligations.",
            ],
          },
          changes: {
            title: "9. Updates",
            paragraphs: [
              "This notice will be updated when ARCUS changes its public scope, suppliers or features. The date shown above identifies the applicable version.",
            ],
          },
        },
      };

  const orderedSections = [
    content.sections.overview,
    content.sections.data,
    content.sections.maps,
    content.sections.cookies,
    content.sections.sharing,
    content.sections.retention,
    content.sections.rights,
    content.sections.records,
    content.sections.changes,
  ];

  return (
    <main className="privacy-page" id="main-content">
      <PageMeta
        title={it ? "Privacy" : "Privacy"}
        description={
          it
            ? "Informativa privacy di ARCUS Open: dati tecnici, contatti, mappe esterne, conservazione e diritti."
            : "ARCUS Open privacy notice covering technical data, contacts, external maps, retention and data subject rights."
        }
      />

      <Navbar />

      <header className="privacy-hero">
        <div className="privacy-container">
          <span className="privacy-eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.lead}</p>
          <small>{content.updated}</small>
        </div>
      </header>

      <div className="privacy-container privacy-layout">
        <aside className="privacy-summary" aria-label={content.controllerLabel}>
          <div>
            <span>{content.controllerLabel}</span>
            <strong>{content.controller}</strong>
          </div>
          <div>
            <span>{content.contactLabel}</span>
            <a href={"mailto:" + contactAddresses.privacy}>
              {contactAddresses.privacy}
            </a>
          </div>
          <div>
            <span>{content.scopeLabel}</span>
            <strong>{content.scope}</strong>
          </div>
        </aside>

        <article className="privacy-content">
          {orderedSections.map((section) => (
            <section className="privacy-section" key={section.title}>
              <h2>{section.title}</h2>

              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {section.rows && (
                <div className="privacy-data-grid">
                  {section.rows.map((row) => (
                    <article key={row.data}>
                      <h3>{row.data}</h3>
                      <p>{row.detail}</p>
                      <dl>
                        <div>
                          <dt>{section.labels.purpose}</dt>
                          <dd>{row.purpose}</dd>
                        </div>
                        <div>
                          <dt>{section.labels.basis}</dt>
                          <dd>{row.basis}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}

              {section.bullets && (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}

              {section === content.sections.maps && (
                <div className="privacy-links">
                  <a href={EXTERNAL_POLICIES.osm} rel="noreferrer" target="_blank">
                    {section.links.osm}
                  </a>
                  <a href={EXTERNAL_POLICIES.esri} rel="noreferrer" target="_blank">
                    {section.links.esri}
                  </a>
                </div>
              )}

              {section === content.sections.rights && (
                <div className="privacy-links">
                  <a href={EXTERNAL_POLICIES.garante} rel="noreferrer" target="_blank">
                    {section.authority}
                  </a>
                  <a href={"mailto:" + contactAddresses.privacy}>
                    {contactAddresses.privacy}
                  </a>
                </div>
              )}
            </section>
          ))}
        </article>
      </div>

      <Footer />
    </main>
  );
}

export default PrivacyPage;
