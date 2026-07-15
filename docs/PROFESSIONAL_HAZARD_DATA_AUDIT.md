# ARCUS Professional hazard data audit

Audit statico del branch corrente. Nessun file di produzione e nessuna formula sono stati modificati.

## Addendum 2026-07-14 - ISPRA PAI landslide provider

ARCUS Professional Path 01 ora include un provider ufficiale point-level per l'esposizione a pericolosita da frana PAI, in shadow mode:

- provider: ISPRA / IdroGEO;
- endpoint WFS analitico: `https://idrogeo.isprambiente.it/geoserver/idrogeo/ows`;
- layer WFS analitico: `idrogeo:pericolosita_frane`;
- endpoint WMS visuale: `https://idrogeo.isprambiente.it/geoserver/idrogeo/wms`;
- layer WMS visuale: `idrogeo:pericolosita_frane`;
- versione sorgente: mosaicatura PAI nazionale v.5.0, anno riferimento 2024;
- attributo classe: `cod_per_it`;
- mapping classi: `0 = AA`, `1 = P1`, `2 = P2`, `3 = P3`, `4 = P4`;
- operazione: WFS candidate retrieval + point-in-polygon locale ARCUS;
- scoring: `normalized_score = null`, nessun contributo al Final Priority Index.

Il precedente layer visuale `frane`/IFFI non e la fonte analitica PAI e non deve essere usato come provider di hazard PAI. La configurazione overlay e stata allineata a `idrogeo:pericolosita_frane`.

Dettagli:

- `docs/PROFESSIONAL_LANDSLIDE_SOURCE_DISCOVERY.md`
- `docs/PROFESSIONAL_LANDSLIDE_EXPOSURE_VALIDATION.md`

## Sintesi esecutiva

Nel repository sono presenti tre tipi distinti di informazione territoriale:

1. **Provider WFS ufficiali Path 01 in shadow mode**: ISPRA idraulica P1/P2/P3 e ISPRA IdroGEO PAI frane `idrogeo:pericolosita_frane` sono interrogati dal backend per esposizione puntuale, con `normalized_score = null`.
2. **Layer reali pubblici ISPRA visualizzati via WMS**: overlay remoti usati come controllo visuale, non come fonte di scoring.
3. **Proxy ARCUS costruiti dal database dei collassi**: `hazard-exposure-preview.json`, `territory-profiles.json` e `ainop-bridge-index.json` producono indicatori territoriali e punteggi, ma non sono intersezioni geospaziali con layer ISPRA/INGV.

Non risultano presenti nel repository dataset hazard locali in formato Shapefile, GeoPackage, GeoTIFF/TIFF, raster scientifici, griglie INGV MPS04, WFS o vettori ISPRA/IdroGEO scaricati. I riferimenti a INGV MPS04, ITHACA, Protezione Civile e IdroGEO completi sono attualmente **metadata/registry** o testo di interfaccia, non dati calcolabili gia ingestiti.

La conclusione operativa aggiornata e: **Path 01 calcola esposizioni puntuali ufficiali WFS per idraulica ISPRA e frane PAI ISPRA in shadow mode, ma questi risultati non contribuiscono ancora al Final Priority Index**. Path 02 e i punteggi correnti restano basati su record ARCUS, fonti documentate, classificazioni interne, profili provinciali e denominatori AINOP, non su overlay analysis completa dei layer hazard pubblici.

## Classificazione A/B/C/D

### A. Hazard reali derivati da dati ISPRA/INGV

- `ISPRA SDI - Aree pericolosita idraulica P1/P2/P3`: presente come WFS point-level Path 01 in shadow mode e come WMS visuale.
- `ISPRA IdroGEO - Pericolosita frane PAI`: presente come WFS point-level Path 01 in shadow mode e come WMS visuale.
- `ISPRA IdroGEO - Inventario Fenomeni Franosi in Italia`: non usato come provider analitico PAI.
- `INGV MPS04 seismic hazard`: presente solo come metadata pianificato in `external-hazard-layers.json` e come label UI. Nessun layer WMS/WFS/griglia locale trovato.
- `ISPRA ITHACA capable faults`: presente solo come metadata pianificato. Nessun dato vettoriale locale trovato.

### B. Proxy costruiti dal database ARCUS dei collassi

- `private-data/professional/hazard-exposure-preview.json`
- `private-data/professional/territory-profiles.json`
- `private-data/professional/ainop-bridge-index.json`
- `professional-events.json`, `event-reliability.json`, `event-vulnerability.json` come basi ARCUS per score, reliability e vulnerability.

### C. Layer soltanto visualizzati sulla mappa

- WMS ISPRA idraulico P3.
- WMS ISPRA/IdroGEO frane.
- `public/data/geo/italy-provinces.geojson` come confini amministrativi.
- `public/data/map-tiles/voyager/**/*.png` come basemap raster cache.

### D. Layer realmente utilizzabili oggi nel motore di scoring

- `hazard-exposure-preview.json`: contribuisce realmente al punteggio Path 02 tramite `buildAssetScreening`, ma e un proxy ARCUS, non un'intersezione ISPRA/INGV.
- `territory-profiles.json`: contribuisce ai profili territoriali e al rischio/profilo provinciale.
- `ainop-bridge-index.json`: contribuisce ai benchmark/rate provinciali Path 01; non e hazard, ma denominatore infrastrutturale.
- Nessun dataset ISPRA/INGV reale contribuisce oggi a un punteggio finale.

