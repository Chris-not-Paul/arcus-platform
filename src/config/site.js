const releaseChannel = String(
  import.meta.env.VITE_ARCUS_RELEASE_CHANNEL || "platform"
).trim().toLowerCase();

function enabled(name, defaultValue) {
  const value = import.meta.env[name];
  if (value === undefined || value === "") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
}

export const siteOrigin = String(
  import.meta.env.VITE_ARCUS_SITE_ORIGIN || "https://www.arcusbridges.org"
).replace(/\/$/, "");

export const isOpenRelease =
  import.meta.env.MODE === "open" || releaseChannel === "open";
export const accountsEnabled =
  !isOpenRelease &&
  enabled("VITE_ARCUS_ENABLE_ACCOUNTS", true);
export const contributionFormEnabled =
  !isOpenRelease &&
  enabled("VITE_ARCUS_ENABLE_CONTRIBUTION_FORM", true);
export const professionalEnabled =
  !isOpenRelease &&
  enabled("VITE_ARCUS_ENABLE_PROFESSIONAL", true);

export const contactAddresses = Object.freeze({
  general: "info@arcusbridges.org",
  research: "research@arcusbridges.org",
  contributions: "contribute@arcusbridges.org",
  privacy: "info@arcusbridges.org",
});
