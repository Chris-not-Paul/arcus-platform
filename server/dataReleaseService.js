import { publicReleaseEndYear } from "./config.js";
import { getProfessionalResource } from "./dataService.js";

const fallbackRelease = Object.freeze({
  generatedAt: null,
  id: "arcus-professional-current",
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
      generatedAt: release.generated_at || release.generatedAt || null,
      id: release.id || fallbackRelease.id,
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
