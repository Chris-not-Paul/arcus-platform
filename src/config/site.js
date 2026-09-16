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

export const isOpenRelease = releaseChannel === "open";
export const accountsEnabled = enabled(
  "VITE_ARCUS_ENABLE_ACCOUNTS",
  !isOpenRelease
);
export const contributionFormEnabled = enabled(
  "VITE_ARCUS_ENABLE_CONTRIBUTION_FORM",
  !isOpenRelease
);
export const professionalEnabled = enabled(
  "VITE_ARCUS_ENABLE_PROFESSIONAL",
  !isOpenRelease
);

export const contactAddresses = Object.freeze({
  general: "info@arcusbridges.org",
  research: "research@arcusbridges.org",
  contributions: "contribute@arcusbridges.org",
  privacy: "privacy@arcusbridges.org",
});
