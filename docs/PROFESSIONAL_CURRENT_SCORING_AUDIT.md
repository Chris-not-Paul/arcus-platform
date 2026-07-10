# ARCUS Professional - Current Scoring Audit

Scope: audit statico dell'implementazione corrente di ARCUS Professional nel branch/workspace attuale. Questo documento non propone modifiche, non cambia formule e non interpreta requisiti futuri: ricostruisce solo la catena esistente.

## Executive Snapshot

- La pagina `ProfessionalPage` calcola molti indicatori lato client partendo da `openEvents()` e `openSources()`, quindi dagli endpoint pubblici filtrati dal backend (`publicReleaseEndYear = 2025`).
- Le risorse Professional lette via `/api/professional/:resource` sono protette da autorizzazione Professional e includono, tra le altre, `hazard-exposure-preview` e `ainop-bridge-index`.
- `buildTerritoryProfiles` genera il `riskScore` territoriale di base.
- `Path 01` usa il profilo provinciale e calcola anche un `Final Priority Index` UI/report con mix 70/30 tra esposizione territoriale e Collapse Rate AINOP.
- `Path 02` usa `buildAssetScreening` per generare uno score asset-level. AINOP non entra nello score asset; compare come contesto/report.
- `hazard-exposure-preview` contiene score hazard per provincia, ma nella pagina corrente il `Final Priority Index` legge `workflowHazardExposure?.score`; la risorsa non espone un campo top-level `score`, quindi la formula ricade normalmente su `scenarioScore`/`riskScore`.

## Data/API Chain

### Open dataset usato dai calcoli in pagina

- File backend: `server/dataService.js`
- Funzioni:
  - `getOpenEvents()`
  - `getOpenSources()`
- Endpoint:
  - `GET /api/open/events` in `server/server.js`
  - `GET /api/open/sources` in `server/server.js`
- Client:
  - `openEvents()` e `openSources()` in `src/utils/apiClient.js`
  - caricati in `src/pages/ProfessionalPage.jsx`
- Regola dataset pubblico:
  - `server/config.js`: `publicReleaseEndYear = 2025`
  - `getOpenEvents()` filtra eventi con anno `<= publicReleaseEndYear`
  - `getOpenSources()` restituisce solo fonti collegate agli eventi pubblici

### Professional resources

- File backend: `server/dataService.js`
- Mappa risorse:
  - `hazard-exposure-preview` -> `private-data/professional/hazard-exposure-preview.json`
  - `ainop-bridge-index` -> `private-data/professional/ainop-bridge-index.json`
  - `territory-profiles` -> `private-data/professional/territory-profiles.json`
  - altre risorse: `event-reliability`, `event-vulnerability`, `model-cards`, ecc.
- Endpoint:
  - `GET /api/professional/:resource` in `server/server.js`
  - richiede `professional:read`
- Client:
  - `professionalResource(resource)` in `src/utils/apiClient.js`
  - `ProfessionalPage` carica `hazard-exposure-preview` e `ainop-bridge-index`

## 1. `ainop-bridge-index`

### File di origine

- Risorsa dati analizzata: `private-data/professional/ainop-bridge-index.json`
- File raw presenti nel workspace:
  - `private-data/professional/ainop/infrastrutture-ferroviarie-ponti.csv`
  - `private-data/professional/ainop/infrastrutture-stradali-ponti.xlsx`
- File di esposizione API: `server/dataService.js`
- File di consumo UI/report:
  - `src/pages/ProfessionalPage.jsx`
  - `scripts/export-path01-report.js`

### Funzione che lo crea

Nel branch corrente non risulta una funzione/script tracciato che genera `ainop-bridge-index.json`. La risorsa esiste come JSON Professional gia prodotto. La formula ufficiale e presente nei metadata del JSON.

Nota: `scripts/build-data.js` non scrive `ainop-bridge-index.json`; scrive invece manifest, territory profiles, reliability, vulnerability, professional events, external layers e hazard exposure preview.

### Dati di input

Dal metadata della risorsa:

- Casi ARCUS per provincia.
- Ponti AINOP censiti per provincia.
- Ponti stradali AINOP.
- Ponti ferroviari AINOP.

Metadata principali:

- `total_ainop_road_bridges = 44330`
- `total_ainop_rail_bridges = 683`
- `total_ainop_bridges = 45013`
- `total_arcus_cases = 253`
- `national_rate_per_100_ainop_bridges = 0.562`

### Formula esatta

Dal campo `metadata.formula`:

```text
provincial_rate = ARCUS cases in province / AINOP bridges counted in province * 100
relative_to_national = provincial_rate / national_rate
```

Nel JSON i campi risultanti sono:

```text
collapse_rate_per_100_ainop_bridges
relative_to_national
```

### Soglie e pesi

Dal campo `metadata.confidence_method`:

```text
high       >= 300 bridges
medium     100-299 bridges
low        25-99 bridges
very_low   1-24 bridges
unavailable 0 bridges
```

Nella UI Path 01 viene derivato anche:

```text
selectedCollapseRateScore =
  if AINOP available and relative_to_national finite:
    min(100, round(relative_to_national * 16.67))
  else:
    selectedProvinceProfile.scenarioScore || selectedProvinceProfile.riskScore || 0
```

