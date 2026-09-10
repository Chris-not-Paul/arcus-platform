import { useState } from "react";
import useLanguage from "../../context/useLanguage";
import { causeColors } from "../../utils/colors";
import { localizedBridgeDisplayName } from "../../utils/eventDisplayLabels";
import { researchEventId } from "../../utils/eventIdentity";
import extractYear from "../../utils/extractYear";
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
  additionalFilters = [],
  onResetFilters,
  onSelectEvent,
  selectedEventId = null,
}) {
  const { language } = useLanguage();
  const it = language === "it";
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const text = {
    all: it ? "Tutti" : "All",
    brand: it
      ? "Osservatorio sui cedimenti infrastrutturali"
      : "Infrastructure failure observatory",
    cause: it ? "Causa" : "Cause",
    database: it
      ? "Database dei crolli dei ponti"
      : "Bridge Collapse Database",
    activeFilters: it ? "Filtri attivi" : "Active filters",
    advancedFilters: it ? "Filtri avanzati" : "Advanced filters",
    clearAll: it ? "Azzera tutto" : "Clear all",
    events: it ? "Risultati" : "Results",
    filters: it ? "Filtri" : "Filters",
    open: it ? "Apri controlli Atlas" : "Open Atlas controls",
    close: it ? "Chiudi controlli Atlas" : "Close Atlas controls",
    search: it ? "Ricerca archivio" : "Archive Search",
    searchPlaceholder: it
      ? "Ponte, comune, ID evento..."
      : "Bridge, city, event ID...",
    refineResults: it
      ? "Affina i filtri per consultare gli altri eventi."
      : "Refine the filters to browse the remaining events.",
    resultList: it ? "Elenco risultati" : "Result list",
    resultOrder: it ? "Più recenti prima" : "Newest first",
    partialCollapse: it
      ? "Collasso parziale"
      : "Partial Collapse",
    severity: it ? "Gravità" : "Severity",
    timeline: it ? "Cronologia" : "Timeline",
    totalCollapse: it
      ? "Collasso totale"
      : "Total Collapse",
    triggered: it ? "Innescati" : "Triggered",
    triggeredTrue: it ? "Sì" : "True",
    triggeredFalse: it ? "No" : "False",
    year: it ? "Fino al" : "Through",
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
    ...additionalFilters,
  ];

  const groupById = new Map(filterGroups.map((group) => [group.id, group]));
  const primaryFilters = ["cause", "region", "province", "severity"]
    .map((id) => groupById.get(id))
    .filter(Boolean);
  const advancedFilters = filterGroups.filter(
    (group) => !primaryFilters.includes(group)
  );
  const activeGroups = filterGroups.filter(
    (group) => group.value !== "All"
  );
  const hasSearch = Boolean(searchQuery.trim());
  const hasYearFilter = yearFilter < maxYear;
  const activeFilterCount =
    activeGroups.length + Number(hasSearch) + Number(hasYearFilter);
  const activeAdvancedCount = advancedFilters.filter(
    (group) => group.value !== "All"
  ).length;
  const resultLimit = 40;
  const visibleResults = [...filteredEvents]
    .sort((first, second) => {
      const yearDifference =
        (extractYear(second.date) || 0) - (extractYear(first.date) || 0);

      if (yearDifference !== 0) {
        return yearDifference;
      }

      return String(researchEventId(first) || "").localeCompare(
        String(researchEventId(second) || "")
      );
    })
    .slice(0, resultLimit);

  const selectedOptionLabel = (group) =>
    group.options.find((option) => option.value === group.value)?.label ||
    group.value;

  const renderFilter = (group) => (
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
        onChange={(event) => group.onChange(event.target.value)}
      >
        {group.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

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

        {activeFilterCount > 0 && (
          <section className="atlas-sidebar-active" aria-label={text.activeFilters}>
            <div className="atlas-sidebar-active-head">
              <span>{text.activeFilters}</span>
              <button type="button" onClick={onResetFilters}>
                {text.clearAll}
              </button>
            </div>
            <div className="atlas-sidebar-chips">
              {hasSearch && (
                <button type="button" onClick={() => setSearchQuery("")}>
                  <span>{text.search}</span>
                  <strong>{searchQuery.trim()}</strong>
                  <i aria-hidden="true">×</i>
                </button>
              )}
              {hasYearFilter && (
                <button type="button" onClick={() => setYearFilter(maxYear)}>
                  <span>{text.year}</span>
                  <strong>{yearFilter}</strong>
                  <i aria-hidden="true">×</i>
                </button>
              )}
              {activeGroups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => group.onChange("All")}
                >
                  <span>{group.label}</span>
                  <strong>{selectedOptionLabel(group)}</strong>
                  <i aria-hidden="true">×</i>
                </button>
              ))}
            </div>
          </section>
        )}

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
            {primaryFilters.map(renderFilter)}
          </div>

          <div className={`atlas-sidebar-advanced ${advancedOpen ? "is-open" : ""}`}>
            <button
              className="atlas-sidebar-advanced-toggle"
              type="button"
              aria-expanded={advancedOpen}
              aria-controls="atlas-advanced-filters"
              onClick={() => setAdvancedOpen((current) => !current)}
            >
              <span>{text.advancedFilters}</span>
              {activeAdvancedCount > 0 && <strong>{activeAdvancedCount}</strong>}
              <i aria-hidden="true" />
            </button>
            <div id="atlas-advanced-filters" className="atlas-sidebar-advanced-content">
              <div className="atlas-sidebar-fieldset">
                {advancedFilters.map(renderFilter)}
              </div>
            </div>
          </div>
        </section>

        <section className="atlas-sidebar-section atlas-sidebar-results">
          <div className="atlas-sidebar-results-head">
            <div>
              <span>{text.resultList}</span>
              <small>{text.resultOrder}</small>
            </div>
            <strong>{filteredEvents.length}</strong>
          </div>

          <div className="atlas-sidebar-result-list">
            {visibleResults.map((event) => {
              const eventId = researchEventId(event);
              const eventYear = extractYear(event.date);
              const eventTitle =
                localizedBridgeDisplayName(event, language) ||
                event.municipality ||
                eventId;
              const place = [event.municipality, event.province]
                .filter(Boolean)
                .filter((value, index, values) => values.indexOf(value) === index)
                .join(" · ");

              return (
                <button
                  className={event.event_id === selectedEventId ? "is-selected" : ""}
                  key={event.event_id}
                  type="button"
                  onClick={() => onSelectEvent?.(event)}
                >
                  <i
                    aria-hidden="true"
                    style={{
                      backgroundColor: causeColors[event.specific_cause] || "#4f6b82",
                    }}
                  />
                  <span>
                    <small>{eventId}</small>
                    <strong>{eventTitle}</strong>
                    <em>{place || (it ? "Territorio non specificato" : "Territory unspecified")}</em>
                  </span>
                  <span className="atlas-sidebar-result-meta">
                    <b>{event.collapse_severity || "—"}</b>
                    <small>{eventYear || "—"}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {filteredEvents.length > resultLimit && (
            <p className="atlas-sidebar-results-note">
              {it
                ? `Primi ${resultLimit} di ${filteredEvents.length}. ${text.refineResults}`
                : `First ${resultLimit} of ${filteredEvents.length}. ${text.refineResults}`}
            </p>
          )}
        </section>
      </aside>
    </>
  );
}

export default Sidebar;
