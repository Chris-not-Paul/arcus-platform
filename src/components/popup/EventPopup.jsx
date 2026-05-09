import extractYear from "../../utils/extractYear";

import { causeColors } from "../../utils/colors";

function EventPopup({
  event,
  relatedSources,
}) {
  const collapseYear =
    extractYear(event.date);

  const infrastructureAge =
    collapseYear &&
    event.construction_year
      ? collapseYear -
        Number(event.construction_year)
      : null;

  return (
    <div
      style={{
        minWidth: "300px",
        maxHeight: "70vh",
        overflowY: "auto",
        paddingRight: "6px",
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "999px",
              background:
                causeColors[
                  event.specific_cause
                ] || "#3f6b78",
              color: "white",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform:
                "uppercase",
            }}
          >
            {event.specific_cause}
          </div>

          {event.material_type && (
            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                padding:
                  "6px 10px",
                borderRadius:
                  "999px",
                background:
                  "rgba(0,0,0,0.06)",
                color:
                  "#514a44",
                fontSize:
                  "11px",
                fontWeight: 700,
                letterSpacing:
                  "1px",
                textTransform:
                  "uppercase",
              }}
            >
              {event.material_type}
            </div>
          )}
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "26px",
            lineHeight: 1.1,
            fontWeight: 800,
            color: "#1b1816",
            marginBottom: "10px",
          }}
        >
          {event.bridge_name}
        </h2>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
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
              opacity: 0.4,
            }}
          >
            •
          </span>

          <span>
            {extractYear(event.date)}
          </span>
        </div>
      </div>

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        {[
          {
            label: "Severity",
            value:
              event.collapse_severity,
          },
          {
            label: "Triggered",
            value: event.triggered
              ? "Yes"
              : "No",
          },
          {
            label: "Victims",
            value:
              event.victims ?? "0",
          },
          {
            label: "Injuries",
            value:
              event.injuries ?? "0",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background:
                "rgba(247,243,238,0.86)",
              borderRadius: "14px",
              padding: "14px",
              boxShadow:
                "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                textTransform:
                  "uppercase",
                opacity: 0.5,
                marginBottom: "5px",
                color: "#7a7068",
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: "26px",
                fontWeight: 800,
                color: "#161412",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* AGE INFO */}

      {infrastructureAge && (
        <div
          style={{
            marginBottom: "18px",
            fontSize: "13px",
            color: "#746c64",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>
            Built in{" "}
            {
              event.construction_year
            }
          </span>

          <span
            style={{
              opacity: 0.4,
            }}
          >
            •
          </span>

          <span>
            {infrastructureAge} years
            old at collapse
          </span>
        </div>
      )}

      {/* DESCRIPTION */}

      <div
        style={{
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            textTransform:
              "uppercase",
            letterSpacing: "1px",
            opacity: 0.45,
            marginBottom: "10px",
            fontWeight: 700,
            color: "#7a7068",
          }}
        >
          Event Description
        </div>

        <div
          style={{
            fontSize: "14px",
            lineHeight: 1.7,
            color: "#514a44",
          }}
        >
          {event.description}
        </div>
      </div>

      {/* SOURCES */}

      {relatedSources.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "11px",
              textTransform:
                "uppercase",
              letterSpacing: "1px",
              opacity: 0.45,
              marginBottom: "12px",
              fontWeight: 700,
              color: "#7a7068",
            }}
          >
            Sources
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
                  key={source.source_id}
                  href={source.source_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration:
                      "none",
                    background:
                      "rgba(255,255,255,0.78)",
                    borderRadius:
                      "14px",
                    padding: "12px",
                    border:
                      "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.4,
                      color: "#1f1b18",
                      fontWeight: 600,
                      marginBottom: "6px",
                    }}
                  >
                    {source.source_title}
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
                    {source.source_type} •{" "}
                    {source.source_role}
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