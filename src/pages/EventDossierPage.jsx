import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import logoMark from "../assets/logo/logo-mark.svg";
import PageMeta from "../components/layout/PageMeta";
import EventPopup from "../components/popup/EventPopup";
import useLanguage from "../context/useLanguage";
import { openEpisodes, openEvents, openManifest, openSources } from "../utils/apiClient";
import { localizedBridgeDisplayName } from "../utils/eventDisplayLabels";
import { researchEventId } from "../utils/eventIdentity";

import "../styles/atlas/event-dossier-page.css";

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

function EventDossierPage() {
  const { language } = useLanguage();
  const { eventSlug } = useParams();
  const location = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [event, setEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [episodes, setEpisodes] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("loading");
  const [sourcesStatus, setSourcesStatus] = useState("loading");
  const it = language === "it";

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setEvent(null);
        setEvents([]);
        setEpisodes(null);
        setManifest(null);
        setSources([]);
        setStatus("loading");
        setSourcesStatus("loading");
      }
    });

    openEvents()
      .then((items) => {
        if (cancelled) return;

        const normalized = items.map(normalizeEvent);
        const selected = normalized.find((item) =>
          [item.event_slug, item.event_id, researchEventId(item)]
            .filter(Boolean)
            .includes(eventSlug)
        );

        setEvents(normalized);
        setEvent(selected || null);
        setStatus(selected ? "available" : "not-found");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    openEpisodes()
      .then((data) => {
        if (!cancelled) setEpisodes(data);
      })
      .catch(() => {
        if (!cancelled) setEpisodes(null);
      });

    openSources()
      .then((items) => {
        if (!cancelled) {
          setSources(items.map(normalizeSource));
          setSourcesStatus("available");
        }
      })
      .catch(() => {
        if (!cancelled) setSourcesStatus("error");
      });

    openManifest()
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setManifest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attempt, eventSlug]);

  const relatedSources = useMemo(() => {
    if (!event) return [];
    return sources.filter((source) => source.event_id === event.event_id);
  }, [event, sources]);
  const sharedEpisode = useMemo(() => {
    if (!event || !episodes) return null;
    const episodeId = episodes.event_to_episode?.[event.event_id];
    return episodes.episodes?.find((item) => item.episode_id === episodeId) || null;
  }, [episodes, event]);
  const episodeEvents = useMemo(() => {
    if (!sharedEpisode) return [];
    const ids = new Set(sharedEpisode.event_ids || []);
    return events.filter((item) => ids.has(item.event_id));
  }, [events, sharedEpisode]);

  const requestedReturn = location.state?.atlasReturn;
  const atlasReturn =
    typeof requestedReturn === "string" && requestedReturn.startsWith("/atlas")
      ? requestedReturn
      : `/atlas?event=${encodeURIComponent(event?.event_slug || eventSlug || "")}`;
  const title = event
    ? localizedBridgeDisplayName(event, language) || researchEventId(event)
    : (it ? "Scheda evento" : "Event record");

  return (
    <div className="event-dossier-page">
      <PageMeta
        description={
          it
            ? "Scheda scientifica ARCUS di un evento documentato di cedimento di ponte."
            : "ARCUS scientific record for a documented bridge failure event."
        }
        noIndex={status !== "available"}
        title={title}
      />

      <header className="event-dossier-page__bar">
        <Link aria-label="ARCUS" className="event-dossier-page__brand" to="/">
          <img alt="" aria-hidden="true" src={logoMark} />
          <span>ARCUS</span>
          <small>{it ? "Scheda dell’Atlante" : "Atlas record"}</small>
        </Link>
        <Link className="event-dossier-page__back" to={atlasReturn}>
          <span aria-hidden="true">←</span>
          {it ? "Torna all’Atlante" : "Back to Atlas"}
        </Link>
      </header>

      {status === "loading" && (
        <main className="event-dossier-page__state" id="main-content">
          <span>ARCUS ATLAS</span>
          <h1>{it ? "Caricamento della scheda" : "Loading record"}</h1>
          <p>{it ? "Recupero del record e delle fonti documentate in corso." : "Retrieving the record and its documented sources."}</p>
        </main>
      )}

      {status === "error" && (
        <main className="event-dossier-page__state is-error" id="main-content">
          <span>ARCUS ATLAS</span>
          <h1>{it ? "Scheda non disponibile" : "Record unavailable"}</h1>
          <p>{it ? "Il dataset non è stato caricato. Nessun valore sostitutivo viene mostrato." : "The dataset could not be loaded. No substitute values are shown."}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            {it ? "Riprova" : "Retry"}
          </button>
        </main>
      )}

      {status === "not-found" && (
        <main className="event-dossier-page__state is-error" id="main-content">
          <span>ARCUS ATLAS</span>
          <h1>{it ? "Evento non trovato" : "Event not found"}</h1>
          <p>{it ? "L’identificativo richiesto non appartiene alla release pubblica corrente." : "The requested identifier is not part of the current public release."}</p>
          <Link to="/atlas">{it ? "Apri l’Atlante" : "Open Atlas"}</Link>
        </main>
      )}

      {status === "available" && event && (
        <EventPopup
          event={event}
          openRelease={manifest}
          episodeEvents={episodeEvents}
          relatedSources={relatedSources}
          sharedEpisode={sharedEpisode}
          sourcesStatus={sourcesStatus}
          standalone
        />
      )}
    </div>
  );
}

export default EventDossierPage;
