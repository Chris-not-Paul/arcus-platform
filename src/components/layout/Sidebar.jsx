import { causeColors } from "../../utils/colors";

function Sidebar({

  sidebarOpen,
  setSidebarOpen,

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
    <>

      {/* ================================= */}
      {/* TOGGLE BUTTON */}
      {/* ================================= */}

      <button
        onClick={() =>
          setSidebarOpen(
            !sidebarOpen
          )
        }

        style={{

          position: "fixed",

          top: "18px",

          left: sidebarOpen
            ? "308px"
            : "18px",

          width: "46px",

          height: "46px",

          border: "none",

          borderRadius: "16px",

          background:
            "rgba(24,24,28,0.92)",

          backdropFilter:
            "blur(18px)",

          color: "white",

          display: "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          cursor: "pointer",

          zIndex: 7000,

          transition:
            "all 0.34s ease",

          boxShadow:
            "0 8px 24px rgba(0,0,0,0.18)",
        }}
      >

        <span
          style={{
            fontSize: "22px",

            lineHeight: 1,

            marginTop: "-2px",
          }}
        >
          {sidebarOpen ? "×" : "☰"}
        </span>

      </button>

      {/* ================================= */}
      {/* SIDEBAR */}
      {/* ================================= */}

      <div
        style={{

          position: "fixed",

          top: 0,

          left:
            sidebarOpen
              ? 0
              : "-320px",

          zIndex: 5000,

          width: "290px",

          height: "100vh",

          background:
            "rgba(238,233,226,0.92)",

          backdropFilter:
            "blur(22px)",

          borderRight:
            "1px solid rgba(120,95,72,0.08)",

          boxShadow:
            "10px 0 34px rgba(0,0,0,0.08)",

          transition:
            "all 0.34s ease",

          overflowY: "auto",

          padding: "24px",

          paddingBottom: "90px",

          boxSizing: "border-box",
        }}
      >

        {/* ================================= */}
        {/* ARCUS BRANDING */}
        {/* ================================= */}

        <div
          style={{
            marginBottom: "26px",
          }}
        >

          <div
            style={{
              fontSize: "11px",

              letterSpacing: "2.2px",

              textTransform:
                "uppercase",

              fontWeight: 700,

              opacity: 0.82,

              marginBottom: "8px",

              color: "#6f5d4d",
            }}
          >
            ARCUS ATLAS
          </div>

          <div
            style={{
              fontSize: "10px",

              letterSpacing: "1.8px",

              textTransform:
                "uppercase",

              color:
                "rgba(120,100,84,0.55)",

              marginBottom: "18px",
            }}
          >
            Infrastructure Failure Observatory
          </div>

          <h1
            style={{
              margin: 0,

              fontSize: "30px",

              letterSpacing: "-1.2px",

              lineHeight: 0.98,

              fontWeight: 900,

              color: "#1d1916",
            }}
          >
            Bridge Collapse
            Database
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

            marginBottom: "30px",
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
              value:
                totalTC,
            },

            {
              label: "PC",
              value:
                totalPC,
            },

          ].map((item) => (

            <div
              key={item.label}

              style={{
                background:
                  "rgba(255,248,242,0.58)",

                borderRadius:
                  "20px",

                padding: "14px",

                border:
                  "1px solid rgba(0,0,0,0.04)",

                backdropFilter:
                  "blur(10px)",

                boxShadow:
                  "0 4px 14px rgba(0,0,0,0.03)",
              }}
            >

              <div
                style={{
                  fontSize: "11px",

                  textTransform:
                    "uppercase",

                  letterSpacing:
                    "1px",

                  opacity: 0.5,

                  marginBottom:
                    "4px",

                  color: "#7a7068",
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  fontSize: "28px",

                  fontWeight: 800,

                  color: "#161412",
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
            marginBottom: "30px",

            paddingTop: "24px",

            borderTop:
              "1px solid rgba(0,0,0,0.05)",
          }}
        >

          <div
            style={{
              fontSize: "13px",

              fontWeight: 700,

              letterSpacing: "1px",

              textTransform:
                "uppercase",

              opacity: 0.5,

              marginBottom: "10px",

              color: "#746c64",
            }}
          >
            Timeline
          </div>

          <div
            style={{
              fontSize: "34px",

              fontWeight: 800,

              color: "#2b211b",

              marginBottom: "14px",
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
                Number(
                  e.target.value
                )
              )
            }

            style={{
              width: "100%",

              accentColor:
                "#6f6255",

              cursor: "pointer",
            }}
          />

          <div
            style={{
              display: "flex",

              justifyContent:
                "space-between",

              marginTop: "8px",

              fontSize: "12px",

              color: "#7d746c",
            }}
          >
            <span>{minYear}</span>

            <span>{maxYear}</span>
          </div>

        </div>

        {/* ================================= */}
        {/* FILTERS */}
        {/* ================================= */}

        <div
          style={{
            marginBottom: "30px",

            paddingTop: "24px",

            borderTop:
              "1px solid rgba(120,95,72,0.10)",
          }}
        >

          <div
            style={{
              fontSize: "13px",

              fontWeight: 700,

              letterSpacing: "1px",

              textTransform:
                "uppercase",

              opacity: 0.5,

              marginBottom: "14px",

              color: "#746c64",
            }}
          >
            Filters
          </div>

          {/* CAUSE */}

          <div
            style={{
              marginBottom: "16px",
            }}
          >

            <div
              style={{
                fontSize: "12px",

                fontWeight: 700,

                marginBottom:
                  "8px",

                color: "#514a44",
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
                  "1px solid rgba(0,0,0,0.06)",

                background:
                  "rgba(255,252,248,0.82)",

                fontSize: "14px",

                outline: "none",

                color: "#3e3935",
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

          <div
            style={{
              marginBottom: "16px",
            }}
          >

            <div
              style={{
                fontSize: "12px",

                fontWeight: 700,

                marginBottom:
                  "8px",

                color: "#514a44",
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
                  "1px solid rgba(0,0,0,0.06)",

                background:
                  "rgba(255,252,248,0.82)",

                fontSize: "14px",

                outline: "none",

                color: "#3e3935",
              }}
            >
              <option value="All">
                All
              </option>

              <option value="TC">
                Total Collapse
              </option>

              <option value="PC">
                Partial Collapse
              </option>

            </select>

          </div>

          {/* TRIGGERED */}

          <div>

            <div
              style={{
                fontSize: "12px",

                fontWeight: 700,

                marginBottom:
                  "8px",

                color: "#514a44",
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
                  "1px solid rgba(0,0,0,0.06)",

                background:
                  "rgba(255,252,248,0.82)",

                fontSize: "14px",

                outline: "none",

                color: "#3e3935",
              }}
            >
              <option value="All">
                All
              </option>

              <option value="TRUE">
                TRUE
              </option>

              <option value="FALSE">
                FALSE
              </option>

            </select>

          </div>

        </div>

        {/* ================================= */}
        {/* LEGEND */}
        {/* ================================= */}

        <div
          style={{
            marginBottom: "30px",

            paddingTop: "24px",

            borderTop:
              "1px solid rgba(0,0,0,0.05)",
          }}
        >

          <div
            style={{
              fontSize: "13px",

              fontWeight: 700,

              letterSpacing: "1px",

              textTransform:
                "uppercase",

              opacity: 0.5,

              marginBottom: "14px",

              color: "#746c64",
            }}
          >
            Failure Taxonomy
          </div>

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

                  marginBottom:
                    "10px",
                }}
              >

                <div
                  style={{
                    width: "15px",

                    height: "15px",

                    borderRadius:
                      "4px",

                    transform:
                      "rotate(45deg)",

                    marginRight:
                      "12px",

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

                    color: "#514a44",
                  }}
                >
                  {cause}
                </span>

              </div>

            ))}

        </div>

      </div>

    </>
  );
}

export default Sidebar;