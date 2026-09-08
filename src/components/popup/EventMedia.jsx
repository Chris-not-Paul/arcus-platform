function phaseLabel(phase, it) {
  const labels = {
    event_day: it ? "Giorno dell’evento" : "Event day",
    historical_predecessor: it ? "Predecessore storico" : "Historical predecessor",
    pre_event: it ? "Prima dell’evento" : "Pre-event",
    post_event: it ? "Dopo l’evento" : "Post-event",
    post_event_reconstruction: it ? "Ricostruzione successiva" : "Post-event reconstruction",
    post_event_response: it ? "Risposta successiva all’evento" : "Post-event response",
  };

  return labels[phase] || (it ? "Contesto documentale" : "Documentary context");
}

function EventMedia({ assets, featured = false, language = "it" }) {
  const it = language === "it";
  const hasEmbeddedMedia = assets.some((asset) => Boolean(asset.file));
  const hasSourceLinks = assets.some((asset) => !asset.file);

  if (!assets.length) {
    return null;
  }

  return (
    <section className={`arcus-event-media ${featured ? "is-featured" : "is-gallery"}`}>
      {!featured && (
        <header>
          <span>{it ? "Indice visivo documentato" : "Documented visual index"}</span>
          <h3>{it ? "Immagini e fonti visive" : "Imagery and visual sources"}</h3>
          <p>
            {hasEmbeddedMedia && hasSourceLinks
              ? it
                ? "ARCUS incorpora i contenuti con riuso verificato e, negli altri casi, rimanda alla fonte senza riprodurne l’anteprima."
                : "ARCUS embeds media with verified reuse terms and otherwise links to the source without reproducing a preview."
              : hasEmbeddedMedia
                ? it
                  ? "Contenuti pubblicati soltanto quando autore, fonte e condizioni di riuso sono verificabili."
                  : "Media are published only when creator, source and reuse terms can be verified."
                : it
                  ? "Le fonti visive sono collegate senza riprodurne l’anteprima quando i diritti di riuso non sono verificati o non sono compatibili con la pubblicazione ARCUS."
                  : "Visual sources are linked without reproducing a preview when reuse rights are not stated."}
          </p>
        </header>
      )}

      <div className="arcus-event-media-grid">
        {assets.map((asset) => (
          <figure key={asset.media_id}>
            <div
              className={`arcus-event-media-frame ${asset.file ? "" : "is-link-only"}`}
            >
              {asset.file ? (
                <img
                  alt={it ? asset.alt_it : asset.alt_en}
                  decoding="async"
                  loading="lazy"
                  src={asset.file}
                />
              ) : (
                <a href={asset.source_page_url} target="_blank" rel="noreferrer">
                  <strong>
                    {asset.type === "video_link"
                      ? it
                        ? "Video nella fonte"
                        : "Video at source"
                      : it
                        ? "Fotografia nella fonte"
                        : "Photograph at source"}
                  </strong>
                  <small>
                    {it
                      ? "Anteprima non riprodotta: il riuso in ARCUS non è autorizzato o verificato."
                      : "Preview not reproduced: reuse rights are not stated."}
                  </small>
                </a>
              )}
              <span>{phaseLabel(asset.event_phase, it)}</span>
            </div>
            <figcaption>
              <p>{it ? asset.caption_it : asset.caption_en}</p>
              <div className="arcus-event-media-credit">
                <span>{asset.credit_line}</span>
                <span aria-hidden="true">·</span>
                <a href={asset.source_page_url} target="_blank" rel="noreferrer">
                  {it ? "Scheda originale" : "Original record"}
                </a>
                <span aria-hidden="true">·</span>
                {asset.license_url ? (
                  <a href={asset.license_url} target="_blank" rel="noreferrer">
                    {asset.license_id}
                  </a>
                ) : (
                  <span>{it ? "Solo collegamento" : "Link only"}</span>
                )}
              </div>
              {!featured && (
                <dl>
                  <div>
                    <dt>{it ? "Acquisizione" : "Captured"}</dt>
                    <dd>{asset.captured_at}</dd>
                  </div>
                  <div>
                    <dt>{it ? "Verifica diritti" : "Rights verified"}</dt>
                    <dd>{asset.rights_verified_at}</dd>
                  </div>
                  <div>
                    <dt>{it ? "Modifiche ARCUS" : "ARCUS changes"}</dt>
                    <dd>{asset.arcus_modifications?.join("; ") || "—"}</dd>
                  </div>
                </dl>
              )}
              <small>
                {asset.file
                  ? it
                    ? "L’immagine documenta il contesto storico, ma non dimostra da sola il meccanismo o la causa del collasso."
                    : "The image documents historical context but does not by itself establish the collapse mechanism or cause."
                  : it
                    ? "ARCUS collega la fonte ma non riproduce il contenuto finché non esiste un’autorizzazione di riuso verificabile."
                    : "ARCUS links to the source but does not reproduce the content until verifiable reuse permission exists."}
              </small>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default EventMedia;
