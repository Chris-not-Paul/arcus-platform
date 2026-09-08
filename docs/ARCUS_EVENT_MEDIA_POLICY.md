# ARCUS event media policy

## Purpose

Event imagery is a documentary layer linked to the historical collapse record. It supports identification and interpretation of the documented setting; it is not, by itself, evidence of the failure mechanism, causation, structural condition before collapse or risk at another bridge.

The media catalogue is deliberately separate from the event master. Every asset is linked through the canonical `ITxx.xx.xx` event identifier and retains its own provenance and rights statement.

## Publication rule

ARCUS may embed an image only when its creator or rights holder, source page and reuse terms are all verifiable. Public availability on a website and citation of that website are not sufficient permissions to reproduce a photograph.

Accepted embedded-media states are:

- `cleared_open`: public-domain, CC0 or explicitly identified open licence compatible with the declared publication scope;
- `cleared_restricted`: written or contractual permission for named, non-public ARCUS scopes.

Non-embedded states are:

- `link_only`: the source may be linked, but ARCUS has not established a right to reproduce the image;
- `rejected_unknown`: author, rights holder, licence or event identity cannot be verified.

Only `cleared_open` binary assets can be delivered under `public/data/event-media`. The public catalogue may also contain `link_only` metadata records, but they must not contain a copied file, direct media URL or rendered preview. The ARCUS dataset licence never overrides or replaces the licence of an individual image.

## Preferred sources

In descending order:

1. photographs owned by ARCUS or supplied with a written release;
2. public-domain or CC0 material;
3. CC BY or CC BY-SA material with complete attribution;
4. institutional material with explicit reuse terms;
5. other material covered by a specific written permission.

News photographs, social-media images, screenshots and photographs inside reports must not be copied merely because the containing page or document is public. When rights remain unclear, ARCUS can link to the source page without embedding the image.

## Required metadata

Every embedded asset must record:

- canonical event and media identifiers;
- local file, MIME type, pixel dimensions and SHA-256 checksum;
- original file URL and human-readable source page;
- creator and rights holder;
- machine-readable licence identifier and licence URL;
- credit line;
- capture date or documented best available date;
- event phase and a factual description of what the image depicts;
- Italian and English caption and alternative text;
- rights status, verification date and verification evidence;
- permitted publication scopes;
- every transformation performed by ARCUS;
- evidence role and the explicit `causal_evidence` flag.

A `link_only` record must identify the event, source page, publisher or credited author, media phase, verification date and the reason reuse was not cleared. It must not store or expose the third-party media URL as if it were an ARCUS asset.

## Presentation

Attribution, source and licence remain visible immediately below the image. ARCUS identifies whether an image shows the event day, a post-event condition or a later response/reconstruction. The interface states that imagery does not establish cause by itself.

Images should be delivered locally in a web-appropriate size. Hotlinking is avoided because remote files can change or disappear and would make availability and integrity dependent on a third party. Cropping, tonal changes, annotation and resizing must be declared. Editorial changes must never alter the technical meaning of the scene.

## Curated release

The current curated release contains thirteen embedded records across twelve events:

| Event | Subject | Rights status | Licence |
| --- | --- | --- | --- |
| `IT11.03.05` | Ponte della Becca before the recorded hydraulic event | `cleared_open` | CC BY-SA 4.0 |
| `IT11.10.01` | Ponte della Colombiera immediately after the collapse | `cleared_open` | CC BY-SA 3.0 |
| `IT11.11.03` | Ponte di Calderà post-event site and later reconstruction (2 records) | `cleared_open` | CC BY-SA 4.0 |
| `IT15.03.01` | Viadotto Italia before the demolition accident | `cleared_open` | CC BY-SA 3.0 |
| `IT15.04.01` | Temporary A19 connection after the Himera viaduct failure | `cleared_open` | CC BY-SA 4.0 |
| `IT15.11.01` | Remains of the Ponte Allaro monarchico after the 2015 event | `cleared_open` | CC BY-SA 4.0 |
| `IT16.10.01` | Annone di Brianza overpass after collapse | `cleared_open` | CC BY 3.0 (MIT) |
| `IT18.08.01` | Surviving Ponte Morandi pylon after the collapse | `cleared_open` | CC BY-SA 4.0 |
| `IT20.04.02` | Historical predecessor at the Albiano Magra crossing | `cleared_open` | Public Domain Mark 1.0 |
| `IT20.10.08` | Passerella Squarciafichi before the 2020 collapse | `cleared_open` | CC BY 3.0 |
| `IT21.10.01` | Ponte dell’Industria before the 2021 fire | `cleared_open` | CC BY-SA 4.0 |
| `IT23.05.02` | Ponte della Motta on the event day | `cleared_open` | CC BY-SA 4.0 |

Twenty-eight source-only records across twenty-seven events expose links because the linked pages contain relevant imagery or video but do not grant rights compatible with unrestricted ARCUS publication. The set is enumerated by the generated private audit under `source_link_only`; it includes event-day, post-event and impact-damage documentation and keeps that phase explicit. No preview, direct media URL or third-party media file is reproduced.

Institutional origin is not treated as an open licence by itself. For example, the Italian National Fire Brigade permits website images for informational, non-commercial use but requires prior authorisation for editorial publications and prohibits commercial promotion. Its separate CC BY-ND 3.0 statement applies to original content published through its social channels. Unless the specific asset is supplied through a compatible channel or written permission is obtained, ARCUS exposes only the official page link.

The release intentionally favours a verified set over nominal completeness. Expansion requires the same per-asset rights review. The private audit and candidate files preserve positive, negative and unresolved decisions so that searches can be repeated when new evidence or permissions become available.

## External references

- Wikimedia Commons, [Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en)
- Creative Commons, [Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)
- Italian Ministry of Infrastructure and Transport, [Legal notice — site content under CC BY 3.0 unless otherwise stated](https://www.mit.gov.it/note-legali)
- Italian National Fire Brigade, [website image-use declaration](https://www.vigilfuoco.tv/dichiariazione-utilizzo-immagini)
- Italian National Fire Brigade, [social media policy](https://www.vigilfuoco.tv/social-media-policy)
- Città Metropolitana di Firenze MET, [content reuse terms](https://met.cittametropolitana.fi.it/copyright.aspx)

This policy is a conservative ARCUS publication control, not legal advice.
