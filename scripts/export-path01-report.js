import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const contextLabels = {
  bridge: "Bridge",
  road: "Road crossing",
  "road-crossing": "Road crossing",
  railway: "Railway crossing",
  urban: "Urban infrastructure",
};

function parseArgs(argv) {
  return argv.reduce(
    (args, item) => {
      if (!item.startsWith("--")) {
        return args;
      }

      const [key, ...valueParts] = item.slice(2).split("=");
      args[key] = valueParts.join("=") || true;
      return args;
    },
    {
      baseUrl: "http://127.0.0.1:5173",
      context: "bridge",
      province: "Torino",
    }
  );
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value).replaceAll(" ", "-") || "territory";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function countBy(rows, field) {
  const counts = new Map();

  rows.forEach((row) => {
    const value = row[field] || "Unclassified";
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function scorePriorityEvent(event, dominantCause) {
  return (
    (event.collapse_severity === "TC" ? 40 : 0) +
    (event.triggered ? 24 : 0) +
    (event.specific_cause === dominantCause ? 18 : 0) +
    (Number(event.victims) > 0 || Number(event.injuries) > 0 ? 14 : 0) +
    (event.source_confidence === "High" ? 8 : 0)
  );
}

function loadLogoDataUri() {
  const logoPath = path.join(
    root,
    "src",
    "assets",
    "logo",
    "logo-full-light.svg"
  );

  if (!fs.existsSync(logoPath)) {
    return "";
  }

  const logo = fs.readFileSync(logoPath);
  return `data:image/svg+xml;base64,${logo.toString("base64")}`;
}

function loadHazardExposurePreview() {
  const filePath = [
    path.join(root, "public", "data", "professional", "hazard-exposure-preview.json"),
    path.join(root, "private-data", "professional", "hazard-exposure-preview.json"),
  ].find((candidate) => fs.existsSync(candidate));

  if (!filePath) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  );
}

function loadAinopBridgeIndex() {
  const filePath = [
    path.join(root, "public", "data", "professional", "ainop-bridge-index.json"),
    path.join(root, "private-data", "professional", "ainop-bridge-index.json"),
  ].find((candidate) => fs.existsSync(candidate));

  if (!filePath) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  );
}

function makePriorityEvents(events, dominantCause) {
  return events
    .slice()
    .sort(
      (a, b) =>
        scorePriorityEvent(b, dominantCause) -
        scorePriorityEvent(a, dominantCause)
    )
    .slice(0, 8)
    .map((event, index) => ({
      ...event,
      map_ref: index < 3 ? `P${index + 1}` : "",
      priority_score: scorePriorityEvent(event, dominantCause),
    }));
}

function canonicalProjectContext(projectContext) {
  const normalized = normalizeText(projectContext);

  if (normalized.includes("road")) {
    return "road";
  }

  if (normalized.includes("rail")) {
    return "railway";
  }

  if (normalized.includes("urban")) {
    return "urban";
  }

  return "bridge";
}

function normalizeExposureKey(value) {
  const normalized = normalizeText(value);

  if (normalized.includes("landslide") || normalized.includes("slope")) {
    return "landslide";
  }

  if (normalized.includes("seismic") || normalized.includes("earthquake")) {
    return "seismic";
  }

  if (
    normalized.includes("structural") ||
    normalized.includes("material") ||
    normalized.includes("design") ||
    normalized.includes("construction") ||
    normalized.includes("overload")
  ) {
    return "structural";
  }

  if (normalized.includes("hydraulic") || normalized.includes("flood")) {
    return "hydraulic";
  }

  return "structural";
}

const exposureLabels = {
  hydraulic: "Hydraulic exposure",
  landslide: "Landslide exposure",
  seismic: "Seismic exposure",
  structural: "Historical Failure Context",
};

function titleCaseLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function driverLabel(value) {
  return titleCaseLabel(String(value || "").replace(/\s*exposure\s*$/i, ""));
}

const contextScope = {
  bridge:
    "Major bridge or bridge intervention: river crossing behaviour, hydraulic compatibility, scour, foundations, piers, abutments, structural concept and inspections.",
  road:
    "Road corridor, culvert, minor bridge, embankment, drainage crossing or road-continuity problem: network interruption, drainage bottlenecks, embankments and access continuity.",
  railway:
    "Railway bridge, culvert, embankment or track crossing: service continuity, embankment stability, hydraulic openings, inspections and operational consequences.",
  urban:
    "Urban underpasses, local crossings, drainage corridors, dense built-up areas and local civil-protection or maintenance planning.",
};

const recommendationMatrix = {
  bridge: {
    hydraulic: {
      primaryFocus: "Hydraulic compatibility; scour susceptibility; foundation, pier and abutment exposure.",
      immediateScreening: "Verify whether the planned crossing interacts with active riverbeds or flood-prone corridors.",
      attentionPoints: [
        "Hydraulic compatibility",
        "Scour susceptibility",
        "Foundation, pier and abutment exposure",
        "Riverbed dynamics and sediment/debris transport",
        "Flood/debris scenarios",
        "Inspection and monitoring accessibility",
      ],
      actions: [
        "Verify whether the planned crossing interacts with active riverbeds or flood-prone corridors.",
        "Review hydraulic-triggered total-collapse precedents in the selected province.",
        "Prioritise hydraulic modelling and scour screening before preliminary design consolidation.",
        "Check foundation, pier and abutment exposure to riverbed evolution and debris accumulation.",
      ],
      dataToRequest: [
        "Hydraulic model or preliminary hydraulic study",
        "Riverbed survey / bathymetry where relevant",
        "Historical flood levels",
        "Geotechnical investigation",
        "Foundation concept or available foundation records",
        "Inspection accessibility constraints",
      ],
      wording:
        "For bridge interventions in the selected province, ARCUS indicates that preliminary attention should focus on hydraulic compatibility and related checks because the dominant indicator is hydraulic exposure.",
    },
    landslide: {
      primaryFocus: "Slope stability near abutments and approach roads; debris-flow or landslide interaction with bridge approaches; retaining structures and drainage.",
      immediateScreening: "Screen bridge approaches, abutments and access roads for landslide-prone slopes.",
      attentionPoints: [
        "Slope stability near abutments and approach roads",
        "Debris-flow or landslide interaction with bridge approaches",
        "Retaining structures and drainage",
        "Foundation interaction with unstable slopes",
        "Access and inspection continuity",
      ],
      actions: [
        "Screen bridge approaches, abutments and access roads for landslide-prone slopes.",
        "Compare planned bridge location with landslide-related precedents and public landslide layers.",
        "Request geomorphological and geotechnical checks before fixing alignment or foundation strategy.",
      ],
      dataToRequest: [
        "Landslide inventory and susceptibility map",
        "Slope stability assessment",
        "Geotechnical boreholes",
        "Drainage layout",
        "Retaining structure information",
        "Historical slope movement records",
      ],
      wording:
        "For bridge interventions in the selected province, ARCUS indicates that preliminary attention should focus on slope stability near abutments and approach roads and related checks because the dominant indicator is landslide exposure.",
    },
    seismic: {
      primaryFocus: "Seismic classification; ductility and detailing requirements; foundation-soil interaction.",
      immediateScreening: "Use seismic context to frame early structural and geotechnical design requests.",
      attentionPoints: [
        "Seismic classification",
        "Ductility and detailing requirements",
        "Foundation-soil interaction",
        "Expansion joints and bearings",
        "Post-event inspectability and service restoration",
      ],
      actions: [
        "Use seismic context to frame early structural and geotechnical design requests.",
        "Check whether comparable earthquake-related precedents exist in ARCUS.",
        "Ensure seismic design category and site response are treated as design inputs, not inferred from ARCUS alone.",
      ],
      dataToRequest: [
        "Seismic classification / MPS04 context",
        "Site response or microzonation where available",
        "Geotechnical investigation",
        "Preliminary structural scheme",
        "Bearing/joint concept",
        "Emergency accessibility requirements",
      ],
      wording:
        "For bridge interventions in the selected province, ARCUS indicates that preliminary attention should focus on seismic classification and related checks because the dominant indicator is seismic exposure.",
    },
    structural: {
      primaryFocus: "Documented structural/design-construction precedents; material and age data gaps; inspection and maintenance history.",
      immediateScreening: "Review historical structural or design/construction precedents before selecting bridge concept.",
      attentionPoints: [
        "Documented structural/design-construction precedents",
        "Material and age data gaps",
        "Inspection and maintenance history",
        "Structural concept review",
        "Evidence reliability",
      ],
      actions: [
        "Review historical structural or design/construction precedents before selecting bridge concept.",
        "Request asset/documentation data where structural information is missing.",
        "Use ARCUS to frame follow-up checks, not to certify structural safety.",
      ],
      dataToRequest: [
        "Bridge type and material",
        "Construction year",
        "Inspection reports",
        "Maintenance history",
        "Load restrictions",
        "As-built drawings or design documentation",
      ],
      wording:
        "For bridge interventions in the selected province, ARCUS indicates that preliminary attention should focus on documented structural/design-construction precedents and related checks because the dominant indicator is historical failure context.",
    },
  },
  road: {
    hydraulic: {
      primaryFocus: "Road continuity under flood scenarios; culvert and minor crossing capacity; drainage bottlenecks.",
      immediateScreening: "Identify road segments intersecting flood-prone corridors or hydraulic concentration areas.",
      attentionPoints: [
        "Road continuity under flood scenarios",
        "Culvert and minor crossing capacity",
        "Drainage bottlenecks",
        "Embankment erosion and local washout",
        "Debris blockage",
        "Alternative access routes",
      ],
      actions: [
        "Identify road segments intersecting flood-prone corridors or hydraulic concentration areas.",
        "Review culverts, minor bridges and drainage bottlenecks that may concentrate flow or debris.",
        "Assess potential network interruption and alternative access during extreme rainfall or flood events.",
      ],
      dataToRequest: [
        "Road drainage layout",
        "Culvert inventory",
        "Road embankment geometry",
        "Flood-prone area mapping",
        "Historical interruption records",
        "Local maintenance records",
      ],
      wording:
        "For road crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on road continuity under flood scenarios and related checks because the dominant indicator is hydraulic exposure.",
    },
    landslide: {
      primaryFocus: "Slope instability along road corridors; cut/fill slope exposure; retaining wall and drainage performance.",
      immediateScreening: "Screen road segments crossing landslide-prone slopes or valley-side alignments.",
      attentionPoints: [
        "Slope instability along road corridors",
        "Cut/fill slope exposure",
        "Retaining wall and drainage performance",
        "Road blockage and emergency access",
        "Maintenance prioritisation",
      ],
      actions: [
        "Screen road segments crossing landslide-prone slopes or valley-side alignments.",
        "Identify locations where slope instability could interrupt road continuity.",
        "Request geotechnical and drainage review for exposed cut/fill sections.",
      ],
      dataToRequest: [
        "Landslide susceptibility map",
        "Road alignment and cut/fill sections",
        "Retaining wall inventory",
        "Drainage works",
        "Maintenance/interruption history",
        "Geotechnical surveys",
      ],
      wording:
        "For road crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on slope instability along road corridors and related checks because the dominant indicator is landslide exposure.",
    },
    seismic: {
      primaryFocus: "Road network redundancy; embankment and retaining structure performance; culvert/overpass seismic vulnerability.",
      immediateScreening: "Use seismic context to identify critical road crossings or access routes requiring follow-up review.",
      attentionPoints: [
        "Road network redundancy",
        "Embankment and retaining structure performance",
        "Culvert/overpass seismic vulnerability",
        "Emergency access after earthquake",
        "Critical route continuity",
      ],
      actions: [
        "Use seismic context to identify critical road crossings or access routes requiring follow-up review.",
        "Check whether critical corridors have redundancy or alternative routes.",
        "Request structure-specific seismic checks for overpasses, retaining walls and culverts where relevant.",
      ],
      dataToRequest: [
        "Road network hierarchy",
        "Critical route map",
        "Bridge/culvert/retaining wall inventory",
        "Seismic classification",
        "Inspection records",
        "Emergency access plans",
      ],
      wording:
        "For road crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on road network redundancy and related checks because the dominant indicator is seismic exposure.",
    },
    structural: {
      primaryFocus: "Minor bridge/culvert condition data; design-construction precedents; age/material data gaps.",
      immediateScreening: "Review structural/failure precedents for minor crossings and culverts.",
      attentionPoints: [
        "Minor bridge/culvert condition data",
        "Design-construction precedents",
        "Age/material data gaps",
        "Maintenance records",
        "Load restrictions",
      ],
      actions: [
        "Review structural/failure precedents for minor crossings and culverts.",
        "Identify assets with insufficient technical fields before defining priorities.",
        "Use ARCUS outputs to request targeted inspections, not to certify safety.",
      ],
      dataToRequest: [
        "Culvert/minor bridge inventory",
        "Materials and construction year",
        "Inspection reports",
        "Maintenance records",
        "Load or traffic restrictions",
        "Photos or condition notes",
      ],
      wording:
        "For road crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on minor bridge/culvert condition data and related checks because the dominant indicator is historical failure context.",
    },
  },
  railway: {
    hydraulic: {
      primaryFocus: "Track continuity; railway embankment stability; hydraulic openings.",
      immediateScreening: "Identify railway sections intersecting flood-prone or hydraulic-sensitive corridors.",
      attentionPoints: [
        "Track continuity",
        "Railway embankment stability",
        "Hydraulic openings",
        "Scour near supports",
        "Service interruption consequences",
        "Access for inspection and emergency response",
      ],
      actions: [
        "Identify railway sections intersecting flood-prone or hydraulic-sensitive corridors.",
        "Review hydraulic openings, culverts and bridge supports for preliminary exposure.",
        "Consider operational continuity and inspection access during hydraulic events.",
      ],
      dataToRequest: [
        "Railway alignment",
        "Embankment geometry",
        "Hydraulic opening data",
        "Bridge/culvert inventory",
        "Historical service interruption records",
        "Inspection records",
      ],
      wording:
        "For railway crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on track continuity and related checks because the dominant indicator is hydraulic exposure.",
    },
    landslide: {
      primaryFocus: "Slope instability near track alignments; embankment/cut stability; rockfall or debris-flow exposure.",
      immediateScreening: "Screen railway segments on landslide-prone or mountainous alignments.",
      attentionPoints: [
        "Slope instability near track alignments",
        "Embankment/cut stability",
        "Rockfall or debris-flow exposure",
        "Service interruption and safety management",
        "Monitoring feasibility",
      ],
      actions: [
        "Screen railway segments on landslide-prone or mountainous alignments.",
        "Identify potential slope-driven service interruption points.",
        "Request geotechnical and monitoring review where exposure and historical precedents overlap.",
      ],
      dataToRequest: [
        "Railway alignment",
        "Slope/landslide inventory",
        "Cut/fill/embankment data",
        "Monitoring records",
        "Geotechnical investigations",
        "Service interruption history",
      ],
      wording:
        "For railway crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on slope instability near track alignments and related checks because the dominant indicator is landslide exposure.",
    },
    seismic: {
      primaryFocus: "Track and bridge seismic performance; embankment and retaining structures; operational continuity after earthquake.",
      immediateScreening: "Frame seismic follow-up checks for railway bridges, embankments and retaining structures.",
      attentionPoints: [
        "Track and bridge seismic performance",
        "Embankment and retaining structures",
        "Operational continuity after earthquake",
        "Inspection priorities after seismic events",
        "Critical corridor redundancy",
      ],
      actions: [
        "Frame seismic follow-up checks for railway bridges, embankments and retaining structures.",
        "Review criticality of service interruption and emergency restoration.",
        "Use seismic layers as context, not a railway safety verdict.",
      ],
      dataToRequest: [
        "Seismic classification",
        "Railway asset inventory",
        "Bridge/culvert/retaining wall data",
        "Geotechnical information",
        "Emergency response plans",
        "Inspection protocols",
      ],
      wording:
        "For railway crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on track and bridge seismic performance and related checks because the dominant indicator is seismic exposure.",
    },
    structural: {
      primaryFocus: "Structural records of rail crossings; bridge/culvert age and material; inspection and maintenance evidence.",
      immediateScreening: "Identify rail assets requiring documentation or inspection due to structural/failure precedent context.",
      attentionPoints: [
        "Structural records of rail crossings",
        "Bridge/culvert age and material",
        "Inspection and maintenance evidence",
        "Design-construction precedents",
        "Data gaps",
      ],
      actions: [
        "Identify rail assets requiring documentation or inspection due to structural/failure precedent context.",
        "Check whether similar failure mechanisms appear in ARCUS precedents.",
        "Escalate to asset-level review where technical data are incomplete.",
      ],
      dataToRequest: [
        "Railway bridge/culvert inventory",
        "As-built drawings",
        "Material and age data",
        "Inspection reports",
        "Maintenance history",
        "Operational restrictions",
      ],
      wording:
        "For railway crossing interventions in the selected province, ARCUS indicates that preliminary attention should focus on structural records of rail crossings and related checks because the dominant indicator is historical failure context.",
    },
  },
  urban: {
    hydraulic: {
      primaryFocus: "Urban drainage capacity; underpasses and low points; minor bridges and culverts.",
      immediateScreening: "Identify urban low points, underpasses and drainage bottlenecks.",
      attentionPoints: [
        "Urban drainage capacity",
        "Underpasses and low points",
        "Minor bridges and culverts",
        "Flood-routing corridors",
        "Interaction with dense built-up areas",
        "Civil protection and maintenance coordination",
      ],
      actions: [
        "Identify urban low points, underpasses and drainage bottlenecks.",
        "Review historical hydraulic precedents near dense built-up contexts.",
        "Check minor crossings and culverts that may concentrate flow during extreme rainfall.",
      ],
      dataToRequest: [
        "Urban drainage network",
        "Underpass inventory",
        "Minor crossing inventory",
        "Local flood records",
        "Civil protection plans",
        "Maintenance records",
      ],
      wording:
        "For urban infrastructure interventions in the selected province, ARCUS indicates that preliminary attention should focus on urban drainage capacity and related checks because the dominant indicator is hydraulic exposure.",
    },
    landslide: {
      primaryFocus: "Urban slope instability; retaining walls and hillside roads; drainage-induced instability.",
      immediateScreening: "Screen urban infrastructure near slopes, retaining structures or landslide-prone areas.",
      attentionPoints: [
        "Urban slope instability",
        "Retaining walls and hillside roads",
        "Drainage-induced instability",
        "Buildings/infrastructure interaction",
        "Emergency access continuity",
      ],
      actions: [
        "Screen urban infrastructure near slopes, retaining structures or landslide-prone areas.",
        "Identify potential blockage points affecting access to dense urban areas.",
        "Request geotechnical and drainage checks for exposed locations.",
      ],
      dataToRequest: [
        "Urban landslide/slope maps",
        "Retaining wall inventory",
        "Drainage network",
        "Road access hierarchy",
        "Maintenance records",
        "Geotechnical reports",
      ],
      wording:
        "For urban infrastructure interventions in the selected province, ARCUS indicates that preliminary attention should focus on urban slope instability and related checks because the dominant indicator is landslide exposure.",
    },
    seismic: {
      primaryFocus: "Critical urban routes; underpasses/overpasses and retaining walls; emergency access after earthquake.",
      immediateScreening: "Use seismic context to identify urban infrastructure that may affect emergency access.",
      attentionPoints: [
        "Critical urban routes",
        "Underpasses/overpasses and retaining walls",
        "Emergency access after earthquake",
        "Lifeline interaction",
        "Post-event inspection priorities",
      ],
      actions: [
        "Use seismic context to identify urban infrastructure that may affect emergency access.",
        "Prioritise overpasses, underpasses and critical local routes for further assessment.",
        "Coordinate preliminary screening with local emergency planning.",
      ],
      dataToRequest: [
        "Urban critical route map",
        "Bridge/underpass/overpass inventory",
        "Seismic classification or microzonation",
        "Emergency plan",
        "Inspection records",
        "Lifeline maps",
      ],
      wording:
        "For urban infrastructure interventions in the selected province, ARCUS indicates that preliminary attention should focus on critical urban routes and related checks because the dominant indicator is seismic exposure.",
    },
    structural: {
      primaryFocus: "Urban minor structures and underpasses; age/material data gaps; inspection and maintenance history.",
      immediateScreening: "Identify minor urban structures with missing age/material/condition data.",
      attentionPoints: [
        "Urban minor structures and underpasses",
        "Age/material data gaps",
        "Inspection and maintenance history",
        "Local service disruption",
        "Precedent comparison",
      ],
      actions: [
        "Identify minor urban structures with missing age/material/condition data.",
        "Review design/construction precedents in similar urban contexts.",
        "Use ARCUS to frame targeted inspections and data collection, not to certify condition.",
      ],
      dataToRequest: [
        "Minor structure inventory",
        "Material/age information",
        "Inspection reports",
        "Maintenance history",
        "Traffic or service restrictions",
        "Local incident records",
      ],
      wording:
        "For urban infrastructure interventions in the selected province, ARCUS indicates that preliminary attention should focus on urban minor structures and underpasses and related checks because the dominant indicator is historical failure context.",
    },
  },
};

function resolveDominantExposure({
  dominantCause,
  exposureProfile,
}) {
  const fromProfile = normalizeExposureKey(
    exposureProfile?.dominant_hazard
  );

  if (fromProfile) {
    return fromProfile;
  }

  return normalizeExposureKey(dominantCause);
}

function getProjectContextRecommendations({
  dominantCause,
  exposureProfile,
  priorityMunicipalities,
  projectContext,
  provinceName,
}) {
  const contextKey = canonicalProjectContext(projectContext);
  const exposureKey = resolveDominantExposure({
    dominantCause,
    exposureProfile,
  });
  const template =
    recommendationMatrix[contextKey]?.[exposureKey] ||
    recommendationMatrix.bridge.structural;
  const places =
    priorityMunicipalities.slice(0, 5).join(", ") || provinceName;
  const contextLabel = contextLabels[contextKey] || contextLabels.bridge;
  const exposureLabel = exposureLabels[exposureKey];
  const driver = driverLabel(exposureLabel);
  const exposureStats = exposureProfile?.hazards?.find(
    (hazard) => normalizeExposureKey(hazard.key) === exposureKey
  );

  return {
    contextKey,
    contextLabel,
    contextScope: contextScope[contextKey],
    designFocusTitle: `${contextLabel} / ${exposureLabel}`,
    dominantExposure: exposureKey,
    dominantExposureLabel: exposureLabel,
    exposureScore: Number(exposureStats?.score || 0),
    matchedEvents: Number(exposureStats?.matched_events || 0),
    share: Number(exposureStats?.share || 0),
    primaryFocus: template.primaryFocus,
    immediateScreening: template.immediateScreening,
    attentionPoints: template.attentionPoints,
    immediateScreeningActions: template.actions,
    designPhaseChecks: [
      "Translate province-level screening into site-specific checks by qualified professionals.",
      "Review the documented historical pattern and use map/appendix cases only as evidence references.",
      "Use exposure indicators as a synthesis of public Hydraulic, Landslide and Seismic layers, not as detailed hydraulic, geotechnical or seismic modelling.",
    ],
    dataToRequest: template.dataToRequest,
    limitations: [
      "Province-level screening only; not design scale.",
      "ARCUS does not certify structural safety or asset condition.",
      "Public overlays support prioritisation and must be followed by site-specific investigations.",
    ],
    operationalMeaning:
      `ARCUS reading: ${template.wording} This signal does not define a design solution. It identifies the technical attention fields that should be checked before design, due diligence or site-specific investigation decisions.`,
    priorityPlaces: places,
    recommendations: [
      `Use the Step 3 exposure indicators to identify the dominant ${driver} signal.`,
      "Read the documented historical pattern and use individual cases as map/appendix references.",
      "Request the minimum technical data package.",
      exposureKey === "hydraulic"
        ? "Commission site-specific hydraulic and geotechnical checks."
        : `Commission site-specific checks for the ${driver.toLowerCase()} signal.`,
      "Use CSV and GeoJSON exports for technical coordination.",
    ],
  };
}

function getEvidenceYearRange(events) {
  const years = events
    .map((event) => Number(String(event.date || "").slice(0, 4)))
    .filter(Number.isFinite);

  if (!years.length) {
    return "Not available";
  }

  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);

  return firstYear === lastYear
    ? String(firstYear)
    : `${firstYear}-${lastYear}`;
}

