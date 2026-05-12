import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../styles/atlas/atlas-page.css";

import extractYear from "../utils/extractYear";

import Sidebar from "../components/layout/Sidebar";

import CollapseMap from "../components/map/CollapseMap";

function AtlasPage() {

  const [events, setEvents] =
    useState([]);

  const [sources, setSources] =
    useState([]);

  const [causeFilter, setCauseFilter] =
    useState("All");

  const [
    severityFilter,
    setSeverityFilter,
  ] = useState("All");

  const [
    triggeredFilter,
    setTriggeredFilter,
  ] = useState("All");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [yearFilter, setYearFilter] =
    useState(2025);

  /* ================================= */
  /* DATA */
  /* ================================= */

  useEffect(() => {

    fetch("/data/events.json")
      .then((response) =>
        response.json()
      )
      .then((data) => {

        setEvents(data);

        const years = data
          .map((e) =>
            extractYear(e.date)
          )
          .filter(Boolean);

        if (years.length > 0) {

          setYearFilter(
            Math.max(...years)
          );
        }
      });

    fetch("/data/sources.json")
      .then((response) =>
        response.json()
      )
      .then((data) =>
        setSources(data)
      );

  }, []);

  /* ================================= */
  /* YEARS */
  /* ================================= */

  const minYear = useMemo(() => {

    if (!events.length) {
      return 2000;
    }

    const years = events
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.min(...years);

  }, [events]);

  const maxYear = useMemo(() => {

    if (!events.length) {
      return 2025;
    }

    const years = events
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.max(...years);

  }, [events]);

  /* ================================= */
  /* SOURCES */
  /* ================================= */

  const sourcesByEvent =
    useMemo(() => {

      const map = {};

      sources.forEach((source) => {

        if (
          !map[source.event_id]
        ) {
          map[source.event_id] = [];
        }

        map[
          source.event_id
        ].push(source);

      });

      return map;

    }, [sources]);

  /* ================================= */
  /* FILTER */
  /* ================================= */

  const filteredEvents =
    useMemo(() => {

      return events.filter(
        (event) => {

          const causeMatch =
            causeFilter === "All" ||
            event.specific_cause ===
              causeFilter;

          const severityMatch =
            severityFilter === "All" ||
            event.collapse_severity ===
              severityFilter;

          const triggeredMatch =
            triggeredFilter === "All" ||
            String(event.triggered)
              .toUpperCase() ===
              triggeredFilter;

          const eventYear =
            extractYear(event.date);

          const yearMatch =
            !eventYear ||
            eventYear <= yearFilter;

          return (
            causeMatch &&
            severityMatch &&
            triggeredMatch &&
            yearMatch
          );
        }
      );

    }, [
      events,
      causeFilter,
      severityFilter,
      triggeredFilter,
      yearFilter,
    ]);

  /* ================================= */
  /* STATS */
  /* ================================= */

  const stats = useMemo(() => {

    return {

      totalTC:
        filteredEvents.filter(
          (e) =>
            e.collapse_severity ===
            "TC"
        ).length,

      totalPC:
        filteredEvents.filter(
          (e) =>
            e.collapse_severity ===
            "PC"
        ).length,

      totalTriggered:
        filteredEvents.filter(
          (e) => e.triggered
        ).length,

    };

  }, [filteredEvents]);

  /* ================================= */
  /* CAUSES */
  /* ================================= */

  const uniqueCauses =
    useMemo(() => {

      return [
        "All",

        ...new Set(
          events
            .map(
              (e) =>
                e.specific_cause
            )
            .filter(Boolean)
        ),
      ];

    }, [events]);

  return (

    <div className="atlas-page">

      <div
        className={
          sidebarOpen
            ? "atlas-layout"
            : "atlas-layout sidebar-closed"
        }
      >

        {/* SIDEBAR */}

        <div className="atlas-sidebar-wrapper">

          <Sidebar
            sidebarOpen={
              sidebarOpen
            }

            filteredEvents={
              filteredEvents
            }

            totalTriggered={
              stats.totalTriggered
            }

            totalTC={
              stats.totalTC
            }

            totalPC={
              stats.totalPC
            }

            yearFilter={
              yearFilter
            }

            setYearFilter={
              setYearFilter
            }

            minYear={minYear}

            maxYear={maxYear}

            causeFilter={
              causeFilter
            }

            setCauseFilter={
              setCauseFilter
            }

            severityFilter={
              severityFilter
            }

            setSeverityFilter={
              setSeverityFilter
            }

            triggeredFilter={
              triggeredFilter
            }

            setTriggeredFilter={
              setTriggeredFilter
            }

            uniqueCauses={
              uniqueCauses
            }
          />

        </div>

        {/* MAP */}

        <div className="atlas-map-wrapper">

          <CollapseMap
            filteredEvents={
              filteredEvents
            }

            sourcesByEvent={
              sourcesByEvent
            }
          />

        </div>

        {/* TOGGLE */}

        <button
          className="atlas-toggle"
          onClick={() =>
            setSidebarOpen(
              !sidebarOpen
            )
          }
        >
          {sidebarOpen
            ? "✕"
            : "☰"}
        </button>

      </div>

    </div>
  );
}

export default AtlasPage;