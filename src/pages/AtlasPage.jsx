import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "../styles/atlas/atlas-page.css";

import extractYear from "../utils/extractYear";

/* LAYOUT */

import Sidebar from "../components/layout/Sidebar";

/* MAP */

import CollapseMap from "../components/map/CollapseMap";

function AtlasPage() {

  /* ================================= */
  /* STATE */
  /* ================================= */

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
  /* DATA LOADING */
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
  /* SOURCES INDEX */
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
  /* FILTERED EVENTS */
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

  const totalTC =
    filteredEvents.filter(
      (e) =>
        e.collapse_severity === "TC"
    ).length;

  const totalPC =
    filteredEvents.filter(
      (e) =>
        e.collapse_severity === "PC"
    ).length;

  const totalTriggered =
    filteredEvents.filter(
      (e) => e.triggered
    ).length;

  /* ================================= */
  /* CAUSES */
  /* ================================= */

  const uniqueCauses = [

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

  /* ================================= */
  /* PAGE */
  /* ================================= */

  return (

    <div
      style={{
        width: "100vw",

        height: "100vh",

        position: "relative",

        overflow: "hidden",

        background: "#ece8e2",
      }}
    >

      {/* ================================= */}
      {/* SIDEBAR */}
      {/* ================================= */}

      <Sidebar

        sidebarOpen={
          sidebarOpen
        }

        setSidebarOpen={
          setSidebarOpen
        }

        filteredEvents={
          filteredEvents
        }

        totalTriggered={
          totalTriggered
        }

        totalTC={totalTC}

        totalPC={totalPC}

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

      {/* ================================= */}
      {/* MAP */}
      {/* ================================= */}

      <div
        style={{
          position: "absolute",

          inset: 0,

          zIndex: 1,
        }}
      >

        <CollapseMap

          filteredEvents={
            filteredEvents
          }

          sourcesByEvent={
            sourcesByEvent
          }

          sidebarOpen={
            sidebarOpen
          }
        />

      </div>

    </div>
  );
}

export default AtlasPage;