Peso nel `Final Priority Index` UI/report Path 01:

```text
selectedFinalPriorityIndex =
  round(selectedExposurePriorityScore * 0.7 + selectedCollapseRateScore * 0.3)
```

### Unita territoriale

Provincia.

### Output prodotto

Per ogni provincia:

```text
province
province_key
arcus_cases
ainop_bridges_total
ainop_road_bridges
ainop_rail_bridges
collapse_rate_per_100_ainop_bridges
relative_to_national
coverage_flag
national_rank_by_rate
percentile_by_rate
collapse_rate_label
collapse_rate_unit
collapse_rate_confidence
collapse_rate_confidence_reason
```

Alcune province hanno `collapse_rate_per_100_ainop_bridges = null` e `relative_to_national = null` per assenza di denominatore.

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `selectedAinopProvinceIndex` seleziona la provincia corrente.
- `renderWorkflowStepPanel()` mostra:
  - denominatore AINOP nello step Path 01 iniziale (`Asset denominator` / `Copertura patrimonio`);
  - `Final Priority Index` nello step finale Path 01;
  - summary e report con `Collapse Rate`, confidenza e moltiplicatore.
- Generazione report/browser:
  - `downloadProfessionalReport`
  - `downloadOnePageBrief`
  - blocchi PDF/HTML con `Collapse Rate`, `AINOP Coverage`, `Final Priority Index`.

In `scripts/export-path01-report.js`:

- `loadAinopBridgeIndex()` tenta di leggere `public/data/professional/ainop-bridge-index.json`.
- Nel workspace attuale `public/data/professional` non esiste; lo script standalone ha quindi fallback `null` se usato in quella forma.

### Fallback

- Se la risorsa Professional non viene caricata: `setAinopBridgeIndex(null)`.
- Se non c'e denominatore AINOP:
  - `collapseRateAvailable = false`
  - multiplier mostrato come `N/A`
  - confidence mostrata come `unavailable`
  - `selectedCollapseRateScore` ricade su `scenarioScore || riskScore || 0`.
- Nei testi report: "Collapse Rate not available..." / "No AINOP bridge denominator available...".

### Valori hardcoded

- `16.67` per trasformare `relative_to_national` in score 0-100.
- Peso `0.3` del Collapse Rate nel `Final Priority Index` Path 01.
- Peso `0.7` dell'exposure/territory score nel `Final Priority Index` Path 01.
- Soglie di confidenza AINOP nel metadata JSON.

### Contributo al punteggio finale

- Contribuisce realmente al `selectedFinalPriorityIndex` del Path 01 nella UI/report corrente tramite `selectedCollapseRateScore` al 30%.
- Non contribuisce a `buildTerritoryProfiles`.
- Non contribuisce a `buildAssetScreening`.
- In Path 02 e nei report asset e prevalentemente informativo/contestuale.

## 2. `hazard-exposure-preview`

### File di origine

- Generatore: `scripts/build-data.js`
- Risorsa prodotta: `private-data/professional/hazard-exposure-preview.json`
- Esposizione API: `server/dataService.js`
- Consumo UI: `src/pages/ProfessionalPage.jsx`
- Consumo export standalone: `scripts/export-path01-report.js`

### Funzione che lo crea

Non e incapsulato in una funzione con nome dedicato. Viene creato dentro `saveProfessionalApiData()` in `scripts/build-data.js` come costante:

```text
const hazardExposurePreview = { ... }
```

### Dati di input

- `provinceProfiles` generati da `buildTerritoryProfiles(events, sources, "province")`.
- Gruppi hazard hardcoded:

```text
hydraulic:
  causes = ["Hydraulic"]
  external_layers = ["ispra-idrogeo-flood-hazard", "protezione-civile-meteo-hydro-alerts"]

landslide:
  causes = ["Landslide"]
  external_layers = ["ispra-idrogeo-landslide-hazard"]

seismic:
  causes = ["Earthquake"]
  external_layers = ["ingv-mps04-seismic-hazard", "ispra-ithaca-capable-faults"]

structural:
  causes = ["Material", "Design and Construction", "Overload"]
  external_layers = []
```

### Formula esatta

Per ogni provincia e per ogni gruppo hazard:

```text
matchedEvents = sum(profile.causeCounts[cause] || 0 for cause in group.causes)
share = profile.total > 0 ? matchedEvents / profile.total : 0

score = min(
  100,
  round(
    share * 70 +
    min(profile.total * 2, 20) +
    min(profile.riskScore * 0.1, 10)
  )
)
```

Dominante:

```text
dominant_hazard = hazards sorted by score descending [0].key
```

### Soglie e pesi

- Share della causa: massimo 70 punti.
- Volume eventi provinciali: `min(profile.total * 2, 20)`.
- Rischio territoriale: `min(profile.riskScore * 0.1, 10)`.
- Cap finale: 100.
- Nessuna soglia classificatoria esplicita nel generatore.

### Unita territoriale

Provincia.

### Output prodotto

Top-level:

```text
generated_at
method = "ARCUS internal pattern proxy; external geospatial joins pending"
status = "preview"
hazard_groups
provinces
```

Per provincia:

```text
province
dominant_hazard
risk_score
total_events
hazards[]
```

Per hazard:

```text
key
label
external_layers
matched_events
score
share
```

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `selectedHazardExposure` seleziona la provincia corrente.
- `workflowHazardExposure` gestisce provincia singola o area manuale.
- `renderWorkflowStepPanel()` visualizza gli hazard score negli step:
  - Path 01 step "Leggi territorio e layer";
  - step di anteprima mappa/layer;
  - evidenze "ARCUS mostra".
- `CollapseMap` riceve overlay WMS attivi tramite `activeProfessionalHazardLayers` e `publicWmsOverlays`.
- Nei report viene descritto come `Hazard / Exposure Context`.

In `scripts/export-path01-report.js`:

- `loadHazardExposurePreview()` tenta `public/data/professional/hazard-exposure-preview.json`.
- `getProjectContextRecommendations()` usa `exposureProfile.dominant_hazard` e gli hazard score per il report standalone.

### Fallback

- Se la risorsa non carica: `setHazardExposurePreview(null)`.
- Se `selectedHazardExposure` e nullo: `workflowHazardExposure` puo essere nullo.
- In `selectedExposurePriorityScore`:

```text
round(workflowHazardExposure?.score || selectedProvinceProfile.scenarioScore || selectedProvinceProfile.riskScore || 0)
```

La risorsa `hazard-exposure-preview.json` non contiene un campo top-level `score` per provincia, ma contiene `risk_score` e `hazards[].score`. Quindi questa formula ricade normalmente su `scenarioScore`/`riskScore`.

- Per area manuale, `workflowHazardExposure` aggrega province e prende il massimo `hazard.score` per hazard, ma non produce un top-level `score`.

### Valori hardcoded

- Mapping cause -> hazard group.
- Nomi external layers.
- Metodo dichiarato: `external geospatial joins pending`.
- Pesi formula: 70, 20, 10.

### Contributo al punteggio finale

- Contribuisce visualmente e informativamente come hazard context.
- Entra nello score asset Path 02 tramite `hazardScore = dominantHazard?.score || 0` in `buildAssetScreening`.
- Nel `Final Priority Index` Path 01 della pagina corrente non contribuisce direttamente tramite `hazards[].score`, perche la formula cerca `workflowHazardExposure?.score`, campo non presente nella risorsa; il calcolo ricade su `scenarioScore`/`riskScore`.

## 3. `buildTerritoryProfiles`

### File di origine

- `src/utils/analytics.js`
- Generazione dati professional: chiamata in `scripts/build-data.js`
- Calcolo runtime UI: chiamata in `src/pages/ProfessionalPage.jsx`

### Funzione che lo crea

```text
export function buildTerritoryProfiles(events, sources, key = "region")
```

### Dati di input

- `events`
- `sources`
- `key`: `"region"` o `"province"`

In `scripts/build-data.js`:

```text
buildTerritoryProfiles(events, sources, "region")
buildTerritoryProfiles(events, sources, "province")
```

In `ProfessionalPage.jsx`:

```text
profiles = buildTerritoryProfiles(events, sources, "region")
provinceProfiles = buildTerritoryProfiles(events, sources, "province")
```

Qui `events` e `sources` arrivano da `openEvents()` e `openSources()`.

### Formula esatta

Raggruppamento:

```text
group by event[key]
skip event if event[key] is missing
```

Per territorio:

```text
total = territoryEvents.length
totalCollapse = count(event.collapse_severity === "TC")
triggered = count(event.triggered)
exactLocations = count(event.exact_location)
sourceTotal = sum(sourceCountByEvent[event.event_id] || 0)
victims = sum(Number(event.victims) || 0)
injuries = sum(Number(event.injuries) || 0)
years = territoryEvents.map(extractYear(event.date)).filter(Boolean)
```

Helper:

```text
percentage(value, total) = !total ? 0 : round(value / total * 100)
```

Score:

```text
recurrenceScore = min(35, total * 3)
severityScore = round(percentage(totalCollapse, total) * 0.28)
triggerScore = round(percentage(triggered, total) * 0.18)
impactScore = min(12, victims * 2 + injuries * 0.35)
evidenceScore = sourceTotal / max(total, 1) >= 3 ? 10 : 6

riskScore = min(
  100,
  round(
    recurrenceScore +
    severityScore +
    triggerScore +
    impactScore +
    evidenceScore
  )
)
```

### Soglie e pesi

- Ricorrenza: max 35, `3` punti per evento.
- Collassi totali: max implicito 28, dato da `% totalCollapse * 0.28`.
- Eventi triggered: max implicito 18, dato da `% triggered * 0.18`.
- Impatto umano: max 12, `victims * 2 + injuries * 0.35`.
- Evidenza: 10 se media fonti per evento >= 3, altrimenti 6.

### Unita territoriale

- Regione se `key = "region"`.
- Provincia se `key = "province"`.

### Output prodotto

Array ordinato per `riskScore` decrescente. Ogni profilo contiene:

```text
territory
total
totalCollapse
triggered
exactLocations
sourceTotal
avgSources
victims
injuries
firstYear
topCause
causeCounts
riskScore
scoreBreakdown[]
```

`scoreBreakdown` contiene:

```text
recurrence / max 35
severity / max 28
trigger / max 18
impact / max 12
evidence / max 10
```

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `platform-score-card`: territorio selezionato, `scenarioScore`, breakdown.
- `renderWorkflowStepPanel()`: eventi in scope, cause dominanti, score e output Path 01.
- sezioni legacy/landing Professional:
  - `professional-risk-score`
  - `professional-scenarios`
  - report summary.

### Fallback

- Eventi senza `event[key]` esclusi.
- `firstYear = null` se non ci sono anni.
- `topCause = "-"` se non ci sono cause.
- `avgSources = sourceTotal / max(total, 1)`.
- `evidenceScore = 6` se la media fonti e inferiore a 3.

### Valori hardcoded

- Pesi e cap: 35, 28, 18, 12, 10.
- Soglia media fonti: >= 3.
- Codice total collapse: `"TC"`.

### Contributo al punteggio finale

- Contribuisce direttamente:
  - al `riskScore` territoriale;
  - al `scenarioScore`;
  - al fallback di `selectedExposurePriorityScore`;
  - al fallback di `selectedCollapseRateScore` se AINOP non disponibile;
  - al `profileScore` di `buildAssetScreening`.

## 4. `buildAssetScreening`

### File di origine

- `src/utils/analytics.js`
- Chiamata principale in `src/pages/ProfessionalPage.jsx`

### Funzione che lo crea

```text
export function buildAssetScreening(
  assets,
  events,
  provinceProfiles,
  vulnerabilityByEvent,
  hazardExposurePreview = null,
  reliabilityByEvent = {}
)
```

### Dati di input

Da `ProfessionalPage.jsx`:

```text
assets = assetRowsForScreening
events = openEvents()
provinceProfiles = scenarioProvinceProfiles
vulnerabilityByEvent = buildVulnerabilityByEvent(events, reliabilityByEvent)
hazardExposurePreview = professionalResource("hazard-exposure-preview")
reliabilityByEvent = buildSourceReliabilityByEvent(events, sources)
```

`assetRowsForScreening` include solo asset con:

```text
id/bridge_id/asset_id/code/codice
latitude/lat valida tra -90 e 90
longitude/lon/lng valida tra -180 e 180
province_declared/province/provincia
municipality_declared/municipality/comune
```

### Formula esatta

Per ogni asset:

```text
id = bridge_id || asset_id || id || code || codice || ASSET-{index+1}
name = name || asset_name || bridge_name || nome || id
province = province_declared || province || provincia
municipality = municipality_declared || municipality || comune
region = region || regione
latitude = latitude || lat
longitude = longitude || lon || lng
```

Contesto:

```text
profile = provinceProfiles[normalized province]
hazardProfile = hazardExposurePreview.provinces[normalized province]

localEvents =
  events where event.province == province
  else events where event.region == region

nearbyEvents =
  events with distanceKm(asset, event) <= 35 km,
  sorted by distance ascending

nearestEvent = nearbyEvents[0] || null
comparableEvents = nearbyEvents.length > 0 ? nearbyEvents : localEvents
evidenceEvent = nearestEvent || comparableEvents[0] || null
evidenceClass =
  reliabilityByEvent[evidenceEvent.event_id].grade ||
  evidenceEvent.reliability.grade ||
  "D"
```

High/Critical count:

```text
highVulnerabilityMatches =
  count(comparableEvents where vulnerabilityByEvent[event.event_id].className in ["High", "Critical"])
```

Sub-score:

```text
profileScore = profile?.scenarioScore || profile?.riskScore || 0
dominantHazard = hazardProfile.hazards.find(h.key == hazardProfile.dominant_hazard)
hazardScore = dominantHazard?.score || 0
proximity = proximityScore(nearestEvent?.distance, localEvents.length > 0)
localityScore = min(24, comparableEvents.length * 4)
vulnerabilityScore = min(22, highVulnerabilityMatches * 6)
ageScore = assetAgeScore(construction_year || year || anno)
typologyScore = assetTypologyScore(asset)
```

Final asset score:

```text
score = min(
  100,
  round(
    profileScore * 0.22 +
    hazardScore * 0.16 +
    proximity * 0.22 +
    localityScore * 0.35 +
    vulnerabilityScore +
    ageScore +
    typologyScore
  )
)
```

Ordinamento:

```text
score desc
then evidence grade weight desc (A=4, B=3, C=2, D=1)
then proximityScore desc
then nearest distance asc
then highVulnerabilityMatches desc
```

Action tiers:

```text
immediateCount = count(attentionLevel == "Immediate attention")
firstBatchLimit = min(10, max(3, ceil(immediateCount * 0.1)))
secondBatchLimit = min(immediateCount, max(firstBatchLimit + 4, ceil(immediateCount * 0.5)))

Immediate attention:
  rank <= firstBatchLimit -> "Batch 1 - check first"
  rank <= secondBatchLimit -> "Batch 2 - next immediate"
  else -> "Batch 3 - complete immediate queue"

Programmed attention -> "Annual inspection plan"
Else -> "Ordinary monitoring cycle"
```