## Inventario sorgenti/dataset

### 1. Registry Professional degli hazard esterni

1. **Percorso**: `private-data/professional/external-hazard-layers.json`
2. **Nome sorgente**: registry ARCUS per layer esterni pubblici.
3. **Formato**: JSON.
4. **Dimensione**: 3,398 byte.
5. **Tipo**: semplice metadata / registry; non dato locale geospaziale; non layer visuale diretto; non dato gia usato nei calcoli.
6. **Tipo dato geometrico**: assente.
7. **CRS**: assente.
8. **Estensione territoriale**: non codificata.
9. **Versione/data**: `generated_at = 2026-06-11T07:35:38.781Z`.
10. **Campi disponibili**: `id`, `category`, `name`, `provider`, `source_url`, `documentation_url`, `arcus_use`, `integration_status`, `join_strategy`, `priority`.
11. **Valori/classi rilevanti**:
    - `ispra-idrogeo-landslide-hazard`
    - `ispra-idrogeo-flood-hazard`
    - `ingv-mps04-seismic-hazard`
    - `protezione-civile-meteo-hydro-alerts`
    - `ispra-ithaca-capable-faults`
    - `integration_status`: `planned` o `research`.
12. **Significato tecnico documentato**: solo descrittivo; il file dichiara uso previsto e strategia di join, non classi hazard.
13. **Valori mancanti**: geometrie, CRS, bbox, attributi hazard, legenda, endpoint WFS/raster, versioni tecniche dei dataset.
14. **Codice che carica/visualizza**:
    - generazione registry in `scripts/build-data.js`
    - mapping API in `server/dataService.js`
    - caricamento frontend in `src/pages/ProfessionalPage.jsx` tramite `professionalResource("external-hazard-layers")`
    - visualizzazione nella sezione external/platform layer di `ProfessionalPage`.
15. **Contribuisce al punteggio?** No. E informativo.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: point-in-polygon, raster sampling o GetFeatureInfo equivalente sul layer reale.
    - Path 01 area/tracciato: overlay/intersection, zonal statistics, buffer lungo tracciato.
    - Path 02 ponti: campionamento puntuale per ogni asset o nearest/intersection con poligoni/linee.
17. **Problemi**: e un registry, non contiene i dati. `integration_status` dichiara esplicitamente che l'ingestion e pianificata.
18. **Dati dichiarati ma assenti**: MPS04, ITHACA, Protezione Civile, layer IdroGEO completi interrogabili.

### 2. ISPRA SDI - Aree pericolosita idraulica P3

1. **Percorsi/configurazioni**:
   - `src/pages/AtlasPage.jsx`
   - `src/pages/ProfessionalPage.jsx`
   - rendering in `src/components/map/CollapseMap.jsx`
2. **Nome sorgente**: `ISPRA SDI - Aree pericolosita idraulica P3`.
3. **Formato**: servizio remoto WMS, reso come tile `image/png` trasparente.
4. **Dimensione file**: nessun file locale. Dimensione non applicabile.
5. **Tipo**: servizio remoto; layer visuale; non dato gia usato nei calcoli.
6. **Tipo dato**: non determinabile dal repository. Nel frontend arriva come immagine WMS; il dato originario potrebbe essere poligonale, ma ARCUS non scarica geometrie.
7. **CRS**: non dichiarato nella configurazione ARCUS. `WMSTileLayer` usa `version="1.3.0"` e la proiezione Leaflet della mappa; CRS del servizio non e ispezionato nel codice.
8. **Estensione territoriale**: non documentata localmente; dalla sorgente e presumibilmente Italia/territorio coperto da ISPRA, ma non codificato nel repo.
9. **Versione/data aggiornamento**: assente nel repo.
10. **Campi/attributi disponibili**: nessuno disponibile nel frontend; solo `id`, `url`, `layers`, `opacity`, `attribution`.
11. **Valori/classi presenti**: layer name `aree_peric_idraulica_p3`. Il repo documenta solo la classe P3 nel nome/attribution.
12. **Significato tecnico classi**: non documentato nel repository. Non viene inclusa legenda tecnica P1/P2/P3 o definizione di P3.
13. **Valori mancanti**: geometrie, legenda, campi, classi, timestamp, CRS esplicito, endpoint WFS/GetFeatureInfo.
14. **Codice che carica/visualizza**:
    - `AtlasPage`: `publicWmsOverlays` include `id: "ispra-flood-p3"`, `url: "https://sdi.isprambiente.it/geoserver/nz1/wms"`, `layers: "aree_peric_idraulica_p3"`.
    - `ProfessionalPage`: `professionalWmsOverlays` include `id: "professional-ispra-flood-p3"` con stesso servizio/layer.
    - `CollapseMap`: renderizza `<WMSTileLayer format="image/png" transparent version="1.3.0" />`.
