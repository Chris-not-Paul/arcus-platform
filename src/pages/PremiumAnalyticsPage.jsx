import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";
import taxonomyLabel from "../utils/taxonomyLabels";

import "../styles/analytics/premium-analytics-page.css";

const ALL = "All";

function countBy(items, getter) {
  return Object.entries(
    items.reduce((accumulator, item) => {
      const value =
        typeof getter === "function"
          ? getter(item)
          : item[getter];

      if (!value) {
        return accumulator;
      }

      accumulator[value] =
        (accumulator[value] || 0) + 1;

      return accumulator;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
}

function sumBy(items, getter) {
  return items.reduce(
    (total, item) =>
      total + (Number(getter(item)) || 0),
    0
  );
}

function uniqueValues(items, key) {
  return [
    ALL,
    ...new Set(
      items
        .map((item) => item[key])
        .filter(Boolean)
        .sort()
    ),
  ];
}

function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

function toCsvValue(value) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function RankingList({
  items,
  total,
  label,
}) {
  const maxValue =
    Math.max(...items.map((item) => item[1]), 1);

  return (
    <div className="premium-ranking-list">
      {items.map(([name, value]) => (
        <div
          className="premium-ranking-row"
          key={name}
        >
          <div className="premium-ranking-meta">
            <span>{name}</span>
            <strong>
              {formatValue(value)}
              {label ? ` ${label}` : ""}
            </strong>
          </div>

          <div className="premium-ranking-track">
            <div
              className="premium-ranking-fill"
              style={{
                width: `${Math.max(
                  4,
                  (value / maxValue) * 100
                )}%`,
              }}
            />
          </div>

          <div className="premium-ranking-share">
            {percentage(value, total)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  formatOption = (option) => option,
}) {
  return (
    <label className="premium-filter">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PremiumAnalyticsPage() {
  const { language } = useLanguage();

  const copy =
    language === "it"
      ? {
          briefing: "BRIEFING AI-READY",
          briefingTitle:
            "Sintesi intelligence generata",
          cause: "Causa",
          confidence: "Confidenza",
          controlledAccess: "ACCESSO CONTROLLATO",
          exportCsv: "Esporta CSV",
          filteredEvents: "Eventi filtrati",
          fromYear: "Da anno",
          heading: "Vista Intelligence Professionale",
          highestImpact: "Maggiore impatto umano",
          impact: "IMPATTO",
          material: "Materiale",
          minSources: "Fonti minime",
          professionalLayer:
            "Layer professionale controllato per intelligence filtrata, dati esportabili e briefing istituzionali.",
          ranking: "RANKING",
          region: "Regione",
          regionBenchmark: "Benchmark territoriale",
          regionalConcentration:
            "Concentrazione regionale",
          resetFilters: "Reset filtri",
          reviewEvents:
            "Eventi da rivedere",
          severity: "Gravita",
          sourceCoverage: "Copertura fonti",
          title:
            "Workspace Analytics Avanzato",
          toYear: "Ad anno",
          traceability: "TRACCIABILITA",
          triggered: "Innescato",
          use: "Uso",
          workspaceStatus: "Demo Premium v1",
          mechanism: "MECCANISMO",
          causeProfile: "Profilo cause",
          comparative: "COMPARATIVA",
          structuralType: "Tipologia strutturale",
        }
      : {
          briefing: "AI-READY BRIEFING",
          briefingTitle:
            "Generated intelligence summary",
          cause: "Cause",
          confidence: "Confidence",
          controlledAccess: "CONTROLLED ACCESS",
          exportCsv: "Export CSV",
          filteredEvents: "Filtered events",
          fromYear: "From year",
          heading: "Professional Intelligence View",
          highestImpact: "Highest human impact",
          impact: "IMPACT",
          material: "Material",
          minSources: "Min sources",
          professionalLayer:
            "Controlled professional layer for filtered intelligence, exportable data and institutional briefings.",
          ranking: "RANKING",
          region: "Region",
          regionBenchmark: "Region benchmark",
          regionalConcentration:
            "Regional concentration",
          resetFilters: "Reset filters",
          reviewEvents:
            "Events needing review",
          severity: "Severity",
          sourceCoverage: "Source coverage",
          title:
            "Advanced Analytics Workspace",
          toYear: "To year",
          traceability: "TRACEABILITY",
          triggered: "Triggered",
          use: "Use",
          workspaceStatus: "Demo Premium v1",
          mechanism: "MECHANISM",
          causeProfile: "Cause profile",
          comparative: "COMPARATIVE",
          structuralType: "Structural type",
        };

  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);

  const [filters, setFilters] = useState({
    cause: ALL,
    confidence: ALL,
    fromYear: 2000,
    material: ALL,
    minSources: 0,
    region: ALL,
    severity: ALL,
    structuralType: ALL,
    toYear: 2026,
    triggered: ALL,
    use: ALL,
  });

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then(setEvents);

    fetch("/data/processed/sources.json")
      .then((response) => response.json())
      .then(setSources);
  }, []);

  const sourceCountByEvent = useMemo(() => {
    return sources.reduce((accumulator, source) => {
      accumulator[source.event_id] =
        (accumulator[source.event_id] || 0) + 1;

      return accumulator;
    }, {});
  }, [sources]);

  const years = useMemo(() => {
    const eventYears = events
      .map((event) => extractYear(event.date))
      .filter(Boolean);

    return {
      max:
        eventYears.length > 0
          ? Math.max(...eventYears)
          : 2026,
      min:
        eventYears.length > 0
          ? Math.min(...eventYears)
          : 2000,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const year = extractYear(event.date);
      const sourceCount =
        sourceCountByEvent[event.event_id] || 0;

      const checks = [
        filters.region === ALL ||
          event.region === filters.region,
        filters.cause === ALL ||
          event.specific_cause === filters.cause,
        filters.severity === ALL ||
          event.collapse_severity ===
            filters.severity,
        filters.material === ALL ||
          event.material_type === filters.material,
        filters.structuralType === ALL ||
          event.structural_type ===
            filters.structuralType,
        filters.use === ALL ||
          event.destination_use === filters.use,
        filters.confidence === ALL ||
          String(event.source_confidence)
            .toLowerCase() ===
            filters.confidence.toLowerCase(),
        filters.triggered === ALL ||
          String(event.triggered) ===
            filters.triggered,
        !year ||
          (year >= filters.fromYear &&
            year <= filters.toYear),
        sourceCount >= Number(filters.minSources),
      ];

      return checks.every(Boolean);
    });
  }, [
    events,
    filters,
    sourceCountByEvent,
  ]);

  const analytics = useMemo(() => {
    const total = filteredEvents.length;
    const totalCollapse =
      filteredEvents.filter(
        (event) =>
          event.collapse_severity === "TC"
      ).length;
    const triggered =
      filteredEvents.filter(
        (event) => event.triggered
      ).length;
    const fatalEvents =
      filteredEvents.filter(
        (event) => Number(event.victims) > 0
      ).length;

    const filteredSourceTotal =
      filteredEvents.reduce(
        (totalSources, event) =>
          totalSources +
          (sourceCountByEvent[event.event_id] || 0),
        0
      );

    return {
      causeRanking: countBy(
        filteredEvents,
        "specific_cause"
      ),
      exactLocations: filteredEvents.filter(
        (event) => event.exact_location
      ).length,
      fatalEvents,
      filteredSourceTotal,
      impactRanking: [...filteredEvents]
        .sort(
          (a, b) =>
            (Number(b.victims) || 0) -
              (Number(a.victims) || 0) ||
            (Number(b.injuries) || 0) -
              (Number(a.injuries) || 0)
        )
        .slice(0, 5),
      injuries: sumBy(
        filteredEvents,
        (event) => event.injuries
      ),
      regionRanking: countBy(
        filteredEvents,
        "region"
      ).slice(0, 8),
      sourceWeakEvents: [...filteredEvents]
        .sort(
          (a, b) =>
            (sourceCountByEvent[a.event_id] || 0) -
            (sourceCountByEvent[b.event_id] || 0)
        )
        .slice(0, 5),
      total,
      totalCollapse,
      triggered,
      victims: sumBy(
        filteredEvents,
        (event) => event.victims
      ),
    };
  }, [
    filteredEvents,
    sourceCountByEvent,
  ]);

  const comparison = useMemo(() => {
    const regions = countBy(events, "region");
    const firstRegion =
      filters.region !== ALL
        ? filters.region
        : regions[0]?.[0];
    const secondRegion =
      regions.find(([region]) => region !== firstRegion)
        ?.[0];

    const buildProfile = (region) => {
      const regionEvents = events.filter(
        (event) => event.region === region
      );
      const total = regionEvents.length;

      return {
        fatalEvents: regionEvents.filter(
          (event) => Number(event.victims) > 0
        ).length,
        region,
        topCause:
          countBy(regionEvents, "specific_cause")[0]
            ?.[0] || "-",
        total,
        totalCollapse: regionEvents.filter(
          (event) =>
            event.collapse_severity === "TC"
        ).length,
        triggered: regionEvents.filter(
          (event) => event.triggered
        ).length,
      };
    };

    return [
      firstRegion ? buildProfile(firstRegion) : null,
      secondRegion ? buildProfile(secondRegion) : null,
    ].filter(Boolean);
  }, [events, filters.region]);

  const briefing = useMemo(() => {
    const topCause =
      analytics.causeRanking[0]?.[0] || "n/a";
    const topRegion =
      analytics.regionRanking[0]?.[0] || "n/a";
    const sourceAverage =
      analytics.total > 0
        ? (
            analytics.filteredSourceTotal /
            analytics.total
          ).toFixed(1)
        : "0.0";

    return [
      `${formatValue(
        analytics.total
      )} events match the current professional filter set.`,
      `${percentage(
        analytics.totalCollapse,
        analytics.total
      )}% are total collapses and ${percentage(
        analytics.triggered,
        analytics.total
      )}% are event-driven failures.`,
      `The leading mechanism is ${topCause}, with the strongest territorial concentration in ${topRegion}.`,
      `The filtered evidence base averages ${sourceAverage} sources per event.`,
    ];
  }, [analytics]);

  const setFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      cause: ALL,
      confidence: ALL,
      fromYear: years.min,
      material: ALL,
      minSources: 0,
      region: ALL,
      severity: ALL,
      structuralType: ALL,
      toYear: years.max,
      triggered: ALL,
      use: ALL,
    });
  };

  const exportFilteredEvents = () => {
    const columns = [
      "event_id",
      "date",
      "municipality",
      "province",
      "region",
      "specific_cause",
      "collapse_severity",
      "triggered",
      "material_type",
      "structural_type",
      "destination_use",
      "source_confidence",
      "victims",
      "injuries",
      "source_count",
    ];

    const rows = filteredEvents.map((event) => ({
      ...event,
      source_count:
        sourceCountByEvent[event.event_id] || 0,
    }));

    const csv = [
      columns.join(","),
      ...rows.map((row) =>
        columns
          .map((column) => toCsvValue(row[column]))
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "arcus-premium-filtered-events.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="premium-page"
      id="main-content"
    >
      <PageMeta
        title="Premium Analytics"
        description={
          language === "it"
            ? "Workspace professionale ARCUS per filtri avanzati, export dati, briefing istituzionali e analytics comparativi."
            : "ARCUS professional workspace for advanced filtering, data export, institutional briefings and comparative analytics."
        }
      />

      <Navbar />

      <section className="premium-shell">
        <aside className="premium-sidebar">
          <div className="premium-sidebar-header">
            <span>ARCUS PREMIUM</span>
            <h1>{copy.title}</h1>
            <p>
              {copy.professionalLayer}
            </p>
          </div>

          <div className="premium-filter-grid">
            <FilterSelect
              label={copy.region}
              value={filters.region}
              options={uniqueValues(events, "region")}
              formatOption={(option) =>
                option === ALL && language === "it"
                  ? "Tutti"
                  : option
              }
              onChange={(value) =>
                setFilter("region", value)
              }
            />

            <FilterSelect
              label={copy.cause}
              value={filters.cause}
              options={uniqueValues(
                events,
                "specific_cause"
              )}
              formatOption={(option) =>
                option === ALL
                  ? language === "it"
                    ? "Tutti"
                    : ALL
                  : taxonomyLabel(
                      "cause",
                      option,
                      language
                    )
              }
              onChange={(value) =>
                setFilter("cause", value)
              }
            />

            <FilterSelect
              label={copy.severity}
              value={filters.severity}
              options={[ALL, "TC", "PC"]}
              formatOption={(option) =>
                option === ALL && language === "it"
                  ? "Tutti"
                  : option
              }
              onChange={(value) =>
                setFilter("severity", value)
              }
            />

            <FilterSelect
              label={copy.triggered}
              value={filters.triggered}
              options={[ALL, "true", "false"]}
              formatOption={(option) => {
                if (option === ALL) {
                  return language === "it" ? "Tutti" : ALL;
                }

                return option === "true"
                  ? language === "it"
                    ? "Si"
                    : "True"
                  : language === "it"
                    ? "No"
                    : "False";
              }}
              onChange={(value) =>
                setFilter("triggered", value)
              }
            />

            <FilterSelect
              label={copy.material}
              value={filters.material}
              options={uniqueValues(
                events,
                "material_type"
              )}
              formatOption={(option) =>
                option === ALL
                  ? language === "it"
                    ? "Tutti"
                    : ALL
                  : taxonomyLabel(
                      "material",
                      option,
                      language
                    )
              }
              onChange={(value) =>
                setFilter("material", value)
              }
            />

            <FilterSelect
              label={copy.structuralType}
              value={filters.structuralType}
              options={uniqueValues(
                events,
                "structural_type"
              )}
              formatOption={(option) =>
                option === ALL
                  ? language === "it"
                    ? "Tutti"
                    : ALL
                  : taxonomyLabel(
                      "structuralType",
                      option,
                      language
                    )
              }
              onChange={(value) =>
                setFilter("structuralType", value)
              }
            />

            <FilterSelect
              label={copy.use}
              value={filters.use}
              options={uniqueValues(
                events,
                "destination_use"
              )}
              formatOption={(option) =>
                option === ALL
                  ? language === "it"
                    ? "Tutti"
                    : ALL
                  : taxonomyLabel(
                      "use",
                      option,
                      language
                    )
              }
              onChange={(value) =>
                setFilter("use", value)
              }
            />

            <FilterSelect
              label={copy.confidence}
              value={filters.confidence}
              options={uniqueValues(
                events,
                "source_confidence"
              )}
              formatOption={(option) =>
                option === ALL && language === "it"
                  ? "Tutti"
                  : option
              }
              onChange={(value) =>
                setFilter("confidence", value)
              }
            />

            <label className="premium-filter">
              <span>{copy.fromYear}</span>
              <input
                min={years.min}
                max={years.max}
                type="number"
                value={filters.fromYear}
                onChange={(event) =>
                  setFilter(
                    "fromYear",
                    Number(event.target.value)
                  )
                }
              />
            </label>

            <label className="premium-filter">
              <span>{copy.toYear}</span>
              <input
                min={years.min}
                max={years.max}
                type="number"
                value={filters.toYear}
                onChange={(event) =>
                  setFilter(
                    "toYear",
                    Number(event.target.value)
                  )
                }
              />
            </label>

            <label className="premium-filter">
              <span>{copy.minSources}</span>
              <input
                min="0"
                type="number"
                value={filters.minSources}
                onChange={(event) =>
                  setFilter(
                    "minSources",
                    Number(event.target.value)
                  )
                }
              />
            </label>
          </div>

          <div className="premium-actions">
            <button
              type="button"
              onClick={resetFilters}
            >
              {copy.resetFilters}
            </button>

            <button
              type="button"
              onClick={exportFilteredEvents}
            >
              {copy.exportCsv}
            </button>
          </div>
        </aside>

        <main className="premium-main">
          <div className="premium-topbar">
            <div>
              <span>{copy.controlledAccess}</span>
              <h2>{copy.heading}</h2>
            </div>

            <div className="premium-status">
              {copy.workspaceStatus}
            </div>
          </div>

          <div className="premium-kpi-grid">
            {[
              {
                label: copy.filteredEvents,
                value: analytics.total,
                detail: `${percentage(
                  analytics.total,
                  events.length
                )}% of archive`,
              },
              {
                label: "Total collapse share",
                value: `${percentage(
                  analytics.totalCollapse,
                  analytics.total
                )}%`,
                detail: `${analytics.totalCollapse} TC records`,
              },
              {
                label: "Triggered share",
                value: `${percentage(
                  analytics.triggered,
                  analytics.total
                )}%`,
                detail: `${analytics.triggered} event-driven`,
              },
              {
                label: copy.sourceCoverage,
                value:
                  analytics.total > 0
                    ? (
                        analytics.filteredSourceTotal /
                        analytics.total
                      ).toFixed(1)
                    : "0.0",
                detail: "avg. sources per event",
              },
            ].map((item) => (
              <div
                className="premium-kpi-card"
                key={item.label}
              >
                <div>{item.value}</div>
                <span>{item.label}</span>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>

          <section className="premium-grid two">
            <div className="premium-panel">
              <div className="premium-panel-heading">
                <span>{copy.ranking}</span>
                <h3>{copy.regionalConcentration}</h3>
              </div>

              <RankingList
                items={analytics.regionRanking}
                total={analytics.total}
                label="events"
              />
            </div>

            <div className="premium-panel">
              <div className="premium-panel-heading">
                <span>{copy.mechanism}</span>
                <h3>{copy.causeProfile}</h3>
              </div>

              <RankingList
                items={analytics.causeRanking.slice(
                  0,
                  8
                )}
                total={analytics.total}
                label="events"
              />
            </div>
          </section>

          <section className="premium-grid three">
            <div className="premium-panel">
              <div className="premium-panel-heading">
                <span>{copy.comparative}</span>
                <h3>{copy.regionBenchmark}</h3>
              </div>

              <div className="premium-comparison">
                {comparison.map((profile) => (
                  <div
                    className="premium-compare-card"
                    key={profile.region}
                  >
                    <strong>{profile.region}</strong>
                    <span>
                      {profile.total} events
                    </span>
                    <span>
                      {percentage(
                        profile.totalCollapse,
                        profile.total
                      )}
                      % TC
                    </span>
                    <span>
                      {percentage(
                        profile.triggered,
                        profile.total
                      )}
                      % triggered
                    </span>
                    <span>
                      Top cause: {profile.topCause}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="premium-panel">
              <div className="premium-panel-heading">
                <span>{copy.impact}</span>
                <h3>{copy.highestImpact}</h3>
              </div>

              <div className="premium-event-list">
                {analytics.impactRanking.map(
                  (event) => (
                    <div
                      className="premium-event-row"
                      key={event.event_id}
                    >
                      <strong>
                        {event.municipality},{" "}
                        {event.region}
                      </strong>
                      <span>
                        {extractYear(event.date)} ·{" "}
                        {event.victims || 0} fatalities ·{" "}
                        {event.injuries || 0} injuries
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="premium-panel">
              <div className="premium-panel-heading">
                <span>{copy.traceability}</span>
                <h3>{copy.reviewEvents}</h3>
              </div>

              <div className="premium-event-list">
                {analytics.sourceWeakEvents.map(
                  (event) => (
                    <div
                      className="premium-event-row"
                      key={event.event_id}
                    >
                      <strong>
                        {event.municipality},{" "}
                        {event.region}
                      </strong>
                      <span>
                        {sourceCountByEvent[
                          event.event_id
                        ] || 0}{" "}
                        sources ·{" "}
                        {event.source_confidence}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          <section className="premium-briefing">
            <div className="premium-panel-heading">
              <span>{copy.briefing}</span>
              <h3>{copy.briefingTitle}</h3>
            </div>

            <div className="premium-briefing-grid">
              {briefing.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}

export default PremiumAnalyticsPage;
