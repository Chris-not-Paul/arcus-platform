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
        position: "absolute",
        top: 0,
        left: sidebarOpen ? 0 : -320,
        zIndex: 2500,
        width: "270px",
        height: "100%",
        background:
          "rgba(244,241,236,0.88)",
        backdropFilter: "blur(18px)",
        boxShadow:
          "6px 0 28px rgba(0,0,0,0.08)",
        transition: "all 0.35s ease",
        overflowY: "auto",
        padding: "22px",
        paddingBottom: "90px",
      }}
    >
      {/* TITLE */}

      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            opacity: 0.5,
            marginBottom: "6px",
            color: "#7b746d",
          }}
        >
          Italian Infrastructure Risk Atlas
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            lineHeight: 1.05,
            fontWeight: 800,
            color: "#1c1a18",
          }}
        >
          Bridge Collapse Database
        </h1>
      </div>

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "10px",
          marginBottom: "28px",
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
            value: totalTriggered,
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
                "rgba(255,250,245,0.72)",
              borderRadius: "16px",
              padding: "14px",
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
                opacity: 0.5,
                marginBottom: "4px",
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

      {/* TIMELINE */}

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
            background:
              "rgba(255,250,245,0.72)",
            borderRadius: "16px",
            padding: "16px",
          }}
        >
          <div
            style={{
              fontSize: "34px",
              fontWeight: 800,
              color: "#1b1816",
              marginBottom: "12px",
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
              accentColor: "#93342b",
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
              color: "#7a7068",
            }}
          >
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
        </div>
      </div>

      {/* FILTERS */}

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
          Filters
        </div>

        {[
          {
            label: "Cause",
            value: causeFilter,
            setter: setCauseFilter,
            options: uniqueCauses,
          },
          {
            label: "Severity",
            value:
              severityFilter,
            setter:
              setSeverityFilter,
            options: [
              "All",
              "TC",
              "PC",
            ],
          },
          {
            label: "Triggered",
            value:
              triggeredFilter,
            setter:
              setTriggeredFilter,
            options: [
              "All",
              "TRUE",
              "FALSE",
            ],
          },
        ].map((filter) => (
          <div
            key={filter.label}
            style={{
              marginBottom: "16px",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#514a44",
              }}
            >
              {filter.label}
            </label>

            <select
              value={filter.value}
              onChange={(e) =>
                filter.setter(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border:
                  "1px solid rgba(0,0,0,0.06)",
                background:
                  "rgba(255,252,248,0.82)",
                fontSize: "14px",
                outline: "none",
                color: "#3e3935",
              }}
            >
              {filter.options.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </div>
        ))}
      </div>

      {/* LEGEND */}

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
          Cause Legend
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
                  width: "14px",
                  height: "14px",
                  borderRadius: "4px",
                  transform:
                    "rotate(45deg)",
                  marginRight:
                    "12px",
                  background:
                    causeColors[
                      cause
                    ] || "#3f6b78",
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
  );
}

export default Sidebar;