15. **Contribuisce al punteggio?** No. Viene soltanto mostrato come overlay quando il layer idraulico e attivo.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: interrogazione puntuale della classe idraulica via WFS/GetFeatureInfo o dataset vettoriale locale.
    - Path 01 area/tracciato: intersezione tra area/tracciato/buffer e poligoni P3; calcolo percentuale area/lunghezza esposta.
    - Path 02 ponti: point-in-polygon per ogni ponte o distanza da poligoni P3 se disponibile geometria.
17. **Problemi**: WMS e immagine, non dato analitico. Senza WFS/GeoJSON/Shapefile/GeoPackage/raster non si possono calcolare esposizioni riproducibili offline. Possibili problemi futuri: axis order WMS 1.3.0, disponibilita servizio remoto, performance, cache, CORS, legenda.
18. **Dati dichiarati ma assenti**: non sono presenti P1/P2, reticolo idrografico, campi di pericolosita o geometrie locali.

### 3. ISPRA IdroGEO - Pericolosita frane PAI

1. **Percorsi/configurazioni**:
   - `src/pages/AtlasPage.jsx`
   - `src/pages/ProfessionalPage.jsx`
   - `server/hazard/providers/ispraLandslideProvider.js`
   - `server/hazard/normalizers/landslideNormalizer.js`
   - rendering in `src/components/map/CollapseMap.jsx`
2. **Nome sorgente**: `Mosaicatura della pericolosita da frana PAI`.
3. **Formato**: servizio remoto WFS per il calcolo point-level; servizio remoto WMS per controllo visuale.
4. **Dimensione file**: nessun file locale.
5. **Tipo**: servizio remoto; dato gia utilizzato nei calcoli Path 01 in shadow mode; layer visuale WMS separato.
6. **Tipo dato**: poligono/multipoligono.
7. **CRS**: ARCUS richiede `EPSG:4326`; BBOX `west,south,east,north,EPSG:4326`.
8. **Estensione territoriale**: nazionale, Italia.
9. **Versione/data aggiornamento**: mosaicatura PAI ISPRA v.5.0, riferimento 2024.
10. **Campi/attributi disponibili**: `id`, `geom`, `cod_per_it`.
11. **Valori/classi presenti**: `0 = AA`, `1 = P1`, `2 = P2`, `3 = P3`, `4 = P4`.
12. **Significato tecnico classi**: `AA` aree di attenzione; `P1` moderata; `P2` media; `P3` elevata; `P4` molto elevata.
13. **Valori mancanti**: nessun raster/griglia locale; nessun normalized score assegnato.
14. **Codice che carica/visualizza**:
    - `AtlasPage`: `publicWmsOverlays` include `id: "ispra-idrogeo-landslide-pai"`, `url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/wms"`, `layers: "idrogeo:pericolosita_frane"`.
    - `ProfessionalPage`: `professionalWmsOverlays` include `id: "professional-ispra-landslide-pai"`.
    - `hazardExposureService`: include provider `landslide`.
    - `ispraLandslideProvider`: interroga WFS e usa point-in-polygon locale.
    - `CollapseMap`: render WMS visuale.
15. **Contribuisce al punteggio?** No. Produce esposizione ufficiale point-level in shadow mode; `normalized_score = null`; non contribuisce al Final Priority Index.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: WFS candidate retrieval + point-in-polygon locale.
    - Path 01 area/tracciato: overlay e percentuale area/tracciato/buffer interessata.
    - Path 02 ponti: non implementato in questo milestone.
17. **Problemi**: servizio remoto; possibili differenze visuali WMS/WFS per scala/generalizzazione; performance dipendente dal provider.
18. **Dati dichiarati ma assenti**: integrazione Path 02, scoring calibrato, area/tracciato, campionamento raster.

Nota: il layer `frane`/IFFI resta distinto dal layer PAI e non e usato come fonte analitica di pericolosita PAI.

### 4. INGV MPS04 seismic hazard

1. **Percorsi/configurazioni**:
   - `private-data/professional/external-hazard-layers.json`
   - `scripts/build-data.js`
   - labels in `src/pages/AtlasPage.jsx`, `src/pages/MethodologyPage.jsx`, `src/pages/AnalyticsPage.jsx`, `src/pages/PlansPage.jsx`
2. **Nome sorgente**: `INGV MPS04 seismic hazard`.
3. **Formato**: metadata JSON e testo UI. Nessun dataset locale trovato.
4. **Dimensione file**: incluso nel registry da 3,398 byte; nessun file dedicato.
5. **Tipo**: semplice metadata / dichiarazione; non layer visuale effettivo; non usato nei calcoli.
6. **Tipo dato**: nel registry e previsto come `grid or zone lookup`, ma il dato non e presente.
7. **CRS**: assente.
8. **Estensione territoriale**: assente nel repo.
9. **Versione/data aggiornamento**: assente nel repo.
10. **Campi/attributi disponibili**: metadata registry.
11. **Valori/classi presenti**: nessuna PGA, probabilita, periodo di ritorno, griglia o zona.
12. **Significato tecnico classi**: non documentato localmente.
13. **Valori mancanti**: griglia MPS04, valori PGA, CRS, risoluzione, modello di interpolazione, endpoint, legenda.
14. **Codice che carica/visualizza**:
    - Registry caricato da `ProfessionalPage`.
    - `AtlasPage` espone un controllo `MPS04 seismic`, ma non esiste un corrispondente oggetto WMS in `publicWmsOverlays`.
    - `ProfessionalPage` mantiene `activeProfessionalHazardLayers.seismic`, ma `professionalWmsOverlays` non contiene overlay con `layerKey: "seismic"`.
