import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import "../styles/atlas/atlas-page.css";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";

/* LAYOUT */

import Sidebar from "../components/layout/Sidebar";
import PageMeta from "../components/layout/PageMeta";

/* MAP */

import CollapseMap from "../components/map/CollapseMap";

function normalizeEvent(event) {

  return {
    ...event,
    event_id:
      event.event_id ??
      event["\uFEFFevent_id"] ??
      event["ï»¿event_id"],
  };
}

function normalizeSource(source) {

  return {
    ...source,
    source_id:
      source.source_id ??
      source["\uFEFFsource_id"] ??
      source["ï»¿source_id"],
  };
}

function AtlasPage() {
  const { language } = useLanguage();

  const homeLabel =
    language === "it"
      ? "Torna ad ARCUS"
      : "Back to ARCUS";

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

    fetch("/data/processed/events.json")
      .then((response) =>
        response.json()
      )
      .then((data) => {

        const normalizedData =
          data.map(normalizeEvent);

        setEvents(normalizedData);

        const years = normalizedData
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

    fetch("/data/processed/sources.json")
      .then((response) =>
        response.json()
      )
      .then((data) =>
        setSources(
          data.map(normalizeSource)
        )
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
      id="main-content"
      style={{
        width: "100vw",

        height: "100vh",

        position: "relative",

        overflow: "hidden",

        background: "#ece8e2",
      }}
    >
      <PageMeta
        title="Atlas"
        description={
          language === "it"
            ? "Atlante geospaziale ARCUS dei crolli dei ponti, con eventi verificati, tassonomie, timeline e fonti documentate."
            : "ARCUS geospatial atlas of bridge collapses, with verified events, taxonomies, timeline and documented sources."
        }
      />

      {/* ================================= */}
      {/* SIDEBAR */}
      {/* ================================= */}

      <Link
        className="atlas-home-link"
        to="/"
      >
        {homeLabel}
      </Link>

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
