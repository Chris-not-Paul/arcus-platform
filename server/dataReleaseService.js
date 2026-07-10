import { publicReleaseEndYear } from "./config.js";
import { getProfessionalResource } from "./dataService.js";

const fallbackRelease = Object.freeze({
  generatedAt: null,
  dataCutoffDate: null,
  datasetScope: "professional",
  datasetVersion: "arcus-professional-current",
  id: "arcus-professional-current",
  includedYearMax: null,
  includedYearMin: null,
  latestEventDate: null,
  methodologyVersion: "arcus-methodology-current",
  name: "ARCUS Professional Data Release",
  publicRelease: `data-in-brief-public-2000-${publicReleaseEndYear}`,
  status: "active",
  version: "current",
});

export async function getCurrentDataRelease() {
  try {
    const release = await getProfessionalResource("data-release");

    return {
      counts: release.counts || {},
      dataCutoffDate:
        release.data_cutoff_date ||
        release.dataCutoffDate ||
        fallbackRelease.dataCutoffDate,
      datasetScope:
        release.dataset_scope ||
        release.datasetScope ||
        fallbackRelease.datasetScope,
      datasetVersion:
        release.dataset_version ||
        release.datasetVersion ||
        release.version ||
        fallbackRelease.datasetVersion,
      generatedAt: release.generated_at || release.generatedAt || null,
      id: release.id || fallbackRelease.id,
      includedYearMax:
        release.included_year_max ||
        release.includedYearMax ||
        fallbackRelease.includedYearMax,
      includedYearMin:
        release.included_year_min ||
        release.includedYearMin ||
        fallbackRelease.includedYearMin,
      latestEventDate:
        release.latest_event_date ||
        release.latestEventDate ||
        fallbackRelease.latestEventDate,
      methodologyVersion:
        release.methodology_version ||
        release.methodologyVersion ||
        release.version ||
        fallbackRelease.methodologyVersion,
      name: release.name || fallbackRelease.name,
      notes: release.notes || [],
      publicRelease: fallbackRelease.publicRelease,
      status: release.status || fallbackRelease.status,
      version: release.version || fallbackRelease.version,
    };
  } catch {
    return fallbackRelease;
  }
}
