import extractYear from "./extractYear.js";

export function countBy(items, getter) {
  return Object.entries(
    items.reduce((accumulator, item) => {
      const value =
        typeof getter === "function"
          ? getter(item)
          : item[getter];

      if (!value) {
        return accumulator;
      }

      accumulator[value] =
        (accumulator[value] || 0) + 1;

      return accumulator;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
}

export function sumBy(items, getter) {
  return items.reduce(
    (total, item) =>
      total + (Number(getter(item)) || 0),
    0
  );
}

export function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

export function buildSourceCountByEvent(sources) {
  return sources.reduce((accumulator, source) => {
    accumulator[source.event_id] =
      (accumulator[source.event_id] || 0) + 1;

    return accumulator;
  }, {});
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sourceCountScore(count) {
  if (count >= 5) {
    return 34;
  }

  if (count >= 3) {
    return 28;
  }

  if (count === 2) {
    return 22;
  }

  if (count === 1) {
    return 14;
  }

  return 0;
}

function sourceRoleScore(eventSources) {
  const roles = new Set(
    eventSources.map((source) =>
      normalizeText(source.source_role)
    )
  );

  let score = 0;

  if (roles.has("official/technical")) {
    score += 24;
  }

  if (roles.has("scientific")) {
    score += 22;
  }

  if (roles.has("news")) {
    score += 8;
  }

  return Math.min(score, 28);
}

function sourceTypeScore(eventSources) {
  const institutionalSignals = [
    "arpa",
    "cnr",
    "mit",
    "protezione civile",
    "regione",
    "vigili del fuoco",
  ];
  const scientificSignals = [
    "journal",
    "paper",
    "conference",
    "university",
  ];

  const types = eventSources.map((source) =>
    normalizeText(source.source_type)
  );

  if (
    types.some((type) =>
      institutionalSignals.some((signal) =>
        type.includes(signal)
      )
    )
  ) {
    return 8;
  }

  if (
    types.some((type) =>
      scientificSignals.some((signal) =>
        type.includes(signal)
      )
    )
  ) {
    return 7;
  }

  return eventSources.length > 0 ? 4 : 0;
}

function confidenceScore(confidence) {
  const normalized = normalizeText(confidence);

  if (normalized === "high") {
    return 14;
  }

  if (normalized === "medium") {
    return 8;
  }

  if (normalized === "low") {
    return 4;
  }

  return 5;
}

function reliabilityClass(score) {
  if (score >= 82) {
    return "A";
  }

  if (score >= 68) {
    return "B";
  }

  if (score >= 50) {
    return "C";
  }

  return "D";
}

export function buildSourceReliabilityByEvent(
  events,
  sources
) {
  const sourcesByEvent = sources.reduce(
    (accumulator, source) => {
      if (!accumulator[source.event_id]) {
        accumulator[source.event_id] = [];
      }

      accumulator[source.event_id].push(source);

      return accumulator;
    },
    {}
  );

  return events.reduce((accumulator, event) => {
    const eventSources =
      sourcesByEvent[event.event_id] || [];
    const count = eventSources.length;
    const temporalCoverage =
      eventSources.some(
        (source) =>
          source.publication_date ||
          source.access_date
      )
        ? 4
        : 0;
    const curation =
      normalizeText(event.curation_level) ===
      "flagship"
        ? 8
        : 5;
    const exactLocation = event.exact_location ? 10 : 4;

    const breakdown = [
      {
        key: "sources",
        label: "Source volume",
        max: 34,
        value: sourceCountScore(count),
      },
      {
        key: "role",
        label: "Source authority",
        max: 28,
        value: sourceRoleScore(eventSources),
      },
      {
        key: "confidence",
        label: "Curation confidence",
        max: 14,
        value: confidenceScore(
          event.source_confidence
        ),
      },
      {
        key: "location",
        label: "Spatial precision",
        max: 10,
        value: exactLocation,
      },
      {
        key: "type",
        label: "Source type quality",
        max: 8,
        value: sourceTypeScore(eventSources),
      },
      {
        key: "curation",
        label: "ARCUS curation level",
        max: 8,
        value: curation,
      },
      {
        key: "temporal",
        label: "Temporal traceability",
        max: 4,
        value: temporalCoverage,
      },
    ];

    const score = Math.min(
      100,
      breakdown.reduce(
        (total, item) => total + item.value,
        0
      )
    );
    const grade = reliabilityClass(score);

    accumulator[event.event_id] = {
      breakdown,
      grade,
      label:
        grade === "A"
          ? "Institutional-grade"
          : grade === "B"
            ? "Professional-grade"
            : grade === "C"
              ? "Review-grade"
              : "Weak evidence",
      score,
      sourceCount: count,
      sourceRoles: [
        ...new Set(
          eventSources
            .map((source) => source.source_role)
            .filter(Boolean)
        ),
      ],
    };

    return accumulator;
  }, {});
}

export function summarizeReliability(
  events,
  reliabilityByEvent
) {
  if (!events.length) {
    return {
      average: 0,
      gradeCounts: {},
      institutionalShare: 0,
      weakEvidence: 0,
    };
  }

  const profiles = events.map(
    (event) =>
      reliabilityByEvent[event.event_id] || {
        grade: "D",
        score: 0,
      }
  );
  const gradeCounts = profiles.reduce(
    (accumulator, profile) => {
      accumulator[profile.grade] =
        (accumulator[profile.grade] || 0) + 1;

      return accumulator;
    },
    {}
  );
  const average =
    profiles.reduce(
      (total, profile) => total + profile.score,
      0
    ) / profiles.length;

  return {
    average,
    gradeCounts,
    institutionalShare: percentage(
      (gradeCounts.A || 0) + (gradeCounts.B || 0),
      profiles.length
    ),
    weakEvidence: gradeCounts.D || 0,
  };
}

function constructionAgeScore(year) {
  const value = Number(year);

  if (!value) {
    return 6;
  }

  const age = new Date().getFullYear() - value;

  if (age >= 80) {
    return 12;
  }

  if (age >= 60) {
    return 10;
  }

  if (age >= 40) {
    return 7;
  }

  return 4;
}

function causeVulnerabilityScore(cause) {
  const normalized = normalizeText(cause);

  if (
    normalized.includes("hydraulic") ||
    normalized.includes("landslide") ||
    normalized.includes("earthquake")
  ) {
    return 16;
  }

  if (
    normalized.includes("material") ||
    normalized.includes("design") ||
    normalized.includes("construction") ||
    normalized.includes("overload")
  ) {
    return 14;
  }

  if (normalized.includes("impact")) {
    return 10;
  }

  return normalized ? 8 : 5;
}

function structuralVulnerabilityScore(event) {
  const structure = normalizeText(
    event.structural_type
  );
  const material = normalizeText(event.material_type);
  let score = 6;

  if (
    structure.includes("beam") ||
    structure.includes("arch") ||
    structure.includes("truss")
  ) {
    score += 4;
  }

  if (
    material.includes("masonry") ||
    material.includes("steel") ||
    material.includes("mixed")
  ) {
    score += 4;
  }

  if (material.includes("reinforced concrete")) {
    score += 2;
  }

  return Math.min(score, 14);
}

function vulnerabilityClass(score) {
  if (score >= 78) {
    return "Critical";
  }

  if (score >= 62) {
    return "High";
  }

  if (score >= 42) {
    return "Medium";
  }

  return "Low";
}

export function buildVulnerabilityByEvent(
  events,
  reliabilityByEvent = {}
) {
  return events.reduce((accumulator, event) => {
    const reliability =
      reliabilityByEvent[event.event_id];
    const reliabilityPenalty =
      reliability?.grade === "D"
        ? 8
        : reliability?.grade === "C"
          ? 5
          : 0;
    const humanImpact =
      Number(event.victims) > 0 ||
      Number(event.injuries) > 0;

    const breakdown = [
      {
        key: "severity",
        label: "Collapse severity",
        max: 22,
        value:
          event.collapse_severity === "TC"
            ? 22
            : 12,
      },
      {
        key: "trigger",
        label: "Triggered event",
        max: 14,
        value: event.triggered ? 14 : 6,
      },
      {
        key: "cause",
        label: "Failure mechanism",
        max: 16,
        value: causeVulnerabilityScore(
          event.specific_cause
        ),
      },
      {
        key: "structure",
        label: "Structural profile",
        max: 14,
        value:
          structuralVulnerabilityScore(event),
      },
      {
        key: "age",
        label: "Infrastructure age",
        max: 12,
        value: constructionAgeScore(
          event.construction_year
        ),
      },
      {
        key: "impact",
        label: "Human impact",
        max: 12,
        value: humanImpact ? 12 : 4,
      },
      {
        key: "evidence",
        label: "Evidence penalty",
        max: 10,
        value: reliabilityPenalty,
      },
    ];
    const score = Math.min(
      100,
      breakdown.reduce(
        (total, item) => total + item.value,
        0
      )
    );

    accumulator[event.event_id] = {
      breakdown,
      className: vulnerabilityClass(score),
      score,
    };

    return accumulator;
  }, {});
}

export function summarizeVulnerability(
  events,
  vulnerabilityByEvent
) {
  if (!events.length) {
    return {
      average: 0,
      classCounts: {},
      criticalShare: 0,
      dominantClass: "-",
      highOrCritical: 0,
    };
  }

  const profiles = events.map(
    (event) =>
      vulnerabilityByEvent[event.event_id] || {
        className: "Low",
        score: 0,
      }
  );
  const classCounts = profiles.reduce(
    (accumulator, profile) => {
      accumulator[profile.className] =
        (accumulator[profile.className] || 0) + 1;

      return accumulator;
    },
    {}
  );
  const average =
    profiles.reduce(
      (total, profile) => total + profile.score,
      0
    ) / profiles.length;
  const dominantClass =
    Object.entries(classCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "-";

  return {
    average,
    classCounts,
    criticalShare: percentage(
      classCounts.Critical || 0,
      profiles.length
    ),
    dominantClass,
    highOrCritical:
      (classCounts.High || 0) +
      (classCounts.Critical || 0),
  };
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function distanceKm(
  firstLatitude,
  firstLongitude,
  secondLatitude,
  secondLongitude
) {
  const lat1 = Number(String(firstLatitude).replace(",", "."));
  const lon1 = Number(String(firstLongitude).replace(",", "."));
  const lat2 = Number(String(secondLatitude).replace(",", "."));
  const lon2 = Number(String(secondLongitude).replace(",", "."));

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const radius = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return (
    radius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function assetValue(asset, keys) {
  const match = keys.find(
    (key) => asset[key] !== undefined && asset[key] !== ""
  );

  return match ? asset[match] : "";
}

function normalizeAssetText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function assetAgeScore(year) {
  const value = Number(year);

  if (!value) {
    return 4;
  }

  const age = new Date().getFullYear() - value;

  if (age >= 80) {
    return 14;
  }

  if (age >= 60) {
    return 11;
  }

  if (age >= 40) {
    return 8;
  }

  return 4;
}

function assetTypologyScore(asset) {
  const structure = normalizeAssetText(
    assetValue(asset, [
      "structural_type",
      "structure",
      "typology",
      "tipologia",
    ])
  );
  const material = normalizeAssetText(
    assetValue(asset, [
      "material_type",
      "material",
      "materiale",
    ])
  );
  let score = 5;

  if (
    structure.includes("beam") ||
    structure.includes("truss") ||
    structure.includes("arch") ||
    structure.includes("girder")
  ) {
    score += 5;
  }

  if (
    material.includes("masonry") ||
    material.includes("steel") ||
    material.includes("mixed")
  ) {
    score += 5;
  }

  if (
    material.includes("calcestruzzo") ||
    material.includes("concrete")
  ) {
    score += 3;
  }

  return Math.min(score, 16);
}

function proximityScore(distance, hasLocalContext = false) {
  if (distance === null || distance === undefined) {
    return hasLocalContext ? 18 : 0;
  }

  if (distance <= 0.5) {
    return 100;
  }

  if (distance <= 2) {
    return 82;
  }

  if (distance <= 10) {
    return 58;
  }

  return hasLocalContext ? 34 : 18;
}

function attentionLevel(score, proximity) {
  if (score > 75 || proximity >= 82) {
    return "Immediate attention";
  }

  if (score >= 50) {
    return "Programmed attention";
  }

  return "Ordinary monitoring";
}

function classifyHazardProfile(hazardProfile, asset, profile) {
  const hazards = [...(hazardProfile?.hazards || [])].sort(
    (a, b) => Number(b.score || 0) - Number(a.score || 0)
  );
  const top = hazards[0];
  const second = hazards[1];

  if (
    top &&
    second &&
    Number(top.score || 0) >= 65 &&
    Number(second.score || 0) >= 60 &&
    Number(top.score || 0) - Number(second.score || 0) <= 16
  ) {
    return "Multi-hazard";
  }

  const rawHazard = normalizeAssetText(
    top?.key || top?.label || profile?.topCause || ""
  );
  const structure = normalizeAssetText(
    assetValue(asset, [
      "structural_type",
      "structure",
      "typology",
      "tipologia",
    ])
  );

  if (
    rawHazard.includes("hydraulic") ||
    rawHazard.includes("flood") ||
    rawHazard.includes("scour") ||
    rawHazard.includes("idraul")
  ) {
    const context = normalizeAssetText(
      `${assetValue(asset, [
        "watercourse_type",
        "geomorphology",
        "morfologia",
      ])} ${profile?.topCause || ""} ${structure}`
    );

    if (
      context.includes("alpine") ||
      context.includes("torrent") ||
      context.includes("confined") ||
      context.includes("mont")
    ) {
      return "Hydraulic - torrential/confined";
    }

    if (
      context.includes("plain") ||
      context.includes("lowland") ||
      context.includes("pian")
    ) {
      return "Hydraulic - lowland/plain";
    }

    return "Hydraulic";
  }

  if (
    rawHazard.includes("landslide") ||
    rawHazard.includes("frana") ||
    rawHazard.includes("slope")
  ) {
    return "Landslide";
  }

  if (
    rawHazard.includes("seismic") ||
    rawHazard.includes("sism")
  ) {
    return "Seismic";
  }

  return top?.label || top?.key || "Contextual";
}

function monitoringRecommendation(hazardProfile, asset, proximity) {
  const profile = normalizeAssetText(hazardProfile);
  const underwater = normalizeAssetText(
    assetValue(asset, [
      "underwater_inspection",
      "ispezione_subacquea",
    ])
  );

  if (profile.includes("multi")) {
    return "Coordinated hydraulic/structural inspection with one integrated report.";
  }

  if (profile.includes("hydraulic") && profile.includes("torrential")) {
    return underwater === "no"
      ? "Prioritize scour and underwater/foundation inspection before the next flood season."
      : "Post-event visual checks, scour susceptibility review and debris transport verification.";
  }

  if (profile.includes("hydraulic")) {
    return "Verify TR100/TR200 flood levels, residual freeboard, abutments and access embankments.";
  }

  if (profile.includes("landslide")) {
    return "Check slope stability, abutment movement indicators and surface drainage upstream.";
  }

  if (profile.includes("seismic")) {
    return "Inspect bearings, deck-substructure connections and pre-1980 seismic vulnerability.";
  }

  if (proximity >= 82) {
    return "Review the nearest ARCUS precedent and verify whether the same local mechanism can affect the asset.";
  }

  return "Maintain ordinary inspection cycle and enrich technical asset data.";
}

export function buildAssetScreening(
  assets,
  events,
  provinceProfiles,
  vulnerabilityByEvent,
  hazardExposurePreview = null
) {
  const profilesByProvince = Object.fromEntries(
    provinceProfiles.map((profile) => [
      normalizeAssetText(profile.territory),
      profile,
    ])
  );
  const hazardByProvince = Object.fromEntries(
    (hazardExposurePreview?.provinces || []).map(
      (profile) => [
        normalizeAssetText(profile.province),
        profile,
      ]
    )
  );

  return assets
    .map((asset, index) => {
      const id =
        assetValue(asset, [
          "bridge_id",
          "asset_id",
          "id",
          "code",
          "codice",
        ]) || `ASSET-${index + 1}`;
      const name =
        assetValue(asset, [
          "name",
          "asset_name",
          "bridge_name",
          "nome",
        ]) || id;
      const province = assetValue(asset, [
        "province_declared",
        "province",
        "provincia",
      ]);
      const municipality = assetValue(asset, [
        "municipality_declared",
        "municipality",
        "comune",
      ]);
      const region = assetValue(asset, [
        "region",
        "regione",
      ]);
      const latitude = assetValue(asset, [
        "latitude",
        "lat",
      ]);
      const longitude = assetValue(asset, [
        "longitude",
        "lon",
        "lng",
      ]);
      const profile =
        profilesByProvince[
          normalizeAssetText(province)
        ];
      const hazardProfile =
        hazardByProvince[
          normalizeAssetText(province)
        ];
      const localEvents = events.filter((event) => {
        if (
          province &&
          normalizeAssetText(event.province) ===
            normalizeAssetText(province)
        ) {
          return true;
        }

        return (
          region &&
          normalizeAssetText(event.region) ===
            normalizeAssetText(region)
        );
      });
      const nearbyEvents = events
        .map((event) => ({
          ...event,
          distance: distanceKm(
            latitude,
            longitude,
            event.latitude,
            event.longitude
          ),
        }))
        .filter(
          (event) =>
            event.distance !== null &&
            event.distance <= 35
        )
        .sort((a, b) => a.distance - b.distance);
      const nearestEvent = nearbyEvents[0] || null;
      const comparableEvents =
        nearbyEvents.length > 0
          ? nearbyEvents
          : localEvents;
      const highVulnerabilityMatches =
        comparableEvents.filter((event) =>
          ["High", "Critical"].includes(
            vulnerabilityByEvent[event.event_id]
              ?.className
          )
        ).length;
      const profileScore =
        profile?.scenarioScore || profile?.riskScore || 0;
      const dominantHazard =
        hazardProfile?.hazards?.find(
          (hazard) =>
            hazard.key ===
            hazardProfile.dominant_hazard
        );
      const hazardScore =
        dominantHazard?.score || 0;
      const proximity = proximityScore(
        nearestEvent?.distance,
        localEvents.length > 0
      );
      const localityScore = Math.min(
        24,
        comparableEvents.length * 4
      );
      const vulnerabilityScore = Math.min(
        22,
        highVulnerabilityMatches * 6
      );
      const ageScore = assetAgeScore(
        assetValue(asset, [
          "construction_year",
          "year",
          "anno",
        ])
      );
      const typologyScore =
        assetTypologyScore(asset);
      const score = Math.min(
        100,
        Math.round(
          profileScore * 0.22 +
            hazardScore * 0.16 +
            proximity * 0.22 +
            localityScore * 0.35 +
            vulnerabilityScore +
            ageScore +
            typologyScore
        )
      );
      const topCause =
        countBy(
          comparableEvents,
          "specific_cause"
        )[0]?.[0] ||
        profile?.topCause ||
        "-";
      const assetHazardProfile = classifyHazardProfile(
        hazardProfile,
        asset,
        profile
      );
      const level = attentionLevel(score, proximity);

      return {
        asset,
        attentionLevel: level,
        comparableEvents,
        dominantHazard:
          hazardProfile?.dominant_hazard || null,
        hazardProfile,
        hazardProfileLabel: assetHazardProfile,
        hazardScore,
        highVulnerabilityMatches,
        id,
        latitude,
        longitude,
        monitoringRecommendation: monitoringRecommendation(
          assetHazardProfile,
          asset,
          proximity
        ),
        municipality,
        name,
        nearestEvent,
        nearbyEvents,
        priority: level,
        profile,
        proximityScore: proximity,
        region,
        score,
        topCause,
        territory:
          province || region || "Unspecified",
      };
    })
    .sort((a, b) => b.score - a.score);
}

function similarityMatchScore(first, second) {
  let score = 0;
  const reasons = [];

  if (
    first.event_id !== second.event_id &&
    first.specific_cause &&
    first.specific_cause === second.specific_cause
  ) {
    score += 26;
    reasons.push("same failure mechanism");
  }

  if (
    first.cause_category &&
    first.cause_category === second.cause_category
  ) {
    score += 12;
    reasons.push("same cause family");
  }

  if (
    first.collapse_severity &&
    first.collapse_severity ===
      second.collapse_severity
  ) {
    score += 15;
    reasons.push("same collapse severity");
  }

  if (
    first.structural_type &&
    first.structural_type === second.structural_type
  ) {
    score += 16;
    reasons.push("same structural type");
  }

  if (
    first.material_type &&
    first.material_type === second.material_type
  ) {
    score += 12;
    reasons.push("same material");
  }

  if (first.triggered === second.triggered) {
    score += 9;
    reasons.push(
      first.triggered
        ? "both triggered"
        : "both non-triggered"
    );
  }

  if (first.region && first.region === second.region) {
    score += 10;
    reasons.push("same region");
  } else if (
    first.province &&
    first.province === second.province
  ) {
    score += 8;
    reasons.push("same province");
  }

  return {
    reasons,
    score: Math.min(100, score),
  };
}

export function findSimilarEvents(
  targetEvent,
  events,
  limit = 5
) {
  if (!targetEvent) {
    return [];
  }

  return events
    .filter(
      (event) =>
        event.event_id !== targetEvent.event_id
    )
    .map((event) => {
      const similarity = similarityMatchScore(
        targetEvent,
        event
      );

      return {
        ...event,
        similarityReasons: similarity.reasons,
        similarityScore: similarity.score,
      };
    })
    .filter((event) => event.similarityScore > 0)
    .sort(
      (a, b) =>
        b.similarityScore - a.similarityScore
    )
    .slice(0, limit);
}

export function findAssetSimilarEvents(
  assetScreeningItem,
  events,
  vulnerabilityByEvent,
  limit = 5
) {
  if (!assetScreeningItem) {
    return [];
  }

  const asset = assetScreeningItem.asset || {};
  const structure = normalizeAssetText(
    assetValue(asset, [
      "structural_type",
      "structure",
      "typology",
      "tipologia",
    ])
  );
  const material = normalizeAssetText(
    assetValue(asset, [
      "material_type",
      "material",
      "materiale",
    ])
  );
  const territory = normalizeAssetText(
    assetScreeningItem.territory
  );

  return events
    .map((event) => {
      let score = 0;
      const reasons = [];
      const distance =
        assetScreeningItem.nearbyEvents.find(
          (nearby) =>
            nearby.event_id === event.event_id
        )?.distance;

      if (
        territory &&
        (normalizeAssetText(event.province) ===
          territory ||
          normalizeAssetText(event.region) ===
            territory)
      ) {
        score += 18;
        reasons.push("same territory");
      }

      if (distance !== undefined) {
        score += distance <= 10 ? 22 : 14;
        reasons.push(
          `${Math.round(distance)} km distance`
        );
      }

      if (
        structure &&
        normalizeAssetText(event.structural_type) ===
          structure
      ) {
        score += 20;
        reasons.push("same structural type");
      }

      if (
        material &&
        normalizeAssetText(event.material_type) ===
          material
      ) {
        score += 16;
        reasons.push("same material");
      }

      if (
        event.specific_cause ===
        assetScreeningItem.topCause
      ) {
        score += 14;
        reasons.push("dominant local mechanism");
      }

      if (
        ["High", "Critical"].includes(
          vulnerabilityByEvent[event.event_id]
            ?.className
        )
      ) {
        score += 10;
        reasons.push("high vulnerability precedent");
      }

      return {
        ...event,
        similarityReasons: reasons,
        similarityScore: Math.min(100, score),
      };
    })
    .filter((event) => event.similarityScore > 0)
    .sort(
      (a, b) =>
        b.similarityScore - a.similarityScore
    )
    .slice(0, limit);
}

export function buildTerritoryProfiles(
  events,
  sources,
  key = "region"
) {
  const sourceCountByEvent =
    buildSourceCountByEvent(sources);

  const grouped = events.reduce(
    (accumulator, event) => {
      const territory = event[key];

      if (!territory) {
        return accumulator;
      }

      if (!accumulator[territory]) {
        accumulator[territory] = [];
      }

      accumulator[territory].push(event);

      return accumulator;
    },
    {}
  );

  return Object.entries(grouped)
    .map(([territory, territoryEvents]) => {
      const total = territoryEvents.length;
      const totalCollapse =
        territoryEvents.filter(
          (event) =>
            event.collapse_severity === "TC"
        ).length;
      const triggered =
        territoryEvents.filter(
          (event) => event.triggered
        ).length;
      const exactLocations =
        territoryEvents.filter(
          (event) => event.exact_location
        ).length;
      const sourceTotal =
        territoryEvents.reduce(
          (totalSources, event) =>
            totalSources +
            (sourceCountByEvent[event.event_id] ||
              0),
          0
        );
      const victims = sumBy(
        territoryEvents,
        (event) => event.victims
      );
      const injuries = sumBy(
        territoryEvents,
        (event) => event.injuries
      );
      const years = territoryEvents
        .map((event) => extractYear(event.date))
        .filter(Boolean);

      const recurrenceScore = Math.min(
        35,
        total * 3
      );
      const severityScore = Math.round(
        percentage(totalCollapse, total) * 0.28
      );
      const triggerScore = Math.round(
        percentage(triggered, total) * 0.18
      );
      const impactScore = Math.min(
        12,
        victims * 2 + injuries * 0.35
      );
      const evidenceScore =
        sourceTotal / Math.max(total, 1) >= 3
          ? 10
          : 6;
      const riskScore = Math.min(
        100,
        Math.round(
          recurrenceScore +
            severityScore +
            triggerScore +
            impactScore +
            evidenceScore
        )
      );

      return {
        avgSources:
          sourceTotal / Math.max(total, 1),
        causeCounts: Object.fromEntries(
          countBy(
            territoryEvents,
            "specific_cause"
          )
        ),
        exactLocations,
        firstYear:
          years.length > 0
            ? Math.min(...years)
            : null,
        injuries,
        riskScore,
        scoreBreakdown: [
          {
            key: "recurrence",
            label: "Historical recurrence",
            max: 35,
            value: Math.round(recurrenceScore),
          },
          {
            key: "severity",
            label: "Total collapse share",
            max: 28,
            value: Math.round(severityScore),
          },
          {
            key: "trigger",
            label: "Triggered-event share",
            max: 18,
            value: Math.round(triggerScore),
          },
          {
            key: "impact",
            label: "Human impact",
            max: 12,
            value: Math.round(impactScore),
          },
          {
            key: "evidence",
            label: "Evidence strength",
            max: 10,
            value: Math.round(evidenceScore),
          },
        ],
        sourceTotal,
        territory,
        topCause:
          countBy(
            territoryEvents,
            "specific_cause"
          )[0]?.[0] || "-",
        total,
        totalCollapse,
        triggered,
        victims,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}
