# ARCUS Research Plus — Failure Research Workbench

Status: implemented research prototype, not externally validated as a statistical or predictive model

Interface: authenticated `/analytics/pro`

Method version: `arcus-research-plus-v1`

## Purpose

ARCUS Research Plus turns the controlled collapse archive into a reproducible
research environment. It supports transparent exploration of documented
failures; it does not estimate bridge risk, collapse probability, safety,
causal effects or national prevalence.

Open Analytics remains the complete descriptive entry point for the public
release. Research Plus adds workflows whose value comes from sensitivity,
traceability and saved research state rather than from hiding elementary
charts behind authentication.

## Modules

### 1. Episode Intelligence

The module groups dated hydraulic records using adjustable temporal and spatial
thresholds. Curated episode identifiers, when present, take precedence. The
interface always separates:

- bridge-collapse records;
- rule-based research episodes;
- multi-collapse episodes;
- the largest observed group.

Three fixed sensitivity scenarios accompany the adjustable result:

| Scenario | Maximum temporal gap | Maximum distance |
|---|---:|---:|
| Strict | 0 days | 50 km |
| Working baseline | 2 days | 150 km |
| Broad | 3 days | 300 km |

These groups are deterministic sensitivity constructs. They are not a
meteorological reanalysis and do not prove common causation.

For the current controlled dataset, the 211 hydraulic records produce 118,
105 and 94 groups respectively under the strict, reference and broad
scenarios. The largest group contains 43 records under all three scenarios.

The controlled ARCUS rule-based registry currently contains 99 episodes. A
16-combination calibration sweep found the highest pairwise concordance at a
1-day, 300 km setting: 97 research groups, pairwise F1 `0.998`, precision
`0.997` and recall `0.998`. The default 2-day, 150 km research setting produces
105 groups and F1 `0.970`. These values measure agreement with another
rule-based method; they are not accuracy against meteorological ground truth.

### 2. Failure Chain Explorer

The explorer aggregates the documented sequence:

`failure trigger → failure process → component involved`

Every row reports record count, share of the selected cohort and, for the
hydraulic cohort, independent episode count. Missing links remain explicitly
`Not documented`; they are not imputed or completed from neighbouring fields.

### 3. Analogue Case Lab

The user selects an index collapse and controls the variables used for
retrieval. The initial feature set is:

- cause family;
- trigger;
- failure process;
- component involved;
- structural type;
- material;
- use;
- observed collapse severity.

Similarity is a weighted exact-match measure calculated only over fields
populated in both records. The interface reports both similarity and feature
coverage, exposes every match/difference and can exclude records belonging to
the same inferred episode. The percentage is not a probability, safety class
or validated prediction.

Across all 211 hydraulic index cases, leave-one-feature-out analysis retains an
average of 79.7% of the top-five analogue set. The most sensitive case retains
58% on average, and individual feature removals can replace the entire top five.
Several cases also have multiple candidates with identical similarity and
coverage. The interface therefore exposes equivalent-candidate counts and
feature-removal sensitivity rather than presenting an arbitrary first result as
uniquely best.

The current audit finds an average of 11.2 candidates tied with the leading
candidate on both similarity and feature coverage. This confirms that the
current taxonomy supports useful analogue sets, but often does not support a
scientifically unique rank order inside those sets.

### 4. Robustness and Sensitivity

The workbench recalculates the most represented documented failure process
under five scenarios:

- all records;
- records with documented mechanism evidence;
- high source-confidence records;
- records linked to a technical or scientific source;
- one representative record per inferred episode.

It also performs a leave-one-episode-out stability check. `Stable` means only
that the same category remains the most frequent in the controlled archive;
it is not inferential or engineering validation.

In the current hydraulic cohort, `Scour` remains the leading documented
process in all five scenarios and in 100% of the leave-one-episode-out runs.
This is a descriptive result and must not be generalized to the Italian bridge
population.

### 5. Reproducible Research Notebook

Researchers can save filters, episode thresholds, module state, analogue
features, index case and methodological notes in the browser. A ZIP research
package contains:

- `manifest.json` with release, denominators, limitations and checksums;
- `notebook.json` with the saved analytical state;
- `records.csv` and `sources.csv`;
- `episodes.csv`;
- `failure-chains.csv`;
- `analogues.csv`, including feature-level comparison;
- `robustness.csv`;
- `methods.md`.

SHA-256 checksums cover every package file created before the manifest. The
package retains missing values and uses public `ITxx.xx.xx` identifiers where
available.

## Access and interpretation boundary

The workbench reads only authenticated Professional resources. It does not
read the internal master workbook or the processed-data directory directly.
Synthetic vulnerability and ranking resources are not used.

The current prototype is strongest for hydraulic failures because they form
the only sufficiently populated mechanism family for episode-based analysis.
Sparse landslide and seismic cohorts remain visible for basic comparison, but
the interface abstains from applying the hydraulic episode method to them.

## Validation status and next evidence gate

Implementation tests cover deterministic grouping, spatial separation,
same-episode exclusion, transparent analogue scoring, robustness scenarios,
CSV escaping and the product boundary. The production build and existing Open
release tests also pass.

Before commercial release, the method still requires:

1. expert review of the three episode-threshold scenarios;
2. reconciliation against the controlled hydraulic episode registry;
3. task-based evaluation with research partners;
4. assessment of retrieval usefulness against simple fair baselines;
5. versioned governance for changes to feature weights and episode rules.

The moderated five-task evaluation and acceptance gates are preserved in
`archive/ARCUS_RESEARCH_PLUS_PARTNER_VALIDATION_PROTOCOL.md`. The pilot is
currently paused; archiving the protocol does not change the scientific
limitations of the workbench.

Until those gates pass, Research Plus is a credible research prototype, not a
validated decision-support or predictive system.
