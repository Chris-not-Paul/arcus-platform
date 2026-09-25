import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import { contactAddresses } from "../config/site";

import "../styles/privacy-page.css";

const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";

function RightsPage() {
  const { language } = useLanguage();
  const it = language === "it";

  const content = it
    ? {
        eyebrow: "DIRITTI E RIUSO",
        title: "Un confine chiaro tra software, dati e identità ARCUS",
        lead:
          "ARCUS rende riutilizzabile la propria release scientifica senza trasformare il codice della piattaforma, il motore Professional o il marchio in risorse liberamente replicabili.",
        updated: "Ultimo aggiornamento: 24 settembre 2026",
        ownerLabel: "Titolare del software e dell’identità",
        owner: "Christian Paolini — Italia",
        contactLabel: "Contatto per licenze e riuso",
        releaseLabel: "Release Open corrente",
        release: "arcus-open-2026.8 · CC BY 4.0",
        sections: [
          {
            title: "1. Software della piattaforma",
            paragraphs: [
              "Il codice sorgente e compilato di ARCUS, l’architettura applicativa, gli script, i componenti dell’interfaccia e il motore Professional sono protetti dal diritto d’autore e restano riservati, salvo i componenti di terze parti disciplinati dalle rispettive licenze.",
              "La consultazione del sito non concede il diritto di copiare, distribuire, sublicenziare o realizzare una piattaforma derivata dal software ARCUS. Metodologia pubblica e trasparenza scientifica non equivalgono alla concessione del codice.",
            ],
          },
          {
            title: "2. Release scientifica Open",
            paragraphs: [
              "I metadati degli eventi e le definizioni tassonomiche prodotti da ARCUS, nei limiti indicati nel manifesto della release, sono pubblicati con licenza Creative Commons Attribution 4.0 International.",
              "La licenza consente condivisione e adattamento, anche commerciale, purché siano indicati correttamente ARCUS, la versione della release, la citazione richiesta, la licenza e le modifiche effettuate. Il riuso non può suggerire approvazione, affiliazione o status ufficiale da parte di ARCUS.",
            ],
            ccLink: "Consulta la licenza CC BY 4.0",
          },
          {
            title: "3. Fonti, fotografie e materiali di terzi",
            paragraphs: [
              "Le fonti esterne collegate non vengono rilicenziate da ARCUS e rimangono soggette ai diritti e alle condizioni dei rispettivi titolari.",
              "Fotografie e altri materiali visuali mantengono la licenza o l’autorizzazione indicata nella relativa scheda. Un’autorizzazione concessa ad ARCUS non implica automaticamente il diritto di riuso da parte di terzi.",
            ],
          },
          {
            title: "4. Nome, logo e presentazione del progetto",
            paragraphs: [
              "Il nome ARCUS, il logo, gli elementi identificativi e il dominio arcusbridges.org non sono compresi nella licenza CC BY 4.0 della release dati.",
              "Non è consentito utilizzarli in modo da far apparire un prodotto, un servizio o una banca dati derivata come ufficiale, approvata o gestita da ARCUS. Le citazioni scientifiche e le attribuzioni corrette restano naturalmente consentite.",
            ],
          },
          {
            title: "5. Citazione, versioni e richieste",
            paragraphs: [
              "Ogni riuso dovrebbe riferirsi alla specifica versione della release e conservarne limiti, provenienza e informazioni di qualità. Le release successive possono avere contenuti, tassonomie o livelli di completezza differenti.",
              "Per un uso del software, del logo, delle immagini o per condizioni diverse dalla licenza dati pubblicata è necessaria un’autorizzazione separata. Le richieste possono essere inviate al contatto indicato in questa pagina.",
            ],
          },
        ],
      }
    : {
        eyebrow: "RIGHTS AND REUSE",
        title: "A clear boundary between ARCUS software, data and identity",
        lead:
          "ARCUS makes its scientific release reusable without making the platform code, Professional engine or brand freely replicable resources.",
        updated: "Last updated: 24 September 2026",
        ownerLabel: "Software and identity rights holder",
        owner: "Christian Paolini — Italy",
        contactLabel: "Licensing and reuse contact",
        releaseLabel: "Current Open release",
        release: "arcus-open-2026.8 · CC BY 4.0",
        sections: [
          {
            title: "1. Platform software",
            paragraphs: [
              "ARCUS source and compiled code, application architecture, scripts, interface components and the Professional engine are protected by copyright and remain reserved, except for third-party components governed by their own licences.",
              "Access to the website does not grant permission to copy, distribute, sublicense or create a derivative platform from ARCUS software. Public methodology and scientific transparency do not amount to a software licence.",
            ],
          },
          {
            title: "2. Open scientific release",
            paragraphs: [
              "ARCUS-authored event metadata and taxonomy definitions, within the scope stated in the release manifest, are published under the Creative Commons Attribution 4.0 International licence.",
              "The licence permits sharing and adaptation, including commercial reuse, provided ARCUS, the release version, required citation, licence and any changes are properly identified. Reuse must not imply endorsement, affiliation or official status from ARCUS.",
            ],
            ccLink: "Read the CC BY 4.0 licence",
          },
          {
            title: "3. Sources, photographs and third-party material",
            paragraphs: [
              "Linked external sources are not relicensed by ARCUS and remain subject to the rights and terms of their respective owners.",
              "Photographs and other visual material retain the licence or permission stated in the relevant record. Permission granted to ARCUS does not automatically grant third parties a right of reuse.",
            ],
          },
          {
            title: "4. Project name, logo and presentation",
            paragraphs: [
              "The ARCUS name, logo, identifiers and arcusbridges.org domain are not included in the CC BY 4.0 data-release licence.",
              "They may not be used in a way that presents a derivative product, service or database as official, endorsed or operated by ARCUS. Accurate scientific citation and attribution remain permitted.",
            ],
          },
          {
            title: "5. Citation, versions and requests",
            paragraphs: [
              "Every reuse should identify the specific release version and preserve its limitations, provenance and quality information. Later releases may differ in content, taxonomy or completeness.",
              "Use of the software, logo or images, or terms beyond the published data licence, requires separate permission. Requests may be sent to the contact shown on this page.",
            ],
          },
        ],
      };

  return (
    <main className="privacy-page" id="main-content">
      <PageMeta
        title={it ? "Diritti e riuso" : "Rights and reuse"}
        description={
          it
            ? "Confine tra software proprietario, dati ARCUS Open, materiali di terzi e identità del progetto."
            : "The boundary between proprietary software, ARCUS Open data, third-party material and project identity."
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
        <aside className="privacy-summary" aria-label={content.ownerLabel}>
          <div>
            <span>{content.ownerLabel}</span>
            <strong>{content.owner}</strong>
          </div>
          <div>
            <span>{content.contactLabel}</span>
            <a href={`mailto:${contactAddresses.research}`}>
              {contactAddresses.research}
            </a>
          </div>
          <div>
            <span>{content.releaseLabel}</span>
            <strong>{content.release}</strong>
          </div>
        </aside>

        <article className="privacy-content">
          {content.sections.map((section) => (
            <section className="privacy-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.ccLink && (
                <div className="privacy-links">
                  <a href={CC_BY_URL} rel="license noreferrer" target="_blank">
                    {section.ccLink}
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

export default RightsPage;