### Soglie e pesi

`distanceKm`:

```text
Haversine radius = 6371 km
```

`nearbyEvents`:

```text
radius <= 35 km
```

`proximityScore(distance, hasLocalContext)`:

```text
null/undefined -> hasLocalContext ? 18 : 0
<= 0.5 km -> 100
<= 2 km -> 82
<= 10 km -> 58
> 10 km -> hasLocalContext ? 34 : 18
```

`proximityBand`:

```text
null + local context -> "Provincial context"
null + no local context -> "No spatial precedent"
<= 0.5 -> "Direct local signal"
<= 2 -> "High proximity"
<= 10 -> "Medium proximity"
> 10 + local context -> "Provincial context"
> 10 + no local context -> "Distant context"
```

`attentionLevel(score, proximity)`:

```text
score > 75 or proximity >= 82 -> "Immediate attention"
score >= 50 -> "Programmed attention"
else -> "Ordinary monitoring"
```

`assetAgeScore(year)`:

```text
missing year -> 4
age >= 80 -> 14
age >= 60 -> 11
age >= 40 -> 8
else -> 4
```

`assetTypologyScore(asset)`:

```text
base = 5
+5 if structure includes beam/truss/arch/girder
+5 if material includes masonry/steel/mixed
+3 if material includes calcestruzzo/concrete
cap = 16
```

Vulnerability event class usata nel matching:

```text
Critical >= 78
High >= 62
Medium >= 42
Low otherwise
```

### Unita territoriale

Asset singolo, con contesto provinciale/regionale e raggio spaziale 35 km.

### Output prodotto

Array ordinato di asset screenati. Ogni item include:

```text
asset
id
name
municipality
province/region-derived territory
latitude
longitude
score
priority / attentionLevel
actionRank
actionTier
immediateRank
profile
hazardProfile
hazardProfileLabel
dominantHazard
hazardScore
proximityScore
proximityBand
nearestEvent
nearestEventSummary
nearbyEvents
comparableEvents
highVulnerabilityMatches
evidenceClass
topCause
monitoringRecommendation
```

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `renderWorkflowStepPanel()` per Path 02:
  - valid records;
  - blocked records;
  - warnings;
  - immediate/programmed attention;
  - Batch 1;
  - lista top asset.
- Sezione `platform-asset-screening`:
  - audit inventario;
  - top 8 asset;
  - detail top asset;
  - comparable events.
- Export:
  - `exportAssetScreening`
  - `buildAssetScreeningWorkbook`
  - `downloadProfessionalReport`
  - `downloadOnePageBrief`
  - `exportGisPackage`

### Fallback

- Asset senza campi obbligatori: esclusi prima di chiamare `buildAssetScreening`.
- ID mancante dentro la funzione: `ASSET-{index+1}`.
- Nome mancante: usa ID.
- Nessun hazard profile: `hazardScore = 0`, `dominantHazard = null`, label fallback `"Contextual"`.
- Nessun profilo provincia: `profileScore = 0`.
- Nessun evento vicino: usa eventi locali provincia/regione.
- Nessuna evidence class: `"D"`.
- Nessuna causa: `"-"`.

### Valori hardcoded

- Raggio eventi vicini: 35 km.
- Pesi score: `0.22`, `0.16`, `0.22`, `0.35`; componenti additive `vulnerabilityScore`, `ageScore`, `typologyScore`.
- Soglie proximity: 0.5, 2, 10 km.
- Soglie attention: `>75`, `>=50`, `proximity >=82`.
- Batch: 10%, 50%, minimi 3 e `firstBatchLimit + 4`.
- Testi delle raccomandazioni operative in `monitoringRecommendation`.

### Contributo al punteggio finale

- Contribuisce realmente al Path 02: `score` e il ranking sono il cuore della prioritizzazione asset.
- Non contribuisce al `Final Priority Index` Path 01.
- Usa `profile.scenarioScore`, quindi il profilo di scenario provinciale puo influenzare lo score asset se lo stato `scenario` non e baseline.

## 5. Path 01 - Analisi di nuova costruzione

### File di origine

- UI principale: `src/pages/ProfessionalPage.jsx`
- Funzioni analitiche:
  - `buildTerritoryProfiles` in `src/utils/analytics.js`
  - `buildSourceReliabilityByEvent` in `src/utils/analytics.js`
  - `buildVulnerabilityByEvent` in `src/utils/analytics.js`
- Risorse Professional:
  - `private-data/professional/hazard-exposure-preview.json`
  - `private-data/professional/ainop-bridge-index.json`
- Export standalone:
  - `scripts/export-path01-report.js`

### Funzione che lo crea

Non c'e una singola funzione `buildPath01`. Il Path 01 e assemblato dentro `ProfessionalPage()` con:

- `profiles`
- `provinceProfiles`
- `scenarioProvinceProfiles`
- `selectedProvinceProfile`
- `selectedProvinceEvents`
- `selectedHazardExposure`
- `workflowHazardExposure`
- `selectedAinopProvinceIndex`
- `selectedFinalPriorityIndex`
- `renderWorkflowStepPanel()`