15. **Contribuisce al punteggio?** No come dataset reale. Il rischio sismico corrente e solo proxy tramite cause ARCUS `Earthquake` dentro `hazard-exposure-preview`.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: sampling della griglia PGA/zona al punto.
    - Path 01 area/tracciato: zonal statistics o sampling lungo tracciato/buffer.
    - Path 02 ponti: sampling PGA/zona per ogni coordinate asset.
17. **Problemi**: dichiarato ma assente. Il toggle UI puo far pensare a un layer attivo, ma non e collegato a dati visuali o analitici.
18. **Dati dichiarati ma assenti**: MPS04 grid/raster/WMS/WFS, PGA values, seismic zones.

### 5. ISPRA ITHACA capable faults

1. **Percorso**: `private-data/professional/external-hazard-layers.json`
2. **Nome sorgente**: `ISPRA ITHACA capable faults`.
3. **Formato**: metadata JSON.
4. **Dimensione file**: incluso nel registry da 3,398 byte.
5. **Tipo**: metadata; non dato locale; non layer visuale; non calcolo.
6. **Tipo dato**: previsto come lineare, ma nessuna geometria e presente.
7. **CRS**: assente.
8. **Estensione territoriale**: assente.
9. **Versione/data aggiornamento**: assente.
10. **Campi/attributi disponibili**: solo registry metadata.
11. **Valori/classi presenti**: nessuna classe.
12. **Significato tecnico classi**: non documentato.
13. **Valori mancanti**: geometrie di faglia, campi, classi, CRS, aggiornamento.
14. **Codice che carica/visualizza**: registry Professional, sezione external layers.
15. **Contribuisce al punteggio?** No.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: distanza dal segmento di faglia capace piu vicino.
    - Path 01 area/tracciato: buffer/intersection e distanza minima.
    - Path 02 ponti: nearest line/distance per asset.
17. **Problemi**: solo dichiarazione.
18. **Dati dichiarati ma assenti**: dataset ITHACA effettivo.

### 6. Protezione Civile meteo-hydro alerts

1. **Percorso**: `private-data/professional/external-hazard-layers.json`
2. **Nome sorgente**: `Protezione Civile meteo-hydro alerts`.
3. **Formato**: metadata JSON.
4. **Dimensione file**: incluso nel registry da 3,398 byte.
5. **Tipo**: metadata / research.
6. **Tipo dato**: non presente.
7. **CRS**: assente.
8. **Estensione territoriale**: assente.
9. **Versione/data aggiornamento**: assente.
10. **Campi/attributi disponibili**: solo registry.
11. **Valori/classi presenti**: nessuna allerta o zona.
12. **Significato tecnico classi**: non documentato.
13. **Valori mancanti**: feed strutturato, zone, livelli allerta, validita temporale.
14. **Codice che carica/visualizza**: registry Professional.
15. **Contribuisce al punteggio?** No.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto/area/tracciato: overlay con zone di allerta e validita temporale.
    - Path 02 ponti: matching asset-zona allerta.
17. **Problemi**: marcato come `research`; nessun feed implementato.
18. **Dati dichiarati ma assenti**: allerta operative correnti/storiche.

### 7. `hazard-exposure-preview`

1. **Percorso**: `private-data/professional/hazard-exposure-preview.json`
2. **Nome sorgente**: ARCUS internal hazard exposure preview.
3. **Formato**: JSON.
4. **Dimensione**: 97,609 byte.
5. **Tipo**: dato locale; proxy costruito dal database ARCUS; dato gia usato nei calcoli Path 02.
6. **Tipo dato**: tabellare provinciale; non geometrico.
7. **CRS**: non applicabile.
8. **Estensione territoriale**: province italiane presenti nei record ARCUS; 79 province nel file.
9. **Versione/data**: `generated_at = 2026-06-11T07:35:38.781Z`; `status = "preview"`.
10. **Campi/attributi disponibili**:
    - top-level: `generated_at`, `method`, `status`, `hazard_groups`, `provinces`
    - province: `province`, `total_events`, `risk_score`, `dominant_hazard`, `hazards`
    - hazard: `key`, `label`, `matched_events`, `share`, `score`, `external_layers`
11. **Valori/classi presenti**:
    - `hydraulic`, `landslide`, `seismic`, `structural`
    - cause ARCUS: `Hydraulic`, `Landslide`, `Earthquake`, `Material`, `Design and Construction`, `Overload`
12. **Significato tecnico classi**: documentato dal file stesso come proxy: `method = "ARCUS internal pattern proxy; external geospatial joins pending"`.
13. **Valori mancanti**: nessuna geometria, nessuna intersezione ISPRA/INGV, nessun valore reale PGA/P3/IFFI.
14. **Codice che crea/carica/visualizza**:
    - creato in `scripts/build-data.js`.
    - esposto via `server/dataService.js` come `hazard-exposure-preview`.
    - caricato in `src/pages/ProfessionalPage.jsx` e `src/pages/AtlasPage.jsx`.
    - usato da `src/utils/analytics.js` in `buildAssetScreening`.
