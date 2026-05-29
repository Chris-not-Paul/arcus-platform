import useLanguage from "../../context/useLanguage";
import taxonomyLabel from "../../utils/taxonomyLabels";

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

  searchQuery,
  setSearchQuery,

  uniqueCauses,

}) {
  const { language } = useLanguage();

  const text = {
    all: language === "it" ? "Tutti" : "All",
    brand:
      language === "it"
        ? "Osservatorio sui Cedimenti Infrastrutturali"
        : "Infrastructure Failure Observatory",
    cause: language === "it" ? "Causa" : "Cause",
    database:
      language === "it"
        ? "Database dei crolli dei ponti"
        : "Bridge Collapse Database",
    events: language === "it" ? "Eventi" : "Events",
    filters: language === "it" ? "Filtri" : "Filters",
    search:
      language === "it"
        ? "Ricerca archivio"
        : "Archive Search",
    searchPlaceholder:
      language === "it"
        ? "Ponte, comune, id evento..."
        : "Bridge, city, event id...",
    partialCollapse:
      language === "it"
        ? "Collasso parziale"
        : "Partial Collapse",
    severity:
      language === "it" ? "Gravita" : "Severity",
    timeline:
      language === "it" ? "Cronologia" : "Timeline",
    totalCollapse:
      language === "it"
        ? "Collasso totale"
        : "Total Collapse",
    triggered:
      language === "it" ? "Innescati" : "Triggered",
  };

  return (
    <>

      {/* ================================= */}
      {/* TOGGLE BUTTON */}
      {/* ================================= */}

      <button
        aria-label={
          sidebarOpen
            ? "Close atlas controls"
            : "Open atlas controls"
        }
        onClick={() =>
          setSidebarOpen(
            !sidebarOpen
          )
        }

        style={{

          position: "fixed",

          top: "18px",

          left: sidebarOpen
            ? "304px"
            : "18px",

          width: "46px",

          height: "46px",

          border: "none",

          borderRadius: "8px",

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
            fontSize: "20px",

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

          width: "286px",

          height: "100vh",

          background:
            "rgba(241,236,229,0.94)",

          backdropFilter:
            "blur(22px)",

          borderRight:
            "1px solid rgba(120,95,72,0.08)",

          boxShadow:
            "10px 0 34px rgba(0,0,0,0.08)",

          transition:
            "all 0.34s ease",

          overflowY: "auto",

          padding: "22px",

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
            {text.brand}
          </div>

          <h1
            style={{
              margin: 0,

              fontSize: "27px",

              letterSpacing: "0",

              lineHeight: 0.98,

              fontWeight: 900,

              color: "#1d1916",
            }}
          >
            {text.database}
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
              label: text.events,
              value:
                filteredEvents.length,
            },

            {
              label: text.triggered,
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
                  "8px",

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
                  fontSize: "24px",

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
        {/* SEARCH */}
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

              marginBottom: "12px",

              color: "#746c64",
            }}
          >
            {text.search}
          </div>

          <input
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder={
              text.searchPlaceholder
            }
            type="search"
            style={{
              width: "100%",

              padding: "12px 13px",

              borderRadius: "8px",

              border:
                "1px solid rgba(0,0,0,0.06)",

              background:
                "rgba(255,252,248,0.88)",

              color: "#2b211b",

              fontSize: "14px",

              outline: "none",
            }}
          />
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
            {text.timeline}
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
            {text.filters}
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
              {text.cause}
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
                  "8px",

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
                    {cause === "All"
                      ? text.all
                      : taxonomyLabel(
                          "cause",
                          cause,
                          language
                        )}
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
              {text.severity}
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
                  "8px",

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
                {text.all}
              </option>

              <option value="TC">
                {text.totalCollapse}
              </option>

              <option value="PC">
                {text.partialCollapse}
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
              {text.triggered}
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
                  "8px",

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
                {text.all}
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

      </div>

    </>
  );
}

export default Sidebar;