Il percorso attivo e:

```text
activeEntryPath === 0
```

### Dati di input

- Eventi pubblici: `openEvents()`.
- Fonti pubbliche: `openSources()`.
- Provincia selezionata.
- Scenario selezionato; default `baseline`.
- `hazard-exposure-preview`.
- `ainop-bridge-index`.
- Context hardcoded:

```text
projectContext = "bridge"
selectedProjectContext = "Ponte" / "Bridge"
selectedPath01Intent = "Territorial briefing" / "Briefing territoriale"
```

### Formula esatta

Profilo provinciale di base:

```text
riskScore = buildTerritoryProfiles(...).riskScore
```

Scenario province profile:

```text
scenarioEvents = sum(profile.causeCounts[cause] || 0 for cause in activeScenario.causes)
scenarioShare = profile.total > 0 ? scenarioEvents / profile.total : 0
scenarioBoost = activeScenario.value === "baseline" ? 0 : round(scenarioShare * 20)
scenarioScore = min(100, profile.riskScore + scenarioBoost)
```

Scenari hardcoded:

```text
baseline: []
hydraulic: ["Hydraulic"]
landslide: ["Landslide"]
earthquake: ["Earthquake"]
structural: ["Material", "Design and Construction", "Overload"]
impact: ["Impact"]
```

Collapse Rate score:

```text
selectedCollapseRateScore =
  if selectedCollapseRateAvailable and relative_to_national finite:
    min(100, round(relative_to_national * 16.67))
  else:
    selectedProvinceProfile.scenarioScore ||
    selectedProvinceProfile.riskScore ||
    0
```

Exposure priority score:

```text
selectedExposurePriorityScore = round(
  workflowHazardExposure?.score ||
  selectedProvinceProfile?.scenarioScore ||
  selectedProvinceProfile?.riskScore ||
  0
)
```

Final Priority Index:

```text
selectedFinalPriorityIndex = round(
  selectedExposurePriorityScore * 0.7 +
  selectedCollapseRateScore * 0.3
)
```

Nota operativa corrente: `workflowHazardExposure?.score` normalmente non esiste nella risorsa, quindi `selectedExposurePriorityScore` ricade su `scenarioScore`/`riskScore`.

### Soglie e pesi

- `scenarioBoost`: massimo 20 punti.
- `selectedCollapseRateScore`: `relative_to_national * 16.67`, cap 100.
- `Final Priority Index`: 70% exposure/territory, 30% Collapse Rate.
- `buildTerritoryProfiles`: vedi sezione 3.
- `hazard-exposure-preview`: vedi sezione 2.

### Unita territoriale

Provincia.

Per path diversi da `activeEntryPath === 0`, esiste anche logica area manuale, ma il Path 01 di nuova costruzione lavora a livello provinciale nella UI corrente.

### Output prodotto

UI:

- conteggio eventi ARCUS nella provincia;
- causa dominante;
- numero layer hazard dichiarati;
- denominatore AINOP;
- hazard score;
- pattern storico;
- affidabilita media;
- `Final Priority Index`.

Export:

- Full PDF;
- One-Page Brief;
- Event Table;
- Source Table;
- GIS Package.

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `renderWorkflowStepPanel()`:
  - step 01 selezione provincia;
  - step 02 conferma e anteprima;
  - step 03 territorio e layer;
  - step 04 pattern storico;
  - step 05 export.
- `platform-score-card` nella sezione `professional-risk-score`.
- `platform-report-summary` nella sezione report.
- `CollapseMap` per mappa nel workflow.

### Fallback

- Nessuna provincia selezionata: usa il primo profilo ordinato.
- AINOP non disponibile: `N/A`, confidence `unavailable`, e `selectedCollapseRateScore` ricade su score territoriale.
- Hazard preview mancante o senza `score`: `selectedExposurePriorityScore` ricade su `scenarioScore`/`riskScore`.
- Nessun evento in area manuale: usa eventi provincia selezionata.
- `export-path01-report.js`: se le risorse non esistono in `public/data/professional`, i loader restituiscono `null`.

### Valori hardcoded

- `activeEntryPath === 0` come Path 01.
- `projectContext = "bridge"`.
- Lista scenari.
- Pesi 70/30 del `Final Priority Index`.
- Fattore AINOP `16.67`.
- Testi workflow e report.

### Contributo al punteggio finale

- `buildTerritoryProfiles` contribuisce al `riskScore`.
- `scenarioProvinceProfiles` contribuisce al `scenarioScore`.
- AINOP contribuisce al `selectedFinalPriorityIndex` se disponibile.
- `hazard-exposure-preview` contribuisce come contesto visuale; gli score hazard non entrano direttamente nel `selectedFinalPriorityIndex` corrente per assenza del campo top-level `score`.

## 6. Path 02 - Prioritizzazione asset esistenti

### File di origine

- UI principale: `src/pages/ProfessionalPage.jsx`
- Funzione analitica: `buildAssetScreening` in `src/utils/analytics.js`
- Risorse Professional:
  - `hazard-exposure-preview`
  - indirettamente AINOP per contesto report