15. **Contribuisce al punteggio?** Si, ma come proxy ARCUS:
    - Path 02: `dominantHazard.score` entra nello score asset tramite `buildAssetScreening`.
    - Path 01: viene mostrato/letto come contesto; il final priority corrente ricade normalmente su `scenarioScore`/`riskScore` perche la provincia non espone un `score` top-level.
16. **Operazione geospaziale necessaria**:
    - Non esegue operazioni geospaziali. Per diventare exposure reale dovrebbe essere sostituito/integrato con join puntuali, areali o raster.
17. **Problemi**: rischio di ambiguita semantica: i campi `external_layers` citano layer esterni, ma i valori sono calcolati da cause ARCUS, non da overlay esterni.
18. **Dati dichiarati ma assenti**: layer esterni effettivi per validare o sostituire il proxy.

Formula corrente nel generatore:

```js
matchedEvents = sum(profile.causeCounts[cause])
share = profile.total > 0 ? matchedEvents / profile.total : 0
score = Math.min(
  100,
  Math.round(
    share * 70 +
    Math.min(profile.total * 2, 20) +
    Math.min(profile.riskScore * 0.1, 10)
  )
)
```

### 8. `territory-profiles`

1. **Percorso**: `private-data/professional/territory-profiles.json`
2. **Nome sorgente**: ARCUS territory profiles.
3. **Formato**: JSON.
4. **Dimensione**: 107,509 byte.
5. **Tipo**: dato locale; proxy/aggregazione ARCUS; usato nei calcoli.
6. **Tipo dato**: tabellare per territorio; non geometrico.
7. **CRS**: non applicabile.
8. **Estensione territoriale**: province e regioni derivate dai record ARCUS.
9. **Versione/data**: generato dal build data Professional; file coerente con release 2026-06-11.
10. **Campi/attributi disponibili**: `territory`, `total`, `totalCollapse`, `victims`, `injuries`, `triggered`, `exactLocations`, `sourceTotal`, `avgSources`, `firstYear`, `causeCounts`, `topCause`, `riskScore`, `scoreBreakdown`.
11. **Valori/classi presenti**: cause ARCUS aggregate; non classi ISPRA/INGV.
12. **Significato tecnico classi**: cause interne ARCUS.
13. **Valori mancanti**: geometry, hazard layer classes.
14. **Codice che crea/carica/visualizza**:
    - `buildTerritoryProfiles` in `src/utils/analytics.js`.
    - chiamato da `scripts/build-data.js`.
    - caricato/ricostruito in `src/pages/ProfessionalPage.jsx`, `EnterprisePage.jsx`.
15. **Contribuisce al punteggio?** Si, come risk/profile score ARCUS. Non e hazard geospaziale reale.
16. **Operazione geospaziale necessaria**:
    - Per Path 01 dovrebbe essere associato a geometria provincia/area tramite confini amministrativi.
    - Per Path 02 non basta: servirebbe join asset-territorio o asset-hazard.
17. **Problemi**: provincia/territorio come aggregazione nominale, non overlay geometrico.
18. **Dati dichiarati ma assenti**: hazard reali per correggere/integrare la statistica ARCUS.

### 9. `ainop-bridge-index`

1. **Percorsi**:
   - `private-data/professional/ainop-bridge-index.json`
   - raw: `private-data/professional/ainop/infrastrutture-ferroviarie-ponti.csv`
   - raw: `private-data/professional/ainop/infrastrutture-stradali-ponti.xlsx`
2. **Nome sorgente**: `MIT Open Data / AINOP - Elenco opere pubbliche censite su portale AINOP`.
3. **Formato**:
   - JSON indicizzato Professional.
   - CSV ferroviario.
   - XLSX stradale.
4. **Dimensione**:
   - index JSON: 121,507 byte.
   - CSV ferroviario: 4,162,493 byte.
   - XLSX stradale: 10,841,560 byte.
5. **Tipo**: dato locale; fonte pubblica/non hazard; denominatore infrastrutturale; usato nei benchmark Path 01.
6. **Tipo dato**: tabellare provinciale nel JSON; raw potenzialmente tabellare/asset-level.
7. **CRS**: non indicato nel JSON index. I raw non sono analizzati nel motore corrente.
8. **Estensione territoriale**: Italia/province.
9. **Versione/data**:
   - `generated_at = 2026-06-08T15:34:25.6425560Z`
   - `source_last_updated = 2025-11-25`
10. **Campi/attributi disponibili**:
    - metadata: `source`, `license`, `caveat`, `formula`, `total_ainop_road_bridges`, `total_ainop_rail_bridges`, `national_rate_per_100_ainop_bridges`
    - province: `province`, `province_key`, `arcus_cases`, `ainop_bridges_total`, `ainop_road_bridges`, `ainop_rail_bridges`, `collapse_rate_per_100_ainop_bridges`, `relative_to_national`, `coverage_flag`, `national_rank_by_rate`, `percentile_by_rate`, `collapse_rate_confidence`
