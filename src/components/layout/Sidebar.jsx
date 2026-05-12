import { causeColors } from "../../utils/colors";

function Sidebar({
  sidebarOpen,

  filteredEvents,

  totalTriggered,
  totalTC,
  totalPC,

  yearFilter,
  setYearFilter,
  minYear,
  maxYear,

  causeFilter,
  setCauseFilter,

  severityFilter,
  setSeverityFilter,

  triggeredFilter,
  setTriggeredFilter,

  uniqueCauses,
}) {
  return (
    <div
      style={{
        position: "relative",

        width: "100%",
        height: "100%",

        background:
          "linear-gradient(180deg, rgba(15,18,26,0.97) 0%, rgba(22,26,36,0.96) 100%)",

        backdropFilter:
          "blur(18px)",

        overflowY: "auto",

        padding: "24px",

        paddingBottom: "90px",

        boxSizing: "border-box",

        borderRight:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >

      {/* ================================= */}
      {/* ARCUS BRANDING */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "28px",
        }}
      >

        <div
          style={{
            fontSize: "28px",

            fontWeight: 900,

            letterSpacing: "-1.2px",

            color: "#f3efe8",

            lineHeight: 1,

            marginBottom: "6px",
          }}
        >
          ARCUS ATLAS
        </div>

        <div
          style={{
            fontSize: "10px",

            letterSpacing: "2.2px",

            textTransform:
              "uppercase",

            color:
              "rgba(230,235,245,0.52)",

            marginBottom: "20px",
          }}
        >
          Infrastructure Failure Observatory
        </div>

        <h1
          style={{
            margin: 0,

            fontSize: "34px",

            lineHeight: 1.02,

            fontWeight: 800,

            letterSpacing: "-1.2px",

            color: "#f4f1eb",
          }}
        >
          Bridge Failure Atlas
        </h1>

      </div>

      {/* ================================= */}
      {/* STATS */}
      {/* ================================= */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "1fr 1fr",

          gap: "10px",

          marginBottom: "34px",
        }}
      >

        {[
          {
            label: "Events",
            value:
              filteredEvents.length,
          },

          {
            label: "Triggered",
            value:
              totalTriggered,
          },

          {
            label: "TC",
            value: totalTC,
          },

          {
            label: "PC",
            value: totalPC,
          },

        ].map((item) => (

          <div
            key={item.label}

            style={{
              background:
                "rgba(255,255,255,0.06)",

              borderRadius:
                "12px",

              padding: "12px",

              border:
                "1px solid rgba(255,255,255,0.06)",

              backdropFilter:
                "blur(12px)",
            }}
          >

            <div
              style={{
                fontSize: "10px",

                textTransform:
                  "uppercase",

                letterSpacing:
                  "1.4px",

                marginBottom: "6px",

                fontWeight: 700,

                color:
                  "rgba(230,235,245,0.54)",
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: "30px",

                fontWeight: 800,

                color: "#f4f1eb",

                lineHeight: 1,
              }}
            >
              {item.value}
            </div>

          </div>

        ))}

      </div>

      {/* ================================= */}
      {/* TIMELINE */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "34px",

          paddingTop: "24px",

          borderTop:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >

        <div
          style={{
            fontSize: "11px",

            fontWeight: 700,

            letterSpacing: "1.8px",

            textTransform:
              "uppercase",

            marginBottom: "12px",

            color:
              "rgba(230,235,245,0.52)",
          }}
        >
          Timeline
        </div>

        <div
          style={{
            background:
              "rgba(255,255,255,0.06)",

            borderRadius:
              "14px",

            padding: "16px",

            border:
              "1px solid rgba(255,255,255,0.06)",
          }}
        >

          <div
            style={{
              fontSize: "42px",

              fontWeight: 800,

              color: "#f4f1eb",

              marginBottom: "16px",

              lineHeight: 1,
            }}
          >
            {yearFilter}
          </div>

          <input
            type="range"

            min={minYear}

            max={maxYear}

            value={yearFilter}

            onChange={(e) =>
              setYearFilter(
                Number(e.target.value)
              )
            }

            style={{
              width: "100%",

              accentColor:
                "#b13d37",

              cursor: "pointer",
            }}
          />

          <div
            style={{
              display: "flex",

              justifyContent:
                "space-between",

              marginTop: "10px",

              fontSize: "12px",

              color:
                "rgba(230,235,245,0.5)",
            }}
          >
            <span>{minYear}</span>

            <span>{maxYear}</span>
          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* FILTERS */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "34px",

          paddingTop: "24px",

          borderTop:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >

        <div
          style={{
            fontSize: "11px",

            fontWeight: 700,

            letterSpacing: "1.8px",

            textTransform:
              "uppercase",

            marginBottom: "16px",

            color:
              "rgba(230,235,245,0.52)",
          }}
        >
          Filters
        </div>

        <div
          style={{
            display: "flex",

            flexDirection:
              "column",

            gap: "16px",
          }}
        >

          {/* CAUSE */}

          <div>

            <div
              style={{
                fontSize: "12px",

                marginBottom: "8px",

                fontWeight: 600,

                color:
                  "#d7dde7",
              }}
            >
              Cause
            </div>

            <select
              value={causeFilter}

              onChange={(e) =>
                setCauseFilter(
                  e.target.value
                )
              }

              style={{
                width: "100%",

                padding: "12px",

                borderRadius:
                  "12px",

                border:
                  "1px solid rgba(255,255,255,0.08)",

                background:
                  "rgba(255,255,255,0.07)",

                fontSize: "14px",

                color: "#eef2f7",

                outline: "none",
              }}
            >

              {uniqueCauses.map(
                (cause) => (
                  <option
                    key={cause}
                    value={cause}
                  >
                    {cause}
                  </option>
                )
              )}

            </select>

          </div>

          {/* SEVERITY */}

          <div>

            <div
              style={{
                fontSize: "12px",

                marginBottom: "8px",

                fontWeight: 600,

                color:
                  "#d7dde7",
              }}
            >
              Severity
            </div>

            <select
              value={
                severityFilter
              }

              onChange={(e) =>
                setSeverityFilter(
                  e.target.value
                )
              }

              style={{
                width: "100%",

                padding: "12px",

                borderRadius:
                  "12px",

                border:
                  "1px solid rgba(255,255,255,0.08)",

                background:
                  "rgba(255,255,255,0.07)",

                fontSize: "14px",

                color: "#eef2f7",

                outline: "none",
              }}
            >

              <option value="All">
                All
              </option>

              <option value="TC">
                TC
              </option>

              <option value="PC">
                PC
              </option>

            </select>

          </div>

          {/* TRIGGERED */}

          <div>

            <div
              style={{
                fontSize: "12px",

                marginBottom: "8px",

                fontWeight: 600,

                color:
                  "#d7dde7",
              }}
            >
              Triggered
            </div>

            <select
              value={
                triggeredFilter
              }

              onChange={(e) =>
                setTriggeredFilter(
                  e.target.value
                )
              }

              style={{
                width: "100%",

                padding: "12px",

                borderRadius:
                  "12px",

                border:
                  "1px solid rgba(255,255,255,0.08)",

                background:
                  "rgba(255,255,255,0.07)",

                fontSize: "14px",

                color: "#eef2f7",

                outline: "none",
              }}
            >

              <option value="All">
                All
              </option>

              <option value="TRUE">
                Yes
              </option>

              <option value="FALSE">
                No
              </option>

            </select>

          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* FAILURE TAXONOMY */}
      {/* ================================= */}

      <div
        style={{
          marginBottom: "34px",

          paddingTop: "24px",

          borderTop:
            "1px solid rgba(255,255,255,0.06)",
        }}
      >

        <div
          style={{
            fontSize: "11px",

            fontWeight: 700,

            letterSpacing: "1.8px",

            textTransform:
              "uppercase",

            marginBottom: "16px",

            color:
              "rgba(230,235,245,0.52)",
          }}
        >
          Failure Taxonomy
        </div>

        <div
          style={{
            display: "flex",

            flexDirection:
              "column",

            gap: "12px",
          }}
        >

          {uniqueCauses
            .filter(
              (cause) =>
                cause !== "All"
            )
            .map((cause) => (

              <div
                key={cause}

                style={{
                  display: "flex",

                  alignItems:
                    "center",

                  gap: "12px",
                }}
              >

                <div
                  style={{
                    width: "12px",

                    height: "12px",

                    borderRadius:
                      "999px",

                    background:
                      causeColors[
                        cause
                      ] || "#3f6b78",

                    boxShadow: `
                      0 0 0 4px ${
                        causeColors[
                          cause
                        ]
                      }22
                    `,
                  }}
                ></div>

                <span
                  style={{
                    fontSize: "14px",

                    color:
                      "#d7dde7",

                    fontWeight: 500,
                  }}
                >
                  {cause}
                </span>

              </div>

            ))}

        </div>

      </div>

      {/* ================================= */}
      {/* CREDITS */}
      {/* ================================= */}

      <div
        style={{
          paddingTop: "24px",

          borderTop:
            "1px solid rgba(255,255,255,0.06)",

          fontSize: "11px",

          lineHeight: 1.8,

          color:
            "rgba(230,235,245,0.56)",
        }}
      >

        <div
          style={{
            marginBottom: "12px",

            fontWeight: 700,

            letterSpacing: "1.5px",

            textTransform:
              "uppercase",

            opacity: 0.75,
          }}
        >
          Credits
        </div>

        <div>
          Original bridge collapse
          dataset co-developed with
          researchers from:
          <br />
          Politecnico di Torino •
          Politecnico di Milano
        </div>

        <div
          style={{
            marginTop: "12px",
          }}
        >
          Database expansion,
          metadata architecture,
          source integration,
          GIS platform and visual
          analytics:
          <br />
          Christian Paolini
        </div>

        <div
          style={{
            marginTop: "14px",

            opacity: 0.55,
          }}
        >
          Updated: May 2026
        </div>

      </div>

      {/* ================================= */}
      {/* FOOTER */}
      {/* ================================= */}

      <div
        style={{
          marginTop: "34px",

          paddingTop: "18px",

          borderTop:
            "1px solid rgba(255,255,255,0.06)",

          fontSize: "10px",

          letterSpacing: "2px",

          textTransform:
            "uppercase",

          color:
            "rgba(230,235,245,0.42)",
        }}
      >
        ARCUS PLATFORM • v1.0
      </div>

    </div>
  );
}

export default Sidebar;