- Parser upload:
  - `parseAssetCsv`
  - `parseAssetWorkbookHtml`
  - `parseAssetSpreadsheetXml`
  - `parseAssetFile`
  - `handleAssetUpload`

### Funzione che lo crea

Il Path 02 e il percorso:

```text
activeEntryPath === 1
```

Il ranking e creato da:

```text
assetScreening = buildAssetScreening(
  assetRowsForScreening,
  events,
  scenarioProvinceProfiles,
  vulnerabilityByEvent,
  hazardExposurePreview,
  reliabilityByEvent
)
```

### Dati di input

- File utente `.csv`, `.xls`, `.html`.
- Righe asset parse.
- Eventi pubblici: `openEvents()`.
- Fonti pubbliche: `openSources()`.
- Profili provinciali con scenario: `scenarioProvinceProfiles`.
- Vulnerabilita evento: `buildVulnerabilityByEvent`.
- Affidabilita evento: `buildSourceReliabilityByEvent`.
- Hazard exposure preview.

`path02ReadingMode` e inizializzato a:

```text
"monitoring_priority"
```

Non esiste setter attivo nella pagina corrente:

```text
const [path02ReadingMode] = useState("monitoring_priority")
```

### Formula esatta

Score asset:

```text
score = min(
  100,
  round(
    profileScore * 0.22 +
    hazardScore * 0.16 +
    proximity * 0.22 +
    localityScore * 0.35 +
    vulnerabilityScore +
    ageScore +
    typologyScore
  )
)
```

Vedi sezione 4 per dettaglio completo.

Inventory quality audit:

```text
score = total
  ? round(
      (
        (coordinates / total) * 0.32 +
        (territory / total) * 0.32 +
        (technical / total) * 0.22 +
        (age / total) * 0.14
      ) * 100
    )
  : 0
```

Questo audit misura qualita/completezza dell'inventario, non e parte dello score asset.

### Soglie e pesi

Path 02 eredita soglie e pesi da `buildAssetScreening`:

- raggio spatial precedent: 35 km;
- proximity: 0.5, 2, 10 km;
- attention: `score > 75` o `proximity >= 82`, poi `score >= 50`;
- asset age: 80, 60, 40 anni;
- vulnerability classes: Critical >= 78, High >= 62, Medium >= 42;
- score formula con pesi `0.22`, `0.16`, `0.22`, `0.35` e additivi.

Inventory audit:

- coordinates 32%;
- territory 32%;
- technical 22%;
- age 14%.

### Unita territoriale

Asset singolo. Il contesto territoriale usato e provinciale, con fallback regionale per eventi locali se provincia non matcha dentro la funzione. Tuttavia `assetRowsForScreening` richiede una provincia dichiarata prima di chiamare la funzione.

### Output prodotto

UI:

- asset validi;
- record bloccati;
- warnings provincia;
- immediate/programmed/ordinary;
- batch operativi;
- top asset;
- score asset e grade evidenza;
- hazard profile;
- proximity band;
- nearest ARCUS case;
- raccomandazione monitoraggio.

Export:

- Asset Table;
- Source Table;
- GIS Package;
- Full PDF;
- One-Page Brief.

### Componente in cui viene visualizzato

In `src/pages/ProfessionalPage.jsx`:

- `renderWorkflowStepPanel()`:
  - step upload;
  - conferma/anteprima;
  - processa e calcola score;
  - leggi watchlist;
  - genera report.
- sezione `platform-asset-screening`:
  - audit inventario;
  - lista top asset;
  - detail top asset.
- `CollapseMap` con `assetMarkers`, `watchlistMarkers` e layer eventi/hazard.

### Fallback

- File non `.csv`, `.xls`, `.html`: errore UI.
- CSV senza righe valide: errore UI.
- Parser cerca header contenente `bridge_id`, `asset_id` o `id`.
- Record mancanti di campi obbligatori: non entrano in `assetRowsForScreening`.
- Nessun asset valido: messaggio empty.
- Nessun evento vicino: usa eventi locali provincia/regione.
- Nessun profilo hazard: hazard score 0 e profilo "Contextual".
- Nessuna evidence class: "D".

### Valori hardcoded

- `activeEntryPath === 1` come Path 02.
- `path02ReadingMode = "monitoring_priority"`.
- Estensioni file accettate.
- Header richiesti.
- Pesi score asset e inventory audit.
- Testi dei workflow e output.

### Contributo al punteggio finale

- `buildAssetScreening.score` e il punteggio finale reale di Path 02.
- `assetInventoryAudit.score` e informativo, non contribuisce al ranking asset.
- AINOP e informativo/contestuale nel Path 02.
- Hazard exposure preview contribuisce realmente al punteggio asset tramite `hazardScore`.

## Diagramma Flusso - Path 01

