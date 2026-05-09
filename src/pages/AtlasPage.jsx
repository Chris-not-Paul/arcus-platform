import {
  useEffect,
  useMemo,
  useState,
} from "react";

import extractYear from "../utils/extractYear";

import Sidebar from "../components/layout/Sidebar";

import CollapseMap from "../components/map/CollapseMap";

function AtlasPage() {
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);

  const [causeFilter, setCauseFilter] =
    useState("All");

  const [severityFilter, setSeverityFilter] =
    useState("All");

  const [triggeredFilter, setTriggeredFilter] =
    useState("All");

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const [yearFilter, setYearFilter] =
    useState(2025);

  /* -------------------------------- */
  /* DATA LOADING */
  /* -------------------------------- */

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

  /* -------------------------------- */
  /* YEARS */
  /* -------------------------------- */

  const minYear = useMemo(() => {
    if (!events.length) return 2000;

    const years = events
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.min(...years);
  }, [events]);

  const maxYear = useMemo(() => {
    if (!events.length) return 2025;

    const years = events
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.max(...years);
  }, [events]);

  /* -------------------------------- */
  /* SOURCES INDEX */
  /* -------------------------------- */

  const sourcesByEvent =
    useMemo(() => {
      const map = {};

      sources.forEach((source) => {
        if (
          !map[source.event_id]
        ) {
          map[source.event_id] =
            [];
        }

        map[
          source.event_id
        ].push(source);
      });

      return map;
    }, [sources]);

  /* -------------------------------- */
  /* FILTERED EVENTS */
  /* -------------------------------- */

  const filteredEvents =
    useMemo(() => {
      return events.filter(
        (event) => {
          const causeMatch =
            causeFilter ===
              "All" ||
            event.specific_cause ===
              causeFilter;

          const severityMatch =
            severityFilter ===
              "All" ||
            event.collapse_severity ===
              severityFilter;

          const triggeredMatch =
            triggeredFilter ===
              "All" ||
            String(
              event.triggered
            ).toUpperCase() ===
              triggeredFilter;

          const eventYear =
            extractYear(
              event.date
            );

          const yearMatch =
            !eventYear ||
            eventYear <=
              yearFilter;

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

  /* -------------------------------- */
  /* STATS */
  /* -------------------------------- */

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

  /* -------------------------------- */
  /* CAUSES */
  /* -------------------------------- */

  const uniqueCauses = useMemo(() => {
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
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        background: "#ece8e2",
        display: "flex",
      }}
    >
      {/* TOGGLE */}

      <button
        onClick={() =>
          setSidebarOpen(
            !sidebarOpen
          )
        }
        style={{
          position: "absolute",
          top: 18,
          left: sidebarOpen
            ? 286
            : 18,
          zIndex: 3000,
          background:
            "rgba(248,246,243,0.92)",
          border:
            "1px solid rgba(0,0,0,0.06)",
          borderRadius: "14px",
          width: "46px",
          height: "46px",
          cursor: "pointer",
          boxShadow:
            "0 8px 22px rgba(0,0,0,0.10)",
          fontWeight: 700,
          fontSize: "18px",
          transition:
            "all 0.28s ease",
          backdropFilter:
            "blur(14px)",
          color: "#3d3935",
        }}
      >
        {sidebarOpen
          ? "✕"
          : "☰"}
      </button>

      {/* SIDEBAR */}

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
        totalTC={stats.totalTC}
        totalPC={stats.totalPC}
        yearFilter={yearFilter}
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

      {/* MAP */}

      <CollapseMap
        filteredEvents={
          filteredEvents
        }
        sourcesByEvent={
          sourcesByEvent
        }
      />
    </div>
  );
}

export default AtlasPage;