function getEvidenceYearsLabel(events) {
  const years = events
    .map((event) => Number(String(event.date || "").slice(0, 4)))
    .filter(Number.isFinite);

  if (!years.length) {
    return "Historical evidence window";
  }

  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);
  const span = Math.max(1, lastYear - firstYear + 1);

  return `${getEvidenceYearRange(events)} (${span} years of evidence)`;
}

function getPriorityTriggerNote(priorityEvents, province) {
  const topThree = priorityEvents.slice(0, 3);

  if (topThree.length < 3) {
    return "";
  }

  const dates = new Set(topThree.map((event) => event.date).filter(Boolean));
  const descriptions = topThree
    .map((event) => normalizeText(event.description))
    .join(" ");
  const isOctober2000Flood =
    dates.has("2000-10-13") &&
    normalizeText(province).includes("torino") &&
    descriptions.includes("13 16 october 2000");

  if (isOctober2000Flood) {
    return "Note: P1-P3 refer to the same 13-16 October 2000 flood event in Piemonte and Valle d'Aosta. This contextualises the signal as documented extreme-flood vulnerability, not three independent recurrent events.";
  }

  if (dates.size === 1) {
    const [date] = Array.from(dates);

    return `Note: P1-P3 share the same event date (${date}). Treat them as a clustered trigger signal before interpreting recurrence frequency.`;
  }

  return "";
}

function toCsvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function writeCsv(filePath, columns, rows) {
  const csv = [
    "\uFEFFsep=;",
    columns.join(";"),
    ...rows.map((row) =>
      columns.map((column) => toCsvValue(row[column])).join(";")
    ),
  ].join("\n");

  fs.writeFileSync(filePath, csv, "utf8");
}

function writeGeoJson(filePath, events) {
  const features = events
    .filter(
      (event) =>
        Number.isFinite(Number(event.longitude)) &&
        Number.isFinite(Number(event.latitude))
    )
    .map((event) => ({
      geometry: {
        coordinates: [
          Number(event.longitude),
          Number(event.latitude),
        ],
        type: "Point",
      },
      properties: {
        bridge_name: event.bridge_name,
        cause: event.specific_cause,
        date: event.date,
        event_id: event.event_id,
        map_ref: event.map_ref,
        municipality: event.municipality,
        province: event.province,
        region: event.region,
        severity: event.collapse_severity,
        source_confidence: event.source_confidence,
        triggered: event.triggered,
      },
      type: "Feature",
    }));

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        features,
        name: "ARCUS Path 01 event export",
        type: "FeatureCollection",
      },
      null,
      2
    ),
    "utf8"
  );
}

function buildCss() {
  return `
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f7f0e8; color: #1c1713; font-family: Arial, sans-serif; }
    .cover { min-height: 210mm; padding: 36px; position: relative; overflow: hidden; background: linear-gradient(180deg,#fffaf2 0%,#f7f0e8 64%,#efe4d5 100%); color: #15110f; border: 1px solid #d7cab9; border-top: 8px solid #c49040; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg,rgba(196,144,64,.09) 1px,transparent 1px),linear-gradient(rgba(21,17,15,.045) 1px,transparent 1px); background-size: 48px 48px; opacity: .42; }
    .cover::after { content: ""; position: absolute; right: -80px; top: -110px; width: 330px; height: 330px; border: 1px solid rgba(196,144,64,.24); border-radius: 999px; background: radial-gradient(circle,rgba(196,144,64,.10),transparent 62%); }
    .cover > * { position: relative; z-index: 1; }
    .logo { width: 188px; height: auto; filter: saturate(1.12) contrast(1.08); }
    .brand-fallback { color: #c49040; font-size: 42px; font-family: Georgia, serif; font-weight: 900; letter-spacing: 0.08em; }
    .badge { display: inline-block; margin-top: 22px; padding: 8px 10px; border: 1px solid rgba(196,144,64,.55); background: rgba(196,144,64,.10); color: #7a4f19; font-size: 11px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    h1 { max-width: 720px; margin: 28px 0 0; color: #15110f; font-family: Georgia, serif; font-size: 52px; line-height: 1.02; }
    .subtitle { max-width: 620px; color: #5e5144; font-size: 15px; line-height: 1.55; }
    .meta { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
    .meta div { border-top: 1px solid rgba(196,144,64,.55); background: rgba(255,255,255,.32); padding: 10px 8px 0; }
    .meta span, h2 span, .kpi span { display: block; color: #c49040; font-size: 10px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    .meta strong { display: block; margin-top: 5px; color: #15110f; font-size: 13px; }
    main { padding: 24px 30px 62px; }
    section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 22px; padding: 16px 18px; border: 1px solid #d7cab9; background: rgba(255,250,242,.92); overflow-wrap: anywhere; }
    h2 { margin: 0 0 12px; font-family: Georgia, serif; font-size: 24px; break-after: avoid; page-break-after: avoid; }
    p, li { color: #4f463d; font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
    ul, ol { margin: 0; padding-left: 19px; }
    .map-frame { margin: 0; border: 1px solid #b8aa98; background: #fff; }
    .map-frame img { display: block; width: 100%; height: auto; }
    .map-frame.compact img { max-height: 112mm; object-fit: cover; }
    .map-section { break-before: page; break-after: page; page-break-before: always; page-break-after: always; }
    .map-section .map-frame { background: #e9e2d8; }
    .map-section .map-frame img { aspect-ratio: 900 / 760; object-fit: contain; }
    .hazard-section { break-before: page; page-break-before: always; }
    .map-legend-row { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 9px; padding: 9px 11px; border: 1px solid #d7cab9; background: #fffaf2; color: #4f463d; font-size: 10px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
    .map-legend-row span { display: inline-flex; align-items: center; gap: 6px; }
    .map-legend-row i { width: 9px; height: 9px; display: inline-block; border-radius: 999px; box-shadow: 0 0 0 3px rgba(21,17,15,.10); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .legend-critical { background: #9b3d31; }
    .legend-triggered { background: #c49040; }
    .legend-context { background: #53676d; }
    .legend-hydraulic { background: #3F6B78; }
    .legend-landslide { background: #B56A1D; }
    .legend-seismic { background: #6E858D; }
    .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
    .kpi { min-height: 112px; display: grid; grid-template-rows: auto auto 1fr; padding: 14px; background: #f9f2e8; border: 1px solid #d7cab9; }
    .kpi strong { display: flex; align-items: flex-end; min-height: 34px; margin-top: 8px; color: #15110f; font-size: 22px; }
    .kpi p { margin: 7px 0 0; color: #7a6548; font-size: 10px; line-height: 1.35; font-weight: 700; }
    .findings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
    .finding { padding: 12px; border: 1px solid #d7cab9; background: #f9f2e8; }
    .finding b { display: block; color: #15110f; font-size: 12px; line-height: 1.45; }
    .asset-statement { padding: 12px 14px; border: 1px solid rgba(196,144,64,.62); background: #fbf4ec; color: #15110f; font-weight: 800; }
    .decision { padding: 14px 16px; background: #15110f; color: #f2e8d4; border-left: 5px solid #c49040; font-weight: 800; line-height: 1.45; }
    .flag-box { margin-top: 16px; padding: 16px 18px; border: 1px solid rgba(196,144,64,.72); background: linear-gradient(135deg,#15110f 0%,#211911 100%); color: #f2e8d4; box-shadow: 0 14px 30px rgba(64,49,37,.16); }
    .flag-box span { display: block; color: #c49040; font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
    .flag-box ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 16px; margin: 10px 0 0; padding-left: 17px; }
    .flag-box li { color: #f2e8d4; font-size: 11px; line-height: 1.42; margin-bottom: 4px; }
    .focus-grid { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 14px; align-items: start; }
    .focus-card { padding: 14px; background: #f9f2e8; border: 1px solid #d7cab9; }
    .signal-band { display: grid; grid-template-columns: 1.05fr .95fr; gap: 12px; margin-top: 12px; }
    .operational-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 10px; margin-top: 12px; }
    .operational-grid .reading-card { grid-column: 1 / -1; background: #15110f; color: #f2e8d4; border-color: #15110f; }
    .operational-grid .reading-card strong, .operational-grid .reading-card p { color: #f2e8d4; }
    .signal-card { padding: 15px; border: 1px solid #d7cab9; background: #fffaf2; }
    .signal-card.dark { background: #15110f; color: #f2e8d4; border-color: #15110f; }
    .signal-card.dark p, .signal-card.dark li { color: #f2e8d4; }
    .signal-card span, .action-card span, .data-card span { display: block; color: #c49040; font-size: 9px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
    .signal-card strong { display: block; margin-top: 7px; color: #15110f; font-size: 17px; line-height: 1.25; }
    .signal-card.dark strong { color: #f2e8d4; }
    .signal-card p { margin: 8px 0 0; }
    .attention-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
    .attention-badges span { display: inline-flex; align-items: center; padding: 6px 8px; border: 1px solid #d7cab9; background: #fbf4ec; color: #4f463d; font-size: 10px; font-weight: 800; letter-spacing: 0; text-transform: none; }
    .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
    .action-card, .data-card { padding: 13px 14px; border: 1px solid #d7cab9; background: #fffaf2; }
    .action-card b, .data-card b { display: block; margin-top: 5px; color: #15110f; font-size: 13px; line-height: 1.35; }
    .data-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
    .data-card { min-height: 84px; background: #fffaf2; border-top: 4px solid #c49040; }
    .data-card b { font-size: 12px; }
    .limitation-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .limitation-strip div { padding: 10px 12px; background: #fbf4ec; border-left: 3px solid #c49040; color: #4f463d; font-size: 10.5px; line-height: 1.45; }
    .precedent-list { display: grid; gap: 8px; margin-top: 12px; }
    .precedent-card { display: grid; grid-template-columns: 46px 1fr 90px; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid #d7cab9; background: #fffaf2; }
    .precedent-card .map-ref { min-width: 34px; }
    .precedent-card strong { color: #15110f; font-size: 12px; }
    .precedent-card span { color: #7a6548; font-size: 10px; font-weight: 800; }
    .source-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
    .source-card { padding: 10px 12px; border: 1px solid #d7cab9; background: #fffaf2; }
    .source-card strong { display: block; color: #15110f; font-size: 11px; line-height: 1.35; }
    .source-card span { color: #7a6548; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .mini-bars { display: grid; gap: 7px; margin-top: 12px; }
    .mini-bar { display: grid; grid-template-columns: 150px 1fr 42px; align-items: center; gap: 8px; color: #4f463d; font-size: 10px; font-weight: 800; }
    .mini-bar i { display: block; height: 8px; background: #eadfcc; }
    .mini-bar b { display: block; height: 8px; background: #c49040; }
    .index-layer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0 12px; }
    .index-layer-card { min-height: 150px; padding: 14px 16px; border: 1px solid #d7cab9; background: #fffaf2; border-top: 4px solid #c49040; }
    .index-layer-card span { display: block; color: #7a6548; font-size: 9px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .index-layer-card strong { display: block; margin-top: 7px; color: #15110f; font-size: 16px; line-height: 1.15; }
    .index-layer-card b { display: block; margin-top: 9px; color: #c49040; font-size: 24px; line-height: 1.05; }
    .index-layer-card p { margin-top: 9px; font-size: 11px; line-height: 1.45; }
    .confidence-pill { display: inline-block; margin-top: 8px; padding: 4px 7px; background: #15110f; color: #c49040; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #c49040; color: #15110f; text-align: left; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
    th, td { border: 1px solid #d9cec1; padding: 7px 9px; vertical-align: top; overflow-wrap: anywhere; }
    .map-ref { display: inline-block; min-width: 24px; padding: 4px 6px; background: #15110f; color: #c49040; font-weight: 900; text-align: center; }
    .note { background: #f9f2e8; border-left: 3px solid #c49040; padding: 10px 12px; }
    .report-footer { position: fixed; left: 16mm; right: 16mm; bottom: 7mm; display: flex; align-items: center; justify-content: space-between; gap: 18px; color: #8b7b68; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
    .report-footer span { white-space: nowrap; }
    .footer-mark { position: fixed; right: 14mm; bottom: 6mm; width: 34px; opacity: .4; }
    .brief-page { width: 182mm; min-height: 269mm; max-height: 269mm; overflow: hidden; padding: 0; }
    .brief-sheet { display: grid; grid-template-rows: auto auto 1fr auto; gap: 7px; }
    .brief-sheet-head { display: grid; grid-template-columns: 112px 1fr 182px; gap: 14px; align-items: start; padding-bottom: 8px; border-bottom: 2px solid #15110f; }
    .brief-sheet-head .logo { width: 92px; }
    .brief-sheet-head h1 { color: #15110f; font-size: 25px; line-height: 1.02; margin: 2px 0 0; }
    .brief-sheet-head p { margin: 5px 0 0; color: #4f463d; font-size: 8.7px; line-height: 1.3; }
    .brief-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
    .brief-meta div { padding: 6px 7px; border: 1px solid #d7cab9; background: #fffaf2; }
    .brief-meta span, .brief-kicker, .brief-box span { display: block; color: #c49040; font-size: 7.4px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
    .brief-meta strong { display: block; margin-top: 3px; color: #15110f; font-size: 8.4px; line-height: 1.2; }
    .brief-top { display: grid; grid-template-columns: 1.04fr .96fr; gap: 8px; }
    .brief-panel { padding: 9px 10px; border: 1px solid #d7cab9; background: rgba(255,250,242,.94); }
    .brief-panel h2 { margin: 0 0 6px; color: #15110f; font-family: Georgia, serif; font-size: 15px; line-height: 1.05; }
    .brief-panel h2 span { margin-right: 6px; color: #c49040; font-family: Arial, sans-serif; font-size: 8px; letter-spacing: .14em; }
    .brief-map .map-frame img { aspect-ratio: 900 / 760; object-fit: cover; }
    .brief-map .map-legend-row { gap: 4px 7px; margin-top: 5px; padding: 5px 6px; font-size: 7.2px; line-height: 1.2; }
    .brief-map .map-legend-row i { width: 6px; height: 6px; box-shadow: 0 0 0 2px rgba(21,17,15,.10); }
    .brief-map-note { margin: 4px 0 0; color: #7a6548; font-size: 6.8px; line-height: 1.2; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    .brief-signal { background: #fffaf2; color: #15110f; border-color: #c49040; box-shadow: inset 0 0 0 2px rgba(196,144,64,.08); }
    .brief-signal h2, .brief-signal p, .brief-signal li { color: #4f463d; }
    .brief-signal > strong { color: #15110f; }
    .brief-signal p { margin: 6px 0 0; font-size: 8.6px; line-height: 1.36; }
    .brief-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; margin-top: 8px; }
    .brief-kpi { padding: 7px; border: 1px solid rgba(196,144,64,.42); background: #fbf4ec; }
    .brief-kpi span { display: block; color: #c49040; font-size: 7px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .brief-kpi strong { display: block; margin-top: 4px; color: #15110f; font-size: 15px; line-height: 1; }
    .brief-bottom { display: grid; grid-template-columns: .92fr 1.16fr .92fr; gap: 8px; }
    .brief-box { padding: 8px 9px; border: 1px solid #d7cab9; background: #fffaf2; }
    .brief-box h3 { margin: 0 0 6px; color: #15110f; font-family: Georgia, serif; font-size: 13.5px; line-height: 1.05; }
    .brief-case-note { margin: 0 0 5px; color: #4f463d; font-size: 7.6px; line-height: 1.24; font-weight: 700; overflow-wrap: anywhere; }
    .brief-limit-note { margin: 7px 0 0; padding-top: 6px; border-top: 1px solid #d7cab9; color: #7a6548; font-size: 7.2px; line-height: 1.24; font-weight: 800; overflow-wrap: anywhere; }
    .brief-box ul, .brief-box ol { margin: 0; padding-left: 15px; }
    .brief-box li { margin-bottom: 3px; color: #4f463d; font-size: 8px; line-height: 1.27; overflow-wrap: anywhere; }
    .brief-limit { background: #fbf4ec; border-left: 4px solid #c49040; }
    .brief-export { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid #d7cab9; color: #7a6548; font-size: 7.2px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .brief-export strong { color: #15110f; }
    @media print {
      .cover, .kpi, .decision, .flag-box, th, .map-ref, .map-legend-row, .map-legend-row i {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `;
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function actionCards(items) {
  return items
    .map(
      (item, index) => `<article class="action-card">
        <span>Action ${index + 1}</span>
        <b>${escapeHtml(item)}</b>
      </article>`
    )
    .join("");
}

function dataCards(items) {
  return items
    .slice(0, 5)
    .map(
      (item, index) => `<article class="data-card">
        <span>Data ${index + 1}</span>
        <b>${escapeHtml(item)}</b>
      </article>`
    )
    .join("");
}

function limitationCards(items) {
  return items
    .map((item) => `<div>${escapeHtml(item)}</div>`)
    .join("");
}

function hazardBars(focus, exposureProfile) {
  const hazards = exposureProfile?.hazards || [];

  if (!hazards.length) {
    return `<div class="mini-bars">
      <div class="mini-bar"><span>${escapeHtml(focus.dominantExposureLabel)}</span><i><b style="width:100%"></b></i><strong>${focus.exposureScore || "-"} </strong></div>
    </div>`;
  }

  return `<div class="mini-bars">${hazards
    .map((hazard) => {
      const key = normalizeExposureKey(hazard.key);
      const label = exposureLabels[key] || hazard.label || key;
      const score = Math.max(0, Math.min(100, Number(hazard.score || 0)));

      return `<div class="mini-bar">
        <span>${escapeHtml(label)}</span>
        <i><b style="width:${score}%"></b></i>
        <strong>${score}</strong>
      </div>`;
    })
    .join("")}</div>`;
}

function priorityEventCards(priorityEvents) {
  return priorityEvents
    .slice(0, 3)
    .map(
      (event, index) => `<article class="precedent-card">
        <div>${event.map_ref ? `<span class="map-ref">${event.map_ref}</span>` : `<span class="map-ref">P${index + 1}</span>`}</div>
        <div>
          <strong>${escapeHtml(event.event_id)} - ${escapeHtml(event.municipality || "-")}</strong>
          <span>${escapeHtml(event.year || event.date || "-")} / ${escapeHtml(event.specific_cause || "-")}</span>
        </div>
        <span>${escapeHtml(event.collapse_severity || "-")} / ${escapeHtml(event.source_confidence || "-")}</span>
      </article>`
    )
    .join("");
}

function sourceCards(sources) {
  return sources
    .slice()
    .sort((a, b) => {
      const rank = (source) =>
        /official|technical|scientific/i.test(
          `${source.source_role} ${source.source_type}`
        )
          ? 0
          : 1;
      return rank(a) - rank(b);
    })
    .slice(0, 8)
    .map(
      (source) => `<article class="source-card">
        <span>${escapeHtml(source.event_id || "-")} / ${escapeHtml(source.source_type || "-")}</span>
        <strong>${escapeHtml(source.source_title || "-")}</strong>
      </article>`
    )
    .join("");
}

function buildCover({
  contextLabel,
  dominantCause,
  events,
  logoDataUri,
  province,
  reportId,
}) {
  return `<header class="cover">
    <div>
      ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="ARCUS" />` : `<div class="brand-fallback">ARCUS</div>`}
      <div class="badge">Path 01 / New Territory / Province-Level Preliminary Screening</div>
      <h1>Territory Briefing: ${escapeHtml(province)}</h1>
      <p class="subtitle">Evidence-based preliminary infrastructure intelligence for technical meetings, early design discussion and due diligence. ARCUS supports screening; it does not replace site-specific checks or design verification.</p>
    </div>
    <div class="meta">
      <div><span>Report ID</span><strong>${escapeHtml(reportId)}</strong></div>
      <div><span>Project context</span><strong>${escapeHtml(contextLabel)}</strong></div>
      <div><span>Dominant driver</span><strong>${escapeHtml(dominantCause)}</strong></div>
      <div><span>Events</span><strong>${events.length}</strong></div>
      <div><span>Spatial level</span><strong>Province level</strong></div>
      <div><span>Analysis type</span><strong>Territory Briefing</strong></div>
      <div><span>Version</span><strong>ARCUS Professional v1.0-preview</strong></div>
      <div><span>Generated by</span><strong>ARCUS Professional</strong></div>
    </div>
  </header>`;
}

function buildFullReportHtml({
  ainopBridgeIndex,
  dominantCause,
  events,
  exposureProfile,
  focus,
  logoDataUri,
  mapImagePath,
  outputDir,
  priorityEvents,
  province,
  reportId,
  sources,
  projectContext,
}) {
  const contextLabel =
    contextLabels[projectContext] || contextLabels.bridge;
  const ainopProvince = ainopBridgeIndex?.provinces?.find(
    (item) =>
      normalizeText(item.province) === normalizeText(province)
  );
  const totalCollapse = events.filter(
    (event) => event.collapse_severity === "TC"
  ).length;
  const triggered = events.filter((event) => event.triggered).length;
  const imageRelative = `./${path.relative(outputDir, mapImagePath).replaceAll("\\", "/")}`;
  const mapLegend = "";
  const topCauseShare = Math.round(
    (countBy(events, "specific_cause")[0]?.[1] || 0) / events.length * 100
  );
  const matchedText = focus.matchedEvents
    ? `${focus.matchedEvents} matched ARCUS events`
    : "Province-level exposure signal";
  const priorityRefs = priorityEvents
    .slice(0, 3)
    .map((event) => `${event.map_ref || "-"} ${event.municipality || "-"}`)
    .join(", ");
  const displayDriver = driverLabel(focus.dominantExposureLabel);
  const evidenceYearsLabel = getEvidenceYearsLabel(events);
  const priorityTriggerNote = getPriorityTriggerNote(priorityEvents, province);
  const priorityIndex =
    Number(exposureProfile?.risk_score || 0) ||
    Math.round(
      (Number(focus.exposureScore || 0) +
        Math.min(100, (totalCollapse / Math.max(events.length, 1)) * 100) +
        Math.min(100, (triggered / Math.max(events.length, 1)) * 100)) /
        3
    );
  const collapseRateAvailable =
    Number(ainopProvince?.ainop_bridges_total || 0) > 0 &&
    Number.isFinite(Number(ainopProvince?.collapse_rate_per_100_ainop_bridges));
  const collapseRateNumerator =
    ainopProvince?.numerator_count ??
    ainopProvince?.arcus_cases ??
    events.length;
  const collapseRateValue = collapseRateAvailable
    ? String(ainopProvince.collapse_rate_per_100_ainop_bridges)
    : "N/A";
  const nationalReference =
    ainopProvince?.national_rate_per_100 ??
    ainopProvince?.national_rate_per_100_ainop_bridges ??
    ainopBridgeIndex?.metadata?.national_rate_per_100_ainop_bridges ??
    "N/A";
  const datasetVersion =
    ainopProvince?.dataset_version ??
    ainopBridgeIndex?.metadata?.dataset_version ??
    "N/A";
  const dataCutoffDate =
    ainopProvince?.data_cutoff_date ??
    ainopBridgeIndex?.metadata?.data_cutoff_date ??
    "N/A";
  const latestEventDate =
    ainopProvince?.latest_event_date ??
    ainopBridgeIndex?.metadata?.latest_event_date ??
    "N/A";
  const includedYearMax =
    ainopProvince?.included_year_max ??
    ainopBridgeIndex?.metadata?.included_year_max ??
    "N/A";
  const collapseRateMultiplier = collapseRateAvailable &&
    Number.isFinite(Number(ainopProvince?.relative_to_national))
    ? `${ainopProvince.relative_to_national}x`
    : "N/A";
  const collapseRateConfidence =
    String(ainopProvince?.collapse_rate_confidence || "unavailable").replaceAll("_", " ");
  const collapseRateReason =
    ainopProvince?.collapse_rate_confidence_reason ||
    "No AINOP bridge denominator available for this province.";
  const flagReasons = [
    "ARCUS is based on the first systematic database of collapsed bridges in Italy from 2000 to today.",
    `Dominant exposure: ${displayDriver} (${focus.exposureScore || "-"} / 100).`,
    `Historical severity: ${totalCollapse} total collapses and ${triggered} triggered events in the selected province.`,
    `Evidence window: ${evidenceYearsLabel}.`,
    `Map-linked cases: ${priorityRefs || "P1/P2/P3 priority cases"}.`,
    `Evidence package: ${sources.length} linked sources supporting the screening signal.`,
  ];
  const ainopIndexText = ainopProvince?.ainop_bridges_total
    ? `ARCUS/AINOP Collapse Rate: ${collapseRateNumerator} documented ARCUS cases over ${ainopProvince.ainop_bridges_total} AINOP bridges; ${ainopProvince.collapse_rate_per_100_ainop_bridges} cases per 100 bridges; ${ainopProvince.relative_to_national}x the national ARCUS/AINOP rate (${nationalReference} per 100). Dataset: ${datasetVersion}; data cutoff: ${dataCutoffDate}; latest included event: ${latestEventDate}; latest included year: ${includedYearMax}.`
    : "ARCUS/AINOP Collapse Rate not available for this province.";
  const indexLayerCards = `
    <div class="index-layer-grid">
      <article class="index-layer-card">
        <span>Layer 1 / Territorial exposure</span>
        <strong>Priority Index</strong>
        <b>${Math.round(priorityIndex)} / 100</b>
        <p>Measures exposure and hazard context. It answers: this territory has elevated hazard/exposure characteristics.</p>
      </article>
      <article class="index-layer-card">
        <span>Layer 2 / Heritage vulnerability</span>
        <strong>Collapse Rate</strong>
        <b>${escapeHtml(collapseRateMultiplier)}</b>
        <p>${collapseRateAvailable
          ? `${escapeHtml(String(collapseRateNumerator))} documented ARCUS cases; denominator ${escapeHtml(String(ainopProvince.ainop_bridges_total))} AINOP bridges; provincial rate ${escapeHtml(collapseRateValue)} per 100; national reference ${escapeHtml(String(nationalReference))} per 100; dataset ${escapeHtml(String(datasetVersion))}; data cutoff ${escapeHtml(String(dataCutoffDate))}; latest included event ${escapeHtml(String(latestEventDate))}; latest included year ${escapeHtml(String(includedYearMax))}.`
          : "No reliable AINOP bridge denominator is available for this province."}</p>
        <i class="confidence-pill">Denominator confidence: ${escapeHtml(collapseRateConfidence)}</i>
      </article>
    </div>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>ARCUS Path 01 - ${escapeHtml(province)}</title><style>${buildCss()}</style></head>
<body>
  ${buildCover({ contextLabel, dominantCause, events, logoDataUri, province, reportId })}
  <div class="report-footer">
    <span>ARCUS Professional</span>
    <span>Path 01 / New Territory</span>
    <span>${escapeHtml(reportId)}</span>
  </div>
  <main>
    <section>
      <h2><span>01</span>Executive Summary</h2>
      <p class="asset-statement">ARCUS is based on the first systematic database of collapsed bridges in Italy from 2000 to today. The value of this report is not map aggregation: it is the translation of documented collapse evidence into operational infrastructure intelligence.</p>
      <p>ARCUS identifies ${events.length} documented cases in the selected province and translates the Step 3 exposure indicators into operational actions for ${escapeHtml(contextLabel)} interventions. The PDF map shows ARCUS cases; the hazard-layer contribution is summarised through the exposure indicators below. The dominant territorial signal is <strong>${escapeHtml(displayDriver)}</strong>; the leading historical cause is <strong>${escapeHtml(dominantCause)}</strong>.</p>
      <div class="decision">Recommended use: province-level preliminary screening before design, due diligence or site-specific investigation.</div>
      <div class="findings">
        <div class="finding"><span>Dominant Exposure</span><b>${escapeHtml(displayDriver)} / score ${focus.exposureScore || "-"}</b></div>
        <div class="finding"><span>Historical Signal</span><b>${escapeHtml(dominantCause)} represents ${topCauseShare}% of the selected evidence.</b></div>
        <div class="finding"><span>Priority Use</span><b>${escapeHtml(focus.immediateScreening)}</b></div>
      </div>
      <div class="flag-box">
        <span>Why ARCUS flags this</span>
        <ul>${listItems(flagReasons)}</ul>
      </div>
    </section>
    <section class="map-section">
      <h2><span>02</span>ARCUS Cases Map</h2>
      <figure class="map-frame"><img src="${escapeHtml(imageRelative)}" alt="ARCUS Atlas map extract - ${escapeHtml(province)}" /></figure>
      ${mapLegend}
      <p class="note">Static ARCUS cases map - full interactive view available in Professional Atlas.</p>
    </section>
    <section>
      <h2><span>03</span>How to Read</h2>
      <p>ARCUS starts from the selected province, reads all ARCUS records available for that administrative area, identifies the dominant territorial pattern and turns that signal into operational next checks. This is province-level screening, not structural safety certification.</p>
      <p class="note">Province-level reading is the minimum comparable screening scale. Large provinces can include mountain valleys, plains, hills and urban corridors; a specific site, municipality or alignment requires a more granular follow-up analysis.</p>
      <div class="signal-band">
        <article class="signal-card dark">
          <span>Selected project context</span>
          <strong>${escapeHtml(focus.contextLabel)}</strong>
          <p>${escapeHtml(focus.contextScope)}</p>
        </article>
        <article class="signal-card">
          <span>Dominant exposure</span>
          <strong>${escapeHtml(displayDriver)}</strong>
          <p>${escapeHtml(matchedText)}. Public overlays are used as screening context and must be followed by site-specific checks.</p>
        </article>
      </div>
    </section>
    <section>
      <h2><span>04</span>Key Indicators</h2>
      <div class="kpis">
        <div class="kpi"><span>ARCUS Events</span><strong>${events.length}</strong><p>Selected province</p></div>
        <div class="kpi"><span>Total Collapse</span><strong>${totalCollapse}</strong><p>Historical severity</p></div>
        <div class="kpi"><span>Triggered Events</span><strong>${triggered}</strong><p>External initiating condition</p></div>
        <div class="kpi"><span>Evidence Window</span><strong>${escapeHtml(getEvidenceYearRange(events))}</strong><p>${escapeHtml(evidenceYearsLabel)}</p></div>
      </div>
      <p class="note">Evidence package: ${sources.length} linked and deduplicated sources support the selected provincial screening signal.</p>
      ${indexLayerCards}
      <p class="note">Read the two indicators as separate layers, not as a composite score. A province can show high territorial exposure with a low Collapse Rate, or low exposure with a high Collapse Rate; the combination is more informative than a single merged number.</p>
      <p class="note">${escapeHtml(ainopIndexText)} Confidence note: ${escapeHtml(collapseRateReason)}</p>
    </section>
    <section class="hazard-section">
      <h2><span>05</span>Hazard / Exposure Context</h2>
      <p>The Step 3 analysis combines ARCUS historical cases with declared public hazard context. Official point-level hydraulic and PAI landslide exposure is evaluated through backend WFS providers when a validated project point is available; INGV MPS04 seismic PGA is evaluated through the protected local grid when configured. WMS remains visual control only. This standalone province export keeps the provincial screening scores separate from any point-level official exposure.</p>
      ${hazardBars(focus, exposureProfile)}
    </section>
    <section>
      <h2><span>06</span>Operational Meaning</h2>
      <div class="operational-grid">
        <article class="signal-card reading-card">
          <span>ARCUS Reading</span>
          <p>${escapeHtml(focus.operationalMeaning)}</p>
        </article>
        <article class="signal-card">
          <span>Primary Focus</span>
          <strong>${escapeHtml(focus.primaryFocus)}</strong>
        </article>
        <article class="signal-card">
          <span>Attention Points</span>
          <div class="attention-badges">${focus.attentionPoints.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        </article>
      </div>
    </section>
    <section>
      <h2><span>07</span>Priority ARCUS Cases</h2>
      <p>The selected province contains all ARCUS records available for that administrative area. This section highlights the highest-priority cases within the provincial set, ranked by severity, trigger, dominant driver and evidence reliability. These cases are not external comparables: they explain the dominant territorial signal used by the report.</p>
      ${priorityTriggerNote ? `<p class="note">${escapeHtml(priorityTriggerNote)}</p>` : ""}
      <div class="precedent-list">${priorityEventCards(priorityEvents)}</div>
    </section>
    <section>
      <h2><span>08</span>Territorial Pattern</h2>
      <p>The selected province shows a concentrated ${escapeHtml(displayDriver)} pattern. This pattern supports preliminary attention toward ${escapeHtml(focus.primaryFocus.toLowerCase())} for ${escapeHtml(contextLabel)} interventions.</p>
    </section>
    <section>
      <h2><span>09</span>Interpretation</h2>
      <p>For ${escapeHtml(contextLabel)} interventions in ${escapeHtml(province)}, ARCUS indicates that preliminary investigation should be framed around ${escapeHtml(displayDriver)}, documented cases and the operational consequences implied by the selected project context.</p>
    </section>
    <section>
      <h2><span>10</span>Immediate Actions</h2>
      <div class="action-grid">${actionCards(focus.immediateScreeningActions)}</div>
    </section>
    <section>
      <h2><span>11</span>Data to Request</h2>
      <div class="data-grid">${dataCards(focus.dataToRequest)}</div>
    </section>
    <section>
      <h2><span>12</span>Design-Phase Checks</h2>
      <div class="action-grid">${actionCards(focus.designPhaseChecks)}</div>
    </section>
    <section>
      <h2><span>13</span>Recommended Client Path</h2>
      <ol>${listItems(focus.recommendations)}</ol>
    </section>
    <section>
      <h2><span>14</span>Data Coverage & Limitations</h2>
      <div class="limitation-strip">${limitationCards(focus.limitations)}</div>
      <p class="note">ARCUS currently reports the provincial evidence window as ${escapeHtml(evidenceYearsLabel)}. The Collapse Rate is a derived ARCUS/AINOP indicator: AINOP is fed by owners/managers and may under-represent local assets, especially in small mountain municipalities. For this province the denominator confidence is ${escapeHtml(collapseRateConfidence)}: ${escapeHtml(collapseRateReason)}</p>
    </section>
    <section>
      <h2><span>15</span>Methodology Snapshot</h2>
      <p>ARCUS combines documented collapse events, source reliability, spatial relevance, severity, triggers, cause distribution, territorial hazard context and province-level priority cases. The dominant exposure indicator is calculated from Step 3 scores: hydraulic, landslide, seismic and historical failure context.</p>
    </section>
    <section>
      <h2><span>16</span>Score and Class Legend</h2>
      <p>P1/P2/P3 identify the highest-priority ARCUS cases within the selected province on the exported Atlas map. Severity TC means total collapse; triggered events indicate an external initiating condition was recorded. Use "Historical Failure Context" for province-level screening unless asset-level structural data are available.</p>
    </section>
    <section>
      <h2><span>A</span>Short Source Appendix</h2>
      <div class="source-cards">${sourceCards(sources)}</div>
      <p class="note">The full source table is provided as a separate supporting CSV export.</p>
    </section>
  </main>
</body>
</html>`;
}

function buildBriefHtml({
  ainopBridgeIndex,
  events,
  exposureProfile,
  focus,
  logoDataUri,
  mapImagePath,
  outputDir,
  priorityEvents,
  province,
  reportId,
  sources,
  projectContext,
}) {
  const contextLabel =
    contextLabels[projectContext] || contextLabels.bridge;
  const ainopProvince = ainopBridgeIndex?.provinces?.find(
    (item) =>
      normalizeText(item.province) === normalizeText(province)
  );
  const totalCollapse = events.filter(
    (event) => event.collapse_severity === "TC"
  ).length;
  const triggered = events.filter((event) => event.triggered).length;
  const imageRelative = `./${path.relative(outputDir, mapImagePath).replaceAll("\\", "/")}`;
  const mapLegend = "";
  const mapNote =
    "Static ARCUS cases map. Full interactive view available in Professional Atlas.";
  const priorityIndex =
    Number(exposureProfile?.risk_score || 0) ||
    Math.round(
      (Number(focus.exposureScore || 0) +
        Math.min(100, (totalCollapse / Math.max(events.length, 1)) * 100) +
        Math.min(100, (triggered / Math.max(events.length, 1)) * 100)) /
        3
    );
  const collapseRateAvailable =
    Number(ainopProvince?.ainop_bridges_total || 0) > 0 &&
    Number.isFinite(Number(ainopProvince?.collapse_rate_per_100_ainop_bridges));
  const briefCollapseRateNumerator =
    ainopProvince?.numerator_count ??
    ainopProvince?.arcus_cases ??
    events.length;
  const briefNationalReference =
    ainopProvince?.national_rate_per_100 ??
    ainopProvince?.national_rate_per_100_ainop_bridges ??
    ainopBridgeIndex?.metadata?.national_rate_per_100_ainop_bridges ??
    "N/A";
  const briefDatasetVersion =
    ainopProvince?.dataset_version ??
    ainopBridgeIndex?.metadata?.dataset_version ??
    "N/A";
  const briefDataCutoffDate =
    ainopProvince?.data_cutoff_date ??
    ainopBridgeIndex?.metadata?.data_cutoff_date ??
    "N/A";
  const briefLatestEventDate =
    ainopProvince?.latest_event_date ??
    ainopBridgeIndex?.metadata?.latest_event_date ??
    "N/A";
  const briefIncludedYearMax =
    ainopProvince?.included_year_max ??
    ainopBridgeIndex?.metadata?.included_year_max ??
    "N/A";
  const collapseRateMultiplier = collapseRateAvailable &&
    Number.isFinite(Number(ainopProvince?.relative_to_national))
    ? `${ainopProvince.relative_to_national}x`
    : "N/A";
  const collapseRateConfidence =
    String(ainopProvince?.collapse_rate_confidence || "unavailable").replaceAll("_", " ");
  const collapseRateReason =
    ainopProvince?.collapse_rate_confidence_reason ||
    "No AINOP bridge denominator available for this province.";
  const displayDriver = driverLabel(focus.dominantExposureLabel);
  const evidenceYearsLabel = getEvidenceYearsLabel(events);
  const priorityTriggerNote = getPriorityTriggerNote(priorityEvents, province);
  const nextChecks = [
    "Translate the province signal into site-specific checks.",
    "Review P1-P3 priority ARCUS cases.",
    `Check ${displayDriver} assumptions on site.`,
    "Use WFS point exposure and the configured INGV MPS04 local grid for validated project locations; use WMS overlays as visual context only.",
    "Document limits before design decisions.",
  ];
  const briefDataToRequest = focus.dataToRequest.slice(0, 5);
  const topFindings = [
    "Asset: first systematic database of collapsed bridges in Italy from 2000 to today.",
    `Signal: ${displayDriver} ${focus.exposureScore || "-"} / 100.`,
    collapseRateAvailable
      ? `Collapse Rate: ${briefCollapseRateNumerator} cases / ${ainopProvince.ainop_bridges_total} AINOP bridges; ${collapseRateMultiplier} national ARCUS/AINOP rate (${briefNationalReference} per 100), dataset ${briefDatasetVersion}, updated ${briefDataCutoffDate}, latest event ${briefLatestEventDate}, year max ${briefIncludedYearMax}.`
      : `Evidence window: ${evidenceYearsLabel}.`,
    `Evidence package: ${sources.length} linked sources; run site-specific checks before design decisions.`,
  ];
  const signalSentence =
    `Province-level ${displayDriver} signal. Use it to frame ${contextLabel} checks; confirm with site-specific data. ARCUS translates documented collapse history into operational next checks.`;
  const shortLimitations = [
    "Province-level screening only, not design scale.",
    "ARCUS does not certify structural safety or asset condition.",
    `Collapse Rate denominator confidence: ${collapseRateConfidence}. ${collapseRateReason}`,
  ];

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>ARCUS Path 01 One-Page - ${escapeHtml(province)}</title><style>${buildCss()}</style></head>
<body>
  <main class="brief-page brief-sheet">
    <header class="brief-sheet-head">
      <div>
        ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="ARCUS" />` : `<div class="brand-fallback">ARCUS</div>`}
      </div>
      <div>
        <span class="brief-kicker">Path 01 / New Territory</span>
        <h1>Territory Briefing: ${escapeHtml(province)}</h1>
        <p>Province-level professional screening for ${escapeHtml(contextLabel)}. Built on ARCUS' systematic Italian bridge-collapse evidence base; full analytical detail is provided in the full PDF and exports.</p>
      </div>
      <div class="brief-meta">
        <div><span>Report ID</span><strong>${escapeHtml(reportId)}</strong></div>
        <div><span>Context</span><strong>${escapeHtml(contextLabel)}</strong></div>
        <div><span>Driver</span><strong>${escapeHtml(displayDriver)}</strong></div>
        <div><span>Date</span><strong>${new Date().toISOString().slice(0, 10)}</strong></div>
      </div>
    </header>
    <section class="brief-top">
      <article class="brief-panel brief-map">
        <h2><span>01</span>ARCUS Cases Map</h2>
        <figure class="map-frame"><img src="${escapeHtml(imageRelative)}" alt="ARCUS Atlas map extract - ${escapeHtml(province)}" /></figure>
        ${mapLegend}
        <p class="brief-map-note">${escapeHtml(mapNote)}</p>
      </article>
      <article class="brief-panel brief-signal">
        <h2><span>02</span>Executive Signal</h2>
        <strong>${escapeHtml(displayDriver)} / ${escapeHtml(contextLabel)}</strong>
        <p>${escapeHtml(signalSentence)}</p>
        <div class="brief-kpi-grid">
          <div class="brief-kpi"><span>Priority Index</span><strong>${Math.round(priorityIndex)}</strong></div>
          <div class="brief-kpi"><span>Collapse Rate</span><strong>${escapeHtml(collapseRateMultiplier)}</strong></div>
          <div class="brief-kpi"><span>Denominator confidence</span><strong>${escapeHtml(collapseRateConfidence)}</strong></div>
          <div class="brief-kpi"><span>Historical Events</span><strong>${events.length}</strong></div>
        </div>
        ${hazardBars(focus, exposureProfile)}
      </article>
    </section>
    <section class="brief-bottom">
      <article class="brief-box">
        <span>3 Key Findings</span>
        <h3>Why It Matters</h3>
        <p class="brief-case-note">P1-P3 are the highest-priority ARCUS cases within the selected province and help explain the dominant territorial signal. ${priorityTriggerNote ? escapeHtml(priorityTriggerNote) : ""}</p>
        <ul>${listItems(topFindings)}</ul>
      </article>
      <article class="brief-box">
        <span>Checks</span>
        <h3>What To Check</h3>
        <ol>${listItems(nextChecks)}</ol>
      </article>
      <article class="brief-box brief-limit brief-data">
        <span>Data to Request</span>
        <h3>Before Decisions</h3>
        <ul>${listItems(briefDataToRequest)}</ul>
        <p class="brief-limit-note">${escapeHtml(shortLimitations.join(" "))}</p>
      </article>
    </section>
    <footer class="brief-export">
      <span><strong>Export package</strong>: Full PDF / events CSV / sources CSV / GeoJSON</span>
      <span>ARCUS Professional / Path 01</span>
    </footer>
  </main>
</body>
</html>`;
}

async function renderPdf(page, htmlPath, pdfPath) {
  await page.goto(`file://${htmlPath.replaceAll("\\", "/")}`, {
    waitUntil: "networkidle",
  });
  await page.pdf({
    displayHeaderFooter: false,
    format: "A4",
    margin: {
      bottom: "14mm",
      left: "14mm",
      right: "14mm",
      top: "14mm",
    },
    path: pdfPath,
    printBackground: true,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const province = String(args.province || "Torino");
  const projectContext = String(args.context || "bridge");
  const eventsPath = path.join(
    root,
    "public",
    "data",
    "processed",
    "events.json"
  );
  const sourcesPath = path.join(
    root,
    "public",
    "data",
    "processed",
    "sources.json"
  );
  const allEvents = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  const allSources = JSON.parse(fs.readFileSync(sourcesPath, "utf8"));
  const hazardExposurePreview = loadHazardExposurePreview();
  const ainopBridgeIndex = loadAinopBridgeIndex();
  const events = allEvents.filter(
    (event) =>
      normalizeText(event.province) === normalizeText(province)
  );

  if (!events.length) {
    throw new Error(`No ARCUS events found for province: ${province}`);
  }

  const eventIds = new Set(events.map((event) => event.event_id));
  const sources = allSources.filter((source) =>
    eventIds.has(source.event_id)
  );
  const dominantCause =
    countBy(events, "specific_cause")[0]?.[0] || "Unclassified";
  const exposureProfile = hazardExposurePreview?.provinces?.find(
    (profile) =>
      normalizeText(profile.province) === normalizeText(province)
  );
  const priorityEvents = makePriorityEvents(events, dominantCause);
  const priorityMunicipalities = [
    ...new Set(
      priorityEvents
        .map((event) => event.municipality)
        .filter(Boolean)
    ),
  ];
  const focus = getProjectContextRecommendations({
    dominantCause,
    exposureProfile,
    priorityMunicipalities,
    projectContext,
    provinceName: province,
  });
  const eventsWithRefs = events.map((event) => ({
    ...event,
    map_ref:
      priorityEvents.find(
        (priorityEvent) => priorityEvent.event_id === event.event_id
      )?.map_ref || "",
  }));
  const slug = `${slugify(province)}-${slugify(projectContext)}`;
  const outputDir = path.join(root, "exports", "path01", slug);
  const mapPath = path.join(outputDir, "atlas-map.png");
  const fullHtmlPath = path.join(outputDir, "arcus-path01-full-report.html");
  const fullPdfPath = path.join(outputDir, "arcus-path01-full-report.pdf");
  const legacyHtmlPath = path.join(outputDir, "arcus-path01-report.html");
  const legacyPdfPath = path.join(outputDir, "arcus-path01-report.pdf");
  const briefHtmlPath = path.join(outputDir, "arcus-path01-one-page-brief.html");
  const briefPdfPath = path.join(outputDir, "arcus-path01-one-page-brief.pdf");
  const eventsCsvPath = path.join(outputDir, "arcus-path01-events.csv");
  const sourcesCsvPath = path.join(outputDir, "arcus-path01-sources.csv");
  const geoJsonPath = path.join(outputDir, "arcus-path01-events.geojson");
  const packageManifestPath = path.join(outputDir, "arcus-path01-package.json");
  const reportId = `ARCUS-P01-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${slugify(province)}`;
  const logoDataUri = loadLogoDataUri();

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  writeCsv(
    eventsCsvPath,
    [
      "map_ref",
      "event_id",
      "date",
      "municipality",
      "province",
      "region",
      "latitude",
      "longitude",
      "collapse_severity",
      "triggered",
      "specific_cause",
      "source_confidence",
      "structural_type",
      "material_type",
      "description",
    ],
    eventsWithRefs
  );
  writeCsv(
    sourcesCsvPath,
    [
      "source_id",
      "event_id",
      "source_title",
      "source_type",
      "source_role",
      "publication_date",
      "source_url",
      "notes",
    ],
    sources
  );
  writeGeoJson(geoJsonPath, eventsWithRefs);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: {
      height: 760,
      width: 900,
    },
  });
  const mapUrl = `${args.baseUrl}/professional/atlas-export/path01?province=${encodeURIComponent(province)}&context=${encodeURIComponent(projectContext)}&clean=1`;

  await page.goto(mapUrl, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".atlas-map-export-ready", {
    timeout: 30000,
  });
  await page.locator(".atlas-map-export").screenshot({
    path: mapPath,
  });

  fs.writeFileSync(
    fullHtmlPath,
    buildFullReportHtml({
      ainopBridgeIndex,
      dominantCause,
      events,
      exposureProfile,
      focus,
      logoDataUri,
      mapImagePath: mapPath,
      outputDir,
      priorityEvents,
      province,
      reportId,
      sources,
      projectContext,
    }),
    "utf8"
  );
  fs.writeFileSync(
    briefHtmlPath,
    buildBriefHtml({
      ainopBridgeIndex,
      events,
      exposureProfile,
      focus,
      logoDataUri,
      mapImagePath: mapPath,
      outputDir,
      priorityEvents,
      province,
      reportId,
      sources,
      projectContext,
    }),
    "utf8"
  );

  await renderPdf(page, fullHtmlPath, fullPdfPath);
  fs.copyFileSync(fullHtmlPath, legacyHtmlPath);
  fs.copyFileSync(fullPdfPath, legacyPdfPath);
  await renderPdf(page, briefHtmlPath, briefPdfPath);
  await browser.close();

  const manifest = {
    generated_at: new Date().toISOString(),
    outputs: {
      events_csv: eventsCsvPath,
      full_pdf: fullPdfPath,
      geojson: geoJsonPath,
      map_png: mapPath,
      one_page_pdf: briefPdfPath,
      sources_csv: sourcesCsvPath,
    },
    path: "Path 01 / New Territory",
    dominant_exposure: focus.dominantExposureLabel,
    exposure_score: focus.exposureScore,
    project_context: contextLabels[projectContext] || contextLabels.bridge,
    province,
    report_id: reportId,
  };

  fs.writeFileSync(
    packageManifestPath,
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