```text
private-data/processed/events.json
private-data/processed/sources.json
  -> server/dataService.js
     getOpenEvents() / getOpenSources()
     publicReleaseEndYear = 2025
  -> /api/open/events + /api/open/sources
  -> src/utils/apiClient.js
     openEvents() / openSources()
  -> src/pages/ProfessionalPage.jsx
     events + sources state
  -> src/utils/analytics.js
     buildTerritoryProfiles(events, sources, "province")
  -> provinceProfiles.riskScore
  -> ProfessionalPage.scenarioProvinceProfiles
     scenarioBoost = baseline ? 0 : round(scenarioShare * 20)
     scenarioScore = min(100, riskScore + scenarioBoost)

private-data/professional/hazard-exposure-preview.json
  -> server/dataService.js professionalResources map
  -> /api/professional/hazard-exposure-preview
  -> ProfessionalPage.selectedHazardExposure / workflowHazardExposure
  -> visualizzazione hazard scores
  -> selectedExposurePriorityScore normally falls back to scenarioScore/riskScore

private-data/professional/ainop-bridge-index.json
  -> server/dataService.js professionalResources map
  -> /api/professional/ainop-bridge-index
  -> ProfessionalPage.selectedAinopProvinceIndex
  -> selectedCollapseRateScore =
       min(100, round(relative_to_national * 16.67))
       or fallback scenarioScore/riskScore

scenarioScore/riskScore + selectedCollapseRateScore
  -> selectedFinalPriorityIndex =
       round(selectedExposurePriorityScore * 0.7 +
             selectedCollapseRateScore * 0.3)
  -> ProfessionalPage.renderWorkflowStepPanel()
  -> Path 01 visual:
       province selection
       ARCUS events in scope
       hazard layers
       AINOP denominator
       historical pattern
       Final Priority Index
  -> exports:
       Full PDF
       One-Page Brief
       Event Table
       Source Table
       GIS Package
```

## Diagramma Flusso - Path 02

```text
user asset file (.csv/.xls/.html)
  -> ProfessionalPage.handleAssetUpload()
  -> parseAssetFile()
       parseAssetCsv()
       parseAssetWorkbookHtml()
       parseAssetSpreadsheetXml()
  -> assetRows
  -> assetRowsForScreening filter:
       id present
       valid latitude
       valid longitude
       province present
       municipality present

private-data/processed/events.json
private-data/processed/sources.json
  -> server/dataService.js
     getOpenEvents() / getOpenSources()
  -> /api/open/events + /api/open/sources
  -> ProfessionalPage events + sources
  -> buildSourceReliabilityByEvent(events, sources)
  -> buildVulnerabilityByEvent(events, reliabilityByEvent)
  -> buildTerritoryProfiles(events, sources, "province")
  -> scenarioProvinceProfiles

private-data/professional/hazard-exposure-preview.json
  -> /api/professional/hazard-exposure-preview
  -> hazardExposurePreview

assetRowsForScreening
events
scenarioProvinceProfiles
vulnerabilityByEvent
hazardExposurePreview
reliabilityByEvent
  -> src/utils/analytics.js
     buildAssetScreening()
  -> per asset:
       profileScore
       hazardScore
       proximityScore
       localityScore
       vulnerabilityScore
       ageScore
       typologyScore
  -> score =
       min(100, round(profileScore*0.22 +
                      hazardScore*0.16 +
                      proximity*0.22 +
                      localityScore*0.35 +
                      vulnerabilityScore +
                      ageScore +
                      typologyScore))
  -> sorted assetScreening
  -> attentionLevel + actionTier
  -> ProfessionalPage.renderWorkflowStepPanel()
  -> Path 02 visual:
       upload validation
       valid/blocked records
       immediate/programmed/ordinary attention
       top asset watchlist
       score/evidence grade
       hazard profile
       nearest ARCUS case
  -> exports:
       Asset Table
       Source Table
       GIS Package
       Full PDF
       One-Page Brief
```

## File Analizzati

### Codice

- `scripts/build-data.js`
- `scripts/export-path01-report.js`
- `server/config.js`
- `server/dataService.js`
- `server/server.js`
- `src/pages/ProfessionalPage.jsx`
- `src/utils/analytics.js`
- `src/utils/apiClient.js`

### Risorse dati

- `private-data/professional/ainop-bridge-index.json`
- `private-data/professional/hazard-exposure-preview.json`
- `private-data/professional/territory-profiles.json`
- `private-data/professional/event-reliability.json`
- `private-data/professional/event-vulnerability.json`
- `private-data/professional/ainop/infrastrutture-ferroviarie-ponti.csv`
- `private-data/professional/ainop/infrastrutture-stradali-ponti.xlsx`

## Note di audit

- Il generatore di `ainop-bridge-index.json` non e presente tra i file di codice trovati nel branch corrente.
- `scripts/export-path01-report.js` legge le risorse Professional da `public/data/professional`, ma nel workspace attuale quella directory non esiste; la pagina React usa invece l'API `/api/professional/:resource` che legge da `private-data/professional`.
- `hazard-exposure-preview` dichiara `status = "preview"` e `method = "ARCUS internal pattern proxy; external geospatial joins pending"`.
- La UI Path 02 usa `path02ReadingMode = "monitoring_priority"` senza setter attivo, quindi la modalita "vulnerability_assessment" esiste nei testi/branch condizionali ma non risulta selezionabile nella pagina corrente.
