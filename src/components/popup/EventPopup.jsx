import extractYear from "../../utils/extractYear";

import { causeColors } from "../../utils/colors";
import useLanguage from "../../context/useLanguage";
import taxonomyLabel from "../../utils/taxonomyLabels";

function EventPopup({
  event,
  relatedSources,
}) {
  const { language } = useLanguage();

  const text = {
    built: language === "it" ? "Costruito" : "Built",
    collapse:
      language === "it" ? "Collasso" : "Collapse",
    crossing:
      language === "it" ? "Attraversamento" : "Crossing",
    eventDescription:
      language === "it"
        ? "Descrizione evento"
        : "Event Description",
    eventDriven:
      language === "it"
        ? "Evento innescato"
        : "Event-driven",
    fatalities:
      language === "it" ? "Vittime" : "Fatalities",
    infrastructureAge:
      language === "it"
        ? "Eta infrastruttura"
        : "Infrastructure Age",
    infrastructureProfile:
      language === "it"
        ? "Profilo infrastrutturale"
        : "Infrastructure Profile",
    infrastructureUse:
      language === "it"
        ? "Uso infrastrutturale"
        : "Infrastructure Use",
    na: language === "it" ? "N/D" : "N/A",
    partial:
      language === "it" ? "Parziale" : "Partial",
    progressive:
      language === "it" ? "Progressivo" : "Progressive",
    sources: language === "it" ? "Fonti" : "Sources",
    structuralType:
      language === "it"
        ? "Tipologia strutturale"
        : "Structural Type",
    total: language === "it" ? "Totale" : "Total",
    years: language === "it" ? "anni" : "years",
  };


  const collapseYear =
    extractYear(event.date);

  const infrastructureAge =
    collapseYear &&
    event.construction_year
      ? collapseYear -
        Number(
          event.construction_year
        )
      : null;

  const isTotalCollapse =
    event.collapse_severity ===
    "TC";

  return (
    <div
      style={{
        minWidth: "320px",
        maxWidth: "360px",
        maxHeight: "72vh",
        overflowY: "auto",
        paddingRight: "6px",
        fontFamily:
          "system-ui, sans-serif",
      }}
    >

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "22px",
        }}
      >

        {/* TAGS */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "16px",
          }}
        >

          {/* CAUSE */}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "999px",

              background:
                causeColors[
                  event.specific_cause
                ] || "#3f6b78",

              color: "white",

              fontSize: "11px",
              fontWeight: 800,

              letterSpacing:
                "1px",

              textTransform:
                "uppercase",
            }}
          >
            {taxonomyLabel(
              "cause",
              event.specific_cause,
              language
            )}
          </div>

          {/* MATERIAL */}

          {event.material_type && (
            <div
              style={{
                display:
                  "inline-flex",

                alignItems:
                  "center",

                padding:
                  "6px 12px",

                borderRadius:
                  "999px",

                background:
                  "rgba(0,0,0,0.05)",

                border:
                  "1px solid rgba(0,0,0,0.05)",

                color:
                  "#514a44",

                fontSize:
                  "11px",

                fontWeight:
                  700,

                letterSpacing:
                  "1px",

                textTransform:
                  "uppercase",
              }}
            >
              {taxonomyLabel(
                "material",
                event.material_type,
                language
              )}
            </div>
          )}

          {/* FAILURE MODE */}

          <div
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              padding:
                "6px 12px",

              borderRadius:
                "999px",

              background:
                event.triggered
                  ? "rgba(143,42,42,0.12)"
                  : "rgba(58,76,102,0.10)",

              color:
                event.triggered
                  ? "#8f2a2a"
                  : "#40556f",

              fontSize:
                "11px",

              fontWeight:
                700,

              letterSpacing:
                "1px",

              textTransform:
                "uppercase",
            }}
          >
            {event.triggered
              ? text.eventDriven
              : text.progressive}
          </div>

        </div>

        {/* TITLE */}

        <h2
          style={{
            margin: 0,

            fontSize: "28px",

            lineHeight: 1.05,

            fontWeight: 800,

            color: "#1b1816",

            marginBottom: "12px",
          }}
        >
          {
            event.bridge_name
              ? event.bridge_name
              : event.bridge_crossing_name
                ? `${event.bridge_crossing_name} Bridge`
                : event.structural_type
                  ? `${event.structural_type} Bridge`
                  : `${event.municipality} Bridge`
          }
        </h2>

        {/* LOCATION */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",

            fontSize: "15px",

            color: "#746c64",

            fontWeight: 500,
          }}
        >
          <span>
            {event.municipality},{" "}
            {event.region}
          </span>

          <span
            style={{
              opacity: 0.35,
            }}
          >
            •
          </span>

          <span>
            {collapseYear}
          </span>
        </div>

      </div>

      {/* ================================= */}
      {/* IMPACT STRIP */}
      {/* ================================= */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "1fr 1fr 1fr",

          gap: "10px",

          marginBottom: "24px",
        }}
      >

        {/* COLLAPSE */}

        <div
          style={{
            background:
              "rgba(255,255,255,0.74)",

            borderRadius:
              "18px",

            padding: "14px",

            border:
              "1px solid rgba(0,0,0,0.04)",

            backdropFilter:
              "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "11px",

              textTransform:
                "uppercase",

              letterSpacing:
                "1px",

              opacity: 0.45,

              marginBottom: "6px",

              fontWeight: 700,

              color: "#7a7068",
            }}
          >
            {text.collapse}
          </div>

          <div
            style={{
              fontSize: "18px",

              fontWeight: 800,

              color:
                isTotalCollapse
                  ? "#8c1d1d"
                  : "#b9781f",
            }}
          >
            {isTotalCollapse
              ? text.total
              : text.partial}
          </div>
        </div>

        {/* FATALITIES */}

        <div
          style={{
            background:
              "rgba(255,255,255,0.74)",

            borderRadius:
              "18px",

            padding: "14px",

            border:
              "1px solid rgba(0,0,0,0.04)",

            backdropFilter:
              "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "11px",

              textTransform:
                "uppercase",

              letterSpacing:
                "1px",

              opacity: 0.45,

              marginBottom: "6px",

              fontWeight: 700,

              color: "#7a7068",
            }}
          >
            {text.fatalities}
          </div>

          <div
            style={{
              fontSize: "18px",

              fontWeight: 800,

              color: "#1f1b18",
            }}
          >
            {event.victims ?? 0}
          </div>
        </div>

        {/* BUILT */}

        <div
          style={{
            background:
              "rgba(255,255,255,0.74)",

            borderRadius:
              "18px",

            padding: "14px",

            border:
              "1px solid rgba(0,0,0,0.04)",

            backdropFilter:
              "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: "11px",

              textTransform:
                "uppercase",

              letterSpacing:
                "1px",

              opacity: 0.45,

              marginBottom: "6px",

              fontWeight: 700,

              color: "#7a7068",
            }}
          >
            {text.built}
          </div>

          <div
            style={{
              fontSize: "18px",

              fontWeight: 800,

              color: "#1f1b18",
            }}
          >
            {event.construction_year ||
              text.na}
          </div>
        </div>

      </div>

      {/* ================================= */}
      {/* INFRASTRUCTURE PROFILE */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "24px",
        }}
      >

        <div
          style={{
            fontSize: "11px",

            textTransform:
              "uppercase",

            letterSpacing:
              "1px",

            opacity: 0.45,

            marginBottom: "14px",

            fontWeight: 700,

            color: "#7a7068",
          }}
        >
          {text.infrastructureProfile}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >

          {[
            {
              label:
                text.structuralType,

              value:
                taxonomyLabel(
                  "structuralType",
                  event.structural_type,
                  language
                ),
            },

            {
              label:
                text.infrastructureUse,

              value:
                taxonomyLabel(
                  "use",
                  event.destination_use,
                  language
                ),
            },

            {
              label:
                text.crossing,

              value:
                event.bridge_crossing_name,
            },

            {
              label:
                text.infrastructureAge,

              value:
                infrastructureAge
                  ? `${infrastructureAge} ${text.years}`
                  : null,
            },

          ]
            .filter(
              (item) =>
                item.value
            )
            .map((item) => (

              <div
                key={item.label}

                style={{
                  display: "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "flex-start",

                  gap: "18px",

                  paddingBottom:
                    "10px",

                  borderBottom:
                    "1px solid rgba(0,0,0,0.06)",
                }}
              >

                <div
                  style={{
                    fontSize: "11px",

                    textTransform:
                      "uppercase",

                    letterSpacing:
                      "1px",

                    opacity: 0.45,

                    fontWeight: 700,

                    color: "#7a7068",
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    fontSize: "15px",

                    lineHeight: 1.5,

                    color: "#2a2522",

                    fontWeight: 600,

                    textAlign:
                      "right",
                  }}
                >
                  {item.value}
                </div>

              </div>

            ))}

        </div>

      </div>

      {/* ================================= */}
      {/* DESCRIPTION */}
      {/* ================================= */}

      {event.description && (

        <div
          style={{
            marginBottom: "22px",

            padding: "18px",

            background:
              "rgba(255,255,255,0.62)",

            borderRadius:
              "20px",

            border:
              "1px solid rgba(0,0,0,0.04)",
          }}
        >

          <div
            style={{
              fontSize: "11px",

              textTransform:
                "uppercase",

              letterSpacing:
                "1px",

              opacity: 0.45,

              marginBottom: "12px",

              fontWeight: 700,

              color: "#7a7068",
            }}
          >
            {text.eventDescription}
          </div>

          <div
            style={{
              fontSize: "14px",

              lineHeight: 1.75,

              color: "#514a44",
            }}
          >
            {event.description}
          </div>

        </div>

      )}

      {/* ================================= */}
      {/* SOURCES */}
      {/* ================================= */}

      {relatedSources.length >
        0 && (

        <div>

          <div
            style={{
              fontSize: "11px",

              textTransform:
                "uppercase",

              letterSpacing:
                "1px",

              opacity: 0.45,

              marginBottom: "12px",

              fontWeight: 700,

              color: "#7a7068",
            }}
          >
            {text.sources}
          </div>

          <div
            style={{
              display: "flex",

              flexDirection:
                "column",

              gap: "10px",
            }}
          >

            {relatedSources.map(
              (source) => (

                <a
                  key={
                    source.source_id
                  }

                  href={
                    source.source_url
                  }

                  target="_blank"

                  rel="noreferrer"

                  style={{
                    textDecoration:
                      "none",

                    background:
                      "rgba(255,255,255,0.78)",

                    borderRadius:
                      "16px",

                    padding: "14px",

                    border:
                      "1px solid rgba(0,0,0,0.04)",

                    transition:
                      "all 0.2s ease",
                  }}
                >

                  <div
                    style={{
                      fontSize: "14px",

                      lineHeight: 1.45,

                      color: "#1f1b18",

                      fontWeight: 600,

                      marginBottom: "6px",
                    }}
                  >
                    {
                      source.source_title
                    }
                  </div>

                  <div
                    style={{
                      fontSize: "11px",

                      textTransform:
                        "uppercase",

                      letterSpacing:
                        "1px",

                      color:
                        "#7a7068",

                      fontWeight: 700,
                    }}
                  >
                    {
                      source.source_type
                    }{" "}
                    •{" "}
                    {
                      source.source_role
                    }
                  </div>

                </a>

              )
            )}

          </div>

        </div>

      )}

    </div>
  );
}

export default EventPopup;
