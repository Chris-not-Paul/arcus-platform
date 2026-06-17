import useLanguage from "../../context/useLanguage";
import taxonomyLabel from "../../utils/taxonomyLabels";
import "./Sidebar.css";

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
  const it = language === "it";

  const text = {
    all: it ? "Tutti" : "All",
    brand: it
      ? "Osservatorio sui cedimenti infrastrutturali"
      : "Infrastructure failure observatory",
    cause: it ? "Causa" : "Cause",
    database: it
      ? "Database dei crolli dei ponti"
      : "Bridge Collapse Database",
    events: it ? "Eventi" : "Events",
    filters: it ? "Filtri" : "Filters",
    open: it ? "Apri controlli Atlas" : "Open Atlas controls",
    close: it ? "Chiudi controlli Atlas" : "Close Atlas controls",
    search: it ? "Ricerca archivio" : "Archive Search",
    searchPlaceholder: it
      ? "Ponte, comune, ID evento..."
      : "Bridge, city, event ID...",
    partialCollapse: it
      ? "Collasso parziale"
      : "Partial Collapse",
    severity: it ? "Gravita" : "Severity",
    timeline: it ? "Cronologia" : "Timeline",
    totalCollapse: it
      ? "Collasso totale"
      : "Total Collapse",
    triggered: it ? "Innescati" : "Triggered",
    triggeredTrue: it ? "Si" : "True",
    triggeredFalse: it ? "No" : "False",
  };

  const stats = [
    {
      className: "primary",
      label: text.events,
      value: filteredEvents.length,
    },
    {
      label: text.triggered,
      value: totalTriggered,
    },
    {
      className: "critical",
      label: "TC",
      value: totalTC,
    },
    {
      className: "high",
      label: "PC",
      value: totalPC,
    },
  ];

  const filterGroups = [
    {
      id: "cause",
      label: text.cause,
      value: causeFilter,
      onChange: setCauseFilter,
      options: uniqueCauses.map((cause) => ({
        label:
          cause === "All"
            ? text.all
            : taxonomyLabel("cause", cause, language),
        value: cause,
      })),
    },
    {
      id: "severity",
      label: text.severity,
      value: severityFilter,
      onChange: setSeverityFilter,
      options: [
        { label: text.all, value: "All" },
        { label: text.totalCollapse, value: "TC" },
        { label: text.partialCollapse, value: "PC" },
      ],
    },
    {
      id: "triggered",
      label: text.triggered,
      value: triggeredFilter,
      onChange: setTriggeredFilter,
      options: [
        { label: text.all, value: "All" },
        { label: text.triggeredTrue, value: "TRUE" },
        { label: text.triggeredFalse, value: "FALSE" },
      ],
    },
  ];

  return (
    <>
      <button
        className={`atlas-sidebar-toggle ${
          sidebarOpen ? "is-open" : ""
        }`}
        aria-label={sidebarOpen ? text.close : text.open}
        aria-expanded={sidebarOpen}
        type="button"
        onClick={() =>
          setSidebarOpen(!sidebarOpen)
        }
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <aside
        className={`atlas-filter-sidebar ${
          sidebarOpen ? "is-open" : ""
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="atlas-sidebar-brand">
          <div>
            <span>ARCUS ATLAS</span>
            <small>{text.brand}</small>
          </div>
          <h1>{text.database}</h1>
        </div>

        <div className="atlas-sidebar-stats">
          {stats.map((item) => (
            <div
              className={`atlas-sidebar-stat ${
                item.className || ""
              }`}
              key={item.label}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <section className="atlas-sidebar-section">
          <label
            className="atlas-sidebar-label"
            htmlFor="atlas-sidebar-search"
          >
            {text.search}
          </label>
          <input
            id="atlas-sidebar-search"
            className="atlas-sidebar-input"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder={text.searchPlaceholder}
            type="search"
          />
        </section>

        <section className="atlas-sidebar-section">
          <div className="atlas-sidebar-section-head">
            <span>{text.timeline}</span>
            <strong>{yearFilter}</strong>
          </div>

          <input
            className="atlas-sidebar-range"
            type="range"
            min={minYear}
            max={maxYear}
            value={yearFilter}
            onChange={(event) =>
              setYearFilter(Number(event.target.value))
            }
          />

          <div className="atlas-sidebar-range-labels">
            <span>{minYear}</span>
            <span>{maxYear}</span>
          </div>
        </section>

        <section className="atlas-sidebar-section">
          <div className="atlas-sidebar-section-title">
            {text.filters}
          </div>

          <div className="atlas-sidebar-fieldset">
            {filterGroups.map((group) => (
              <label
                className="atlas-sidebar-field"
                htmlFor={`atlas-filter-${group.id}`}
                key={group.id}
              >
                <span>{group.label}</span>
                <select
                  id={`atlas-filter-${group.id}`}
                  className="atlas-sidebar-select"
                  value={group.value}
                  onChange={(event) =>
                    group.onChange(event.target.value)
                  }
                >
                  {group.options.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}

export default Sidebar;