11. **Valori/classi presenti**:
    - `coverage_flag`: ad esempio `available`, `no_ainop_denominator`
    - `collapse_rate_confidence`: `high`, `medium`, `low`, `very_low`, `unavailable`
12. **Significato tecnico classi**: documentato nei metadata: confidence e basata sulla disponibilita/dimensione del denominatore provinciale AINOP, non su validazione del rischio strutturale.
13. **Valori mancanti**: province con denominatore zero hanno `collapse_rate_per_100_ainop_bridges = null`, `relative_to_national = null`, `collapse_rate_confidence = unavailable`.
14. **Codice che carica/visualizza**:
    - mapping API in `server/dataService.js`.
    - caricato in `src/pages/ProfessionalPage.jsx` tramite `professionalResource("ainop-bridge-index")`.
    - usato nelle schermate e nei report Path 01 come benchmark/rate provinciale.
15. **Contribuisce al punteggio?** Si per contesto/rate provinciale Path 01. Non e hazard ISPRA/INGV e non e esposizione geospaziale.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: determinare provincia tramite point-in-polygon e leggere denominatore provinciale.
    - Path 01 area/tracciato: aggregare province attraversate o asset AINOP ricadenti nell'area/tracciato, se raw asset-level usabile.
    - Path 02 ponti: non serve per hazard; potrebbe servire per deduplicare o arricchire inventari caricati.
17. **Problemi**: licenza non commerciale indicata; caveat di completezza censuaria; non va trattato come inventario completo. Non e dataset hazard.
18. **Dati dichiarati ma assenti**: generatore dedicato dell'index non individuato nel codice corrente; eventuale uso geospaziale raw non implementato.

Formula metadata:

```text
provincial_rate = ARCUS cases in province / AINOP bridges counted in province * 100
relative_to_national = provincial_rate / national_rate
```

### 10. Confini provinciali Italia

1. **Percorso**: `public/data/geo/italy-provinces.geojson`
2. **Nome sorgente**: confini amministrativi provinciali/sovracomunali Italia.
3. **Formato**: GeoJSON FeatureCollection.
4. **Dimensione**: 7,148,616 byte.
5. **Tipo**: dato locale; layer visuale/supporto; non hazard; non scoring diretto.
6. **Tipo dato**: poligono/multipoligono.
7. **CRS**: `urn:ogc:def:crs:OGC:1.3:CRS84`.
8. **Estensione territoriale**: bbox `[6.626621418032803, 35.49345147127003, 18.520381593345082, 47.09178374125456]`; Italia.
9. **Versione/data aggiornamento**: non indicata nel file; path originario scaricato come `20240101` nel comando storico approvato.
10. **Campi/attributi disponibili**: `pkuid`, `cod_rip`, `cod_reg`, `cod_prov`, `cod_cm`, `cod_uts`, `den_prov`, `den_cm`, `den_uts`, `sigla`, `tipo_uts`, `shape_leng`, `shape_area`, `den_reg`, `den_rip`, `ontopia`.
11. **Valori/classi presenti**: 107 feature; 64 `Polygon`, 43 `MultiPolygon`.
12. **Significato tecnico classi**: amministrativo, non hazard.
13. **Valori mancanti**: nessuna classe hazard; alcune feature usano `den_prov = "-"` per citta metropolitane, con nome in `den_cm`/`den_uts`.
14. **Codice che carica/visualizza**:
    - `src/pages/HomePage.jsx`: mappa hero/territoriale.
    - `src/pages/ReportMapPath01.jsx`: boundary selezionata nel report.
    - `src/pages/ProfessionalPage.jsx`: fallback map image Path 01.
15. **Contribuisce al punteggio?** No direttamente. Potrebbe abilitare join territorio-provincia.
16. **Operazione geospaziale necessaria**:
    - Path 01 punto: point-in-polygon per provincia selezionata o coordinate.
    - Path 01 area/tracciato: intersection con province e calcolo quote.
    - Path 02 ponti: assegnazione provincia per coordinate asset.
17. **Problemi**: solo confini; non contiene hazard; serve libreria/algoritmo geometrico per usarlo lato scoring.
18. **Dati dichiarati ma assenti**: nessuno hazard.

### 11. Basemap tiles locali

1. **Percorso**: `public/data/map-tiles/voyager/**/*.png`
2. **Nome sorgente**: CARTO Voyager raster tiles cache.
3. **Formato**: PNG tile raster.
4. **Dimensione**: 3,647 tile; 37,017,090 byte totali.
5. **Tipo**: dato locale visuale; basemap; non calcolo.
6. **Tipo dato**: raster tile web map.
7. **CRS**: Web Mercator tile pyramid implicito; non dichiarato per singolo file.
8. **Estensione territoriale**: area tile scaricata intorno all'Italia/Europa; non descritta in metadata.
9. **Versione/data aggiornamento**: non indicata.
10. **Campi/attributi disponibili**: nessuno.
11. **Valori/classi presenti**: pixel cartografici.
12. **Significato tecnico classi**: non applicabile.
13. **Valori mancanti**: nessun attributo interrogabile.
14. **Codice che carica/visualizza**:
    - `src/pages/ReportMapPath01.jsx`
    - fallback map image in `src/pages/ProfessionalPage.jsx`
