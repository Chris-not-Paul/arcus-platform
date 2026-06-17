import { useState } from "react";
import extractYear from "../../utils/extractYear";
import { causeColors } from "../../utils/colors";
import useLanguage from "../../context/useLanguage";
import taxonomyLabel from "../../utils/taxonomyLabels";
import "./EventPopup.css";

function eventTitle(event, language) {
  if (event.bridge_name) {
    return event.bridge_name;
  }

  if (event.bridge_crossing_name) {
    return language === "it"
      ? event.bridge_crossing_name
      : `${event.bridge_crossing_name} Bridge`;
  }

  if (event.structural_type) {
    const type = taxonomyLabel(
      "structuralType",
      event.structural_type,
      language
    );

    return language === "it"
      ? type
      : `${type} Bridge`;
  }

  return language === "it"
    ? `Ponte - ${event.municipality}`
    : `${event.municipality} Bridge`;
}

function sourceHost(source) {
  if (source.source_type) {
    return source.source_type;
  }

  try {
    return new URL(source.source_url).hostname
      .replace(/^www\./, "")
      .toUpperCase();
  } catch {
    return "SOURCE";
  }
}

function EventPopup({
  atlasMode = "open",
  event,
  hazardProfile = null,
  professionalMode = false,
  reliability = null,
  relatedSources = [],
  vulnerability = null,
}) {
  const { language } = useLanguage();
  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);
  const it = language === "it";

  const text = {
    built: it ? "Costruito" : "Built",
    collapse: it ? "Collasso" : "Collapse",
    crossing: it ? "Attraversamento" : "Crossing",
    description: it ? "Descrizione evento" : "Event Description",
    eventDriven: it ? "Evento innescato" : "Event-driven",
    fatalities: it ? "Vittime" : "Fatalities",
    infrastructureUse: it ? "Uso infrastrutturale" : "Infrastructure Use",
    material: it ? "Materiale" : "Material",
    na: it ? "N/D" : "N/A",
    noSources: it
      ? "Nessuna fonte collegata a questo evento nel dataset corrente."
      : "No source is linked to this event in the current dataset.",
    partial: it ? "Parziale" : "Partial",
    priorityEvent: it ? "Evento prioritario" : "Priority event",
    progressive: it ? "Progressivo" : "Progressive",
    professionalLayer:
      atlasMode === "enterprise"
        ? it
          ? "Layer Enterprise"
          : "Enterprise layer"
        : it
          ? "Layer Professional"
          : "Professional layer",
    readMore: it ? "Leggi di piu" : "Read more",
    reliability: it ? "Affidabilita" : "Reliability",
    riskReading: it ? "Lettura rischio" : "Risk reading",
    showLess: it ? "Riduci" : "Show less",
    sources: it ? "Fonti" : "Sources",
    documented: it ? "documentate" : "documented",
    structuralType: it ? "Tipologia strutturale" : "Structural Type",
    total: it ? "Totale" : "Total",
    vulnerabilityClass: it ? "Classe vulnerabilita" : "Vulnerability class",
  };

  const collapseYear = extractYear(event.date);
  const isTotalCollapse =
    event.collapse_severity === "TC";

  const material = taxonomyLabel(
    "material",
    event.material_type,
    language
  );
  const cause = taxonomyLabel(
    "cause",
    event.specific_cause,
    language
  );
  const sourceCount = relatedSources.length;
  const title = eventTitle(event, language);
  const descriptionText = String(
    event.description || ""
  );
  const descriptionLimit = 230;
  const hasLongDescription =
    descriptionText.length > descriptionLimit;
  const visibleDescription =
    hasLongDescription && !descriptionExpanded
      ? `${descriptionText.slice(0, descriptionLimit).trim()}...`
      : descriptionText;

  const profileItems = [
    {
      label: text.structuralType,
      value: taxonomyLabel(
        "structuralType",
        event.structural_type,
        language
      ),
    },
    {
      label: text.infrastructureUse,
      value: taxonomyLabel(
        "use",
        event.destination_use,
        language
      ),
    },
    {
      label: text.crossing,
      value: event.bridge_crossing_name,
    },
  ].filter((item) => item.value);

  const hazardLabel =
    hazardProfile?.public_dominant_hazard_label
      ? taxonomyLabel(
          "cause",
          hazardProfile.public_dominant_hazard_label,
          language
        )
      : text.na;

  return (
    <article
      className={`arcus-event-card ${
        professionalMode ? "is-professional" : ""
      }`}
    >
      {professionalMode && (
        <header className="arcus-event-layerbar">
          <span>{text.professionalLayer}</span>
          <span>Ref. {event.event_id}</span>
        </header>
      )}

      <section className="arcus-event-header">
        <div className="arcus-event-taxonomy">
          <span
            className="arcus-event-taxonomy-dot"
            style={{
              "--event-cause-color":
                causeColors[event.specific_cause] ||
                "#c65345",
            }}
            aria-hidden="true"
          />
          {material && <span>{material}</span>}
          {material && cause && (
            <span aria-hidden="true">&middot;</span>
          )}
          {cause && <span>{cause}</span>}
        </div>

        <h2>{title}</h2>

        <p className="arcus-event-location">
          {event.municipality || event.province || text.na}
          {event.region ? `, ${event.region}` : ""}
          {collapseYear ? ` - ${collapseYear}` : ""}
        </p>
      </section>

      <section className="arcus-event-stat-grid">
        <div>
          <span>{text.collapse}</span>
          <strong
            className={
              isTotalCollapse
                ? "semantic-critical"
                : "semantic-high"
            }
          >
            {isTotalCollapse ? text.total : text.partial}
          </strong>
        </div>
        <div>
          <span>{text.fatalities}</span>
          <strong>{event.victims ?? 0}</strong>
        </div>
        <div>
          <span>{text.built}</span>
          <strong>{event.construction_year || text.na}</strong>
        </div>
      </section>

      {professionalMode && (
        <section className="arcus-event-risk">
          <span>{text.riskReading}</span>

          <div className="arcus-event-risk-grid">
            <div>
              <small>{text.vulnerabilityClass}</small>
              <strong className="semantic-critical">
                {vulnerability?.class || text.na}
              </strong>
            </div>
            <div>
              <small>{text.reliability}</small>
              <strong className="steel">
                {reliability?.grade
                  ? `${reliability.grade} evidence`
                  : text.na}
              </strong>
            </div>
          </div>

          <div className="arcus-event-priority">
            <span>
              {text.priorityEvent} - {event.event_id}
            </span>
            <strong>
              {vulnerability?.score ?? text.na}
              {vulnerability?.score ? <sup>/100</sup> : null}
            </strong>
          </div>
        </section>
      )}

      {profileItems.length > 0 && (
        <section className="arcus-event-profile">
          {profileItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}

          {professionalMode && (
            <div>
              <span>{it ? "Hazard dominante" : "Dominant hazard"}</span>
              <strong>{hazardLabel}</strong>
            </div>
          )}
        </section>
      )}

      {event.description && (
        <section className="arcus-event-description">
          <span>{text.description}</span>
          <p>{visibleDescription}</p>
          {hasLongDescription && (
            <button
              className="arcus-event-description-toggle"
              type="button"
              onClick={() =>
                setDescriptionExpanded((value) => !value)
              }
            >
              {descriptionExpanded
                ? text.showLess
                : text.readMore}{" "}
              {"->"}
            </button>
          )}
        </section>
      )}

      <section className="arcus-event-sources">
        <div className="arcus-event-sources-label">
          <span>{text.sources}</span>
          <span aria-hidden="true">&middot;</span>
          <span>
            {sourceCount} {text.documented}
          </span>
        </div>

        {sourceCount > 0 ? (
          <div className="arcus-event-source-list">
            {relatedSources.map((source) => {
              const content = (
                <>
                  <span className="arcus-event-source-title">
                    {source.source_title || source.source_url}
                  </span>
                  <span className="arcus-event-source-meta">
                    <strong>{sourceHost(source)}</strong>
                    <span aria-hidden="true">&middot;</span>
                    <span>{source.source_role || "Source"}</span>
                  </span>
                  <span
                    className="arcus-event-source-arrow"
                    aria-hidden="true"
                  >
                    {"->"}
                  </span>
                </>
              );

              return source.source_url ? (
                <a
                  className="arcus-event-source-row"
                  href={source.source_url}
                  key={source.source_id || source.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {content}
                </a>
              ) : (
                <div
                  className="arcus-event-source-row is-static"
                  key={source.source_id || source.source_title}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="arcus-event-no-sources">
            {text.noSources}
          </p>
        )}
      </section>
    </article>
  );
}

export default EventPopup;
