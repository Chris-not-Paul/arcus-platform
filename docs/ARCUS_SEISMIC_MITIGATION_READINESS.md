# ARCUS Seismic Mitigation Readiness

Status: implemented as a source-backed, abstention-only support layer.

## Decision

ARCUS must not copy the Hydraulic strategy engine onto the seismic records.
The database contains three Earthquake-classified bridge records, but all refer
to the 6 April 2009 L'Aquila earthquake. They therefore represent one
historical episode, not three independent replications. Only one case currently
has a sufficiently coherent source-backed mechanism for the provisional
evidence cohort.

The production output is consequently always `abstained`, with zero seismic
strategies and no Final Priority Index contribution.

## Source review

The curation uses primary or technical reconnaissance sources:

- [ISPRA geological-effects report](https://www.isprambiente.gov.it/contentfiles/00004800/4880-2009-abruzzo-earthquake-report.pdf), which attributes the Onna and Fossa bridge collapses to progressive embankment ground failures;
- [EERI/ReLUIS reconnaissance report](https://www.reluis.it/doc/pdf/Aquila/EERI_L_Aquila_report.pdf), which describes the Fossa bridge and a likely column-failure mechanism;
- [EEFIT mission report](https://www.istructe.org/IStructE/media/Public/Resources/report-eefit-laquila-italy-20190816.pdf), which reports Fossa support columns punching through the deck;
- [peer-reviewed reconnaissance study](https://doi.org/10.1080/13632460903584055), which documents bridge and geotechnical damage mechanisms;
- [Dipartimento della Protezione Civile](https://emergenze.protezionecivile.gov.it/it/sismiche/terremoto-abruzzo-2009/), used for the common earthquake episode context.

## Registry disposition

| Event | Disposition | Independent episode | Reason |
|---|---|---|---|
| `B09.04.01` Ponte di Fossa | excluded from process learning | `EQ-2009-04-06-LAQUILA` | confirmed collapse, but structural column failure and progressive embankment failure remain competing technical interpretations; pre-existing degradation is also reported |
| `B09.04.02` Aterno bridge near Onna | eligible | `EQ-2009-04-06-LAQUILA` | source-backed earthquake-induced progressive embankment failure transmitted to piers and superstructure; coordinate identity is reconciled but the asset name and severity wording retain limitations |
| `B09.04.03` Scoppito | excluded for insufficient evidence | none | no case-specific authenticated bridge identity, component or failure mechanism is available |

Unknown fields remain null. Current MPS04 PGA is not used to fill historical
outcome fields and is not interpreted as recorded shaking at the collapse date.

## Provisional support contract

`seismic-support-contract-v1` is an abstention barrier, not a validated
strategy-activation rule.

| Requirement | Provisional minimum | Observed |
|---|---:|---:|
| Independent eligible episodes | 5 | 1 |
| Episode-effective evidence | 4 | 1 |
| Independent episodes for one failure process | 5 | 1 |
| Episode-effective evidence for one failure process | 4 | 1 |

The single eligible outcome is weighted `documented = 1`. Multiple bridges
from the same earthquake can contribute at most one episode-effective unit to
the same process.

## Separation of evidence families

ARCUS keeps these elements separate:

1. current INGV MPS04 reference PGA at the selected point;
2. historical earthquake-associated bridge outcomes;
3. present bridge vulnerability, detailing and condition;
4. site effects, microzonation, ground deformation and liquefaction;
5. professional retrofit or monitoring decisions.

MPS04 is not local amplification, recorded site shaking, collapse probability,
a safe/unsafe label, an automatic attention class or retrofit priority.

## Allowed and blocked outputs

Allowed now:

- current MPS04 point exposure with provenance;
- source-backed historical outcome curation;
- explicit episode independence;
- explicit abstention and missing-evidence explanation.

Blocked now:

- automatic seismic attention or retrofit-priority assignment;
- process-specific seismic strategies;
- treating the three L'Aquila bridge records as independent episodes;
- back-casting current PGA to 2009;
- automatic monitoring frequencies or design prescriptions.

## Reproducible gate

Run:

```text
npm run audit:seismic-readiness
npm run test:seismic-mitigation
```

The next admissible scientific step is acquisition and technical curation of
additional bridge-collapse episodes caused by different earthquakes, followed
by external structural and geotechnical expert review. Production seismic
strategies remain disabled until both requirements are met.

## Evidence acquisition gate

The next step is now supported by `seismic-evidence-intake-v1`. Candidate
records remain outside the production registry and receive one of three
statuses: `blocked_evidence_gaps`, `ready_for_expert_review` or
`ready_for_registry_review`. Even the last state has `production_effect: none`
and requires a separate editorial decision.

The gate requires a dated independent episode, source-backed bridge identity
and outcome, a coherent mechanism, case-specific technical evidence and three
named approvals. It explicitly rejects current MPS04 as historical ground
motion. See `ARCUS_SEISMIC_EVIDENCE_ACQUISITION_PROTOCOL.md` and run:

```text
npm run audit:seismic-intake
npm run test:seismic-intake
```