15. **Contribuisce al punteggio?** No.
16. **Operazione geospaziale necessaria**: nessuna per scoring; non idoneo a hazard exposure.
17. **Problemi**: e basemap, non dato analitico.
18. **Dati dichiarati ma assenti**: non applicabile.

### 12. Export GeoJSON generati

1. **Percorsi**:
   - `server/exportService.js`
   - `src/pages/ProfessionalPage.jsx`
   - `scripts/export-path01-report.js`
2. **Nome sorgente**: output GIS/GeoJSON ARCUS.
3. **Formato**: GeoJSON generato in runtime/export.
4. **Dimensione file**: non applicabile staticamente.
5. **Tipo**: output, non sorgente territoriale hazard.
6. **Tipo dato**: punti/eventi o summary geometry, secondo export.
7. **CRS**: GeoJSON coordinate lon/lat implicite; non e dataset hazard.
8. **Estensione territoriale**: scope dell'export.
9. **Versione/data**: generata al momento dell'export.
10. **Campi/attributi disponibili**: derivati da eventi/scope ARCUS.
11. **Valori/classi presenti**: eventi, fonti, metadata export.
12. **Significato tecnico classi**: ARCUS event data, non ISPRA/INGV.
13. **Valori mancanti**: non contiene classi hazard esterne.
14. **Codice che crea/visualizza**:
    - `server/exportService.js` produce GIS summary.
    - `ProfessionalPage` produce GeoJSON client-side per alcune azioni.
    - `scripts/export-path01-report.js` produce `arcus-path01-events.geojson`.
15. **Contribuisce al punteggio?** No. E output.
16. **Operazione geospaziale necessaria**: eventuale export potrebbe includere risultati di intersezione futura, ma oggi non li calcola.
17. **Problemi**: non va confuso con sorgente hazard.
18. **Dati dichiarati ma assenti**: attributi hazard reali esterni negli output.

## Flusso attuale

### WMS ISPRA visuale

```text
Servizio remoto ISPRA WMS
  -> configurazione hardcoded in AtlasPage / ProfessionalPage
  -> props publicWmsOverlays
  -> CollapseMap
  -> WMSTileLayer image/png transparent
  -> visualizzazione su mappa
  -> nessuna trasformazione geometrica
  -> nessuna API ARCUS di scoring
  -> nessun contributo al punteggio
```

### Metadata hazard esterni

```text
scripts/build-data.js
  -> externalHazardLayers registry
  -> private-data/professional/external-hazard-layers.json
  -> server/dataService.js /api/professional/external-hazard-layers
  -> ProfessionalPage
  -> sezione external/platform layers
  -> informativo
  -> nessun contributo al punteggio
```

### Proxy hazard ARCUS

```text
professional-events + buildTerritoryProfiles
  -> causeCounts provinciali ARCUS
  -> scripts/build-data.js calcola hazard-exposure-preview
  -> private-data/professional/hazard-exposure-preview.json
  -> server/dataService.js /api/professional/hazard-exposure-preview
  -> ProfessionalPage / AtlasPage
  -> buildAssetScreening
  -> hazardScore provinciale proxy
  -> score Path 02
```

### Confini provinciali

```text
public/data/geo/italy-provinces.geojson
  -> fetch frontend
  -> HomePage / ReportMapPath01 / ProfessionalPage fallback map
  -> visualizzazione confini provincia
  -> nessuna trasformazione scoring corrente
```

### AINOP bridge index

```text
AINOP raw CSV/XLSX
  -> ainop-bridge-index.json gia prodotto
  -> server/dataService.js /api/professional/ainop-bridge-index
  -> ProfessionalPage
  -> benchmark/rate provinciale Path 01
  -> non hazard geospaziale
```

## Path 01: stato esposizione geospaziale effettiva

Path 01 per nuova costruzione usa oggi una logica territoriale/provinciale: provincia selezionata, profilo ARCUS provinciale, rate/benchmark AINOP e contesto hazard preview. I WMS possono essere mostrati nella mappa, ma non vengono interrogati.

Per calcolare esposizione geospaziale effettiva servirebbero:

- coordinate del punto o geometria area/tracciato;
- dataset hazard vettoriale/raster interrogabile;
- operazioni point-in-polygon, line/area intersection, buffer o raster sampling;
- normalizzazione e serializzazione del risultato dentro output Path 01.

Nel codice corrente non sono presenti le funzioni di overlay analysis per ISPRA/INGV.

## Path 02: stato esposizione geospaziale effettiva

Path 02 prioritizza asset caricati usando `buildAssetScreening`. Lo score include:

- `hazardScore` ricavato dal dominante provinciale in `hazard-exposure-preview`;
- `profileScore`;
- eta, condizione, materiali, strategic route, inspection age e altri campi asset.

Il `hazardScore` non deriva dalla posizione del ponte rispetto a poligoni/raster ISPRA/INGV. E un proxy provinciale costruito sui pattern storici ARCUS. Per ogni ponte caricato non viene eseguita alcuna intersezione con WMS/WFS o campionamento MPS04.

## Problemi tecnici e copertura

