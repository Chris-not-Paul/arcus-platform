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
  const publishedAssets = assets.filter((asset) => Boolean(asset.file));

  if (!publishedAssets.length) {
    return null;
  }

  return (
    <section className={`arcus-event-media ${featured ? "is-featured" : "is-gallery"}`}>
      {!featured && (
        <header>
          <span>{it ? "Indice visivo documentato" : "Documented visual index"}</span>
          <h3>{it ? "Immagini e fonti visive" : "Imagery and visual sources"}</h3>
          <p>
            {it
              ? "Contenuti pubblicati soltanto quando autore, fonte e condizioni di riuso sono verificabili."
              : "Media are published only when creator, source and reuse terms can be verified."}
          </p>
        </header>
      )}

      <div className="arcus-event-media-grid">
        {publishedAssets.map((asset) => (
          <figure key={asset.media_id}>
            <div className="arcus-event-media-frame">
              <img
                alt={it ? asset.alt_it : asset.alt_en}
                decoding="async"
                loading="lazy"
                src={asset.file}
              />
              <span>{phaseLabel(asset.event_phase, it)}</span>
            </div>
            <figcaption>
              <p>{it ? asset.caption_it : asset.caption_en}</p>
              <div className="arcus-event-media-credit">
                <span>{asset.credit_line}</span>
                <span aria-hidden="true">·</span>
                <a href={asset.source_page_url} target="_blank" rel="noreferrer">
                  {asset.identity_relation === "direct_asset"
                    ? it
                      ? "Contributo diretto"
                      : "Direct contribution"
                    : it
                      ? "Scheda originale"
                      : "Original record"}
                </a>
                <span aria-hidden="true">·</span>
                {asset.license_url ? (
                  <a href={asset.license_url} target="_blank" rel="noreferrer">
                    {asset.license_id}
                  </a>
                ) : (
                  <span>
                    {asset.file
                      ? it
                        ? "Copyright dell’autore · uso autorizzato ad ARCUS"
                        : "Author copyright · ARCUS use authorised"
                      : it
                        ? "Solo collegamento"
                        : "Link only"}
                  </span>
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
                {it
                  ? "L’immagine documenta il contesto storico, ma non dimostra da sola il meccanismo o la causa del collasso."
                  : "The image documents historical context but does not by itself establish the collapse mechanism or cause."}
              </small>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default EventMedia;
