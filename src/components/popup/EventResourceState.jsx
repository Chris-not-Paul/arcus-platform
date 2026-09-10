export default function EventResourceState({ resource, language, absentMessage }) {
  const it = language === "it";
  if (resource.status === "available") return null;
  const error = resource.status === "error";
  const mismatch = resource.status === "mismatch";
  const loading = ["idle", "loading"].includes(resource.status);
  return (
    <div className={`arcus-event-resource-state is-${resource.status}`} role="status" aria-live="polite">
      <strong>{mismatch
        ? (it ? "Contesto da aggiornare" : "Context needs updating")
        : error
        ? (it ? "Caricamento non riuscito" : "Unable to load this section")
        : loading
          ? (it ? "Caricamento in corso…" : "Loading…")
          : (it ? "Copertura del dossier" : "Dossier coverage")}</strong>
      <p>{mismatch
        ? (it ? "La data o le coordinate del contesto differiscono dal record corrente. I valori restano sospesi fino all’aggiornamento." : "The context date or coordinates differ from the current record. Values are withheld pending an update.")
        : error
        ? (it ? "Il contenuto non è stato recuperato. Riprova per consultare questa sezione." : "The content could not be retrieved. Retry to view this section.")
        : loading
          ? (it ? "Recupero dei contenuti disponibili per questo evento." : "Retrieving the available content for this event.")
          : absentMessage}</p>
      {error && <button type="button" onClick={resource.retry}>{it ? "Riprova" : "Retry"}</button>}
    </div>
  );
}