- I WMS sono tile immagine: ottimi per contesto visuale, insufficienti per scoring robusto senza GetFeatureInfo/WFS o copia vettoriale/raster.
- INGV MPS04 e ora implementato come provider `grid_sampling` su griglia locale processata, ma richiede setup in `private-data/professional/seismic`.
- `activeProfessionalHazardLayers.seismic` resta un controllo visuale/concettuale; non esiste un overlay WMS sismico usato per calcolo.
- IdroGEO `frane` e caricato come inventario visuale, ma il repo non documenta classi hazard/suscettibilita/pericolosita.
- Il layer idraulico e solo P3; non risultano P1/P2 o classi multiple.
- Non risultano shapefile, geopackage, geotiff/tiff hazard locali.
- Per MPS04 esiste ora una conversione offline ED50 EPSG:4230 -> WGS84 EPSG:4326 con `proj4`, seguita da nearest-node grid sampling. Non sono stati introdotti raster sampling, zonal statistics o interpolazioni inventate.
- `data-release.json` dichiara che gli external hazard layers non sono inclusi nella release.

## Dati dichiarati nell'interfaccia ma assenti o non calcolabili

- `INGV MPS04 seismic hazard`: sorgente ufficiale individuata e provider implementato; il dataset locale resta assente finche non si eseguono `npm run download:ingv-mps04` e `npm run build:ingv-mps04-grid`.
- `ISPRA ITHACA capable faults`: dichiarato, non caricato.
- `Protezione Civile meteo-hydro alerts`: dichiarato, non caricato.
- `river network` e `hydrographic context`: citati in Methodology, non trovati come dataset.
- `ISPRA / INGV territorial intersection`: citato in Analytics/Plans, non implementato come intersezione geospaziale reale.
- `Sismica MPS04` toggle Atlas: presente come controllo/label, ma senza overlay reale.

## File che servirebbe modificare per vere intersezioni geospaziali

Senza proporre nuove formule, i punti di integrazione necessari sarebbero:

- `server/dataService.js`: registrare e servire risorse hazard reali o endpoint calcolo.
- `scripts/build-data.js`: ingest/normalizzazione dataset esterni se batch/offline.
- `scripts/download-ingv-mps04.js` e `scripts/build-ingv-mps04-grid.js`: gia introdotti per MPS04, da eseguire per produrre risorse private locali.
- `server/hazard/providers/ingvSeismicProvider.js`: gia introdotto per Path 01 seismic MPS04.
- `src/utils/analytics.js`: integrare risultati di esposizione reale in `buildAssetScreening` o funzioni analoghe.
- `src/pages/ProfessionalPage.jsx`: passare coordinate/geometrie Path 01/Path 02 al motore e visualizzare risultati.
- `src/pages/AtlasPage.jsx`: separare overlay visuali da layer analitici; aggiungere eventuale stato dati effettivi.
- `src/components/map/CollapseMap.jsx`: eventuale supporto GetFeatureInfo/feature layer se si resta su servizi remoti.
- `server/exportService.js` e `scripts/export-path01-report.js`: includere risultati hazard reali negli export/report.

## File analizzati

- `private-data/professional/external-hazard-layers.json`
- `private-data/professional/hazard-exposure-preview.json`
- `private-data/professional/territory-profiles.json`
- `private-data/professional/ainop-bridge-index.json`
- `private-data/professional/data-release.json`
- `private-data/professional/data-quality.json`
- `private-data/professional/ainop/infrastrutture-ferroviarie-ponti.csv`
- `private-data/professional/ainop/infrastrutture-stradali-ponti.xlsx`
- `public/data/geo/italy-provinces.geojson`
- `public/data/map-tiles/voyager/**/*.png`
- `scripts/build-data.js`
- `scripts/export-path01-report.js`
- `server/dataService.js`
- `server/exportService.js`
- `server/README.md`
- `src/components/map/CollapseMap.jsx`
- `src/utils/analytics.js`
- `src/pages/AtlasPage.jsx`
- `src/pages/ProfessionalPage.jsx`
- `src/pages/ReportMapPath01.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/MethodologyPage.jsx`
- `src/pages/AnalyticsPage.jsx`
- `src/pages/PlansPage.jsx`

## Esito finale

ARCUS oggi possiede:

- una base dati ARCUS robusta per collassi, fonti, reliability, vulnerability e scoring interno;
- denominatori/proxy territoriali utili per lettura provinciale;
- due WMS ISPRA reali per visualizzazione professionale;
- un provider MPS04 INGV locale-grid per Path 01, subordinato alla presenza dei file privati processati;
- un registry chiaro dei layer pubblici che si intendono integrare.

ARCUS oggi non possiede ancora:

- hazard ISPRA/INGV locali pienamente calcolabili per tutti i Path;
- endpoint WFS o GeoJSON hazard esterni;
- raster/Grid MPS04/PGA committato nel repository pubblico;
- operazioni geospaziali di intersezione o sampling nei Path Professional.

Quindi Path 01 e ora **parzialmente geospatial-exposure-ready**: hydraulic WFS, landslide WFS e seismic MPS04 local-grid sono cablati come shadow providers. Path 02 resta basato su proxy/profili provinciali e non esegue ancora campionamenti hazard reali per ogni asset.
