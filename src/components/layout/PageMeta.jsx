import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { siteOrigin } from "../../config/site";

const socialImageUrl = `${siteOrigin}/arcus-social-card.png`;
const socialImageAlt = "ARCUS — Bridge Failure Research";

function setMeta(name, content) {
  let tag = document.querySelector(
    `meta[name="${name}"]`
  );

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setProperty(property, content) {
  let tag = document.querySelector(
    `meta[property="${property}"]`
  );

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setLink(rel, href) {
  let tag = document.querySelector(`link[rel="${rel}"]`);

  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute("href", href);
}

export default function PageMeta({
  description,
  noIndex = false,
  structuredData = null,
  title,
}) {
  const location = useLocation();
  const structuredDataJson = structuredData
    ? JSON.stringify(structuredData)
    : "";

  useEffect(() => {
    const fullTitle =
      title === "ARCUS"
        ? "ARCUS"
        : `${title} | ARCUS`;

    document.title = fullTitle;

    setMeta("description", description);
    const canonicalPath = location.pathname === "/"
      ? "/"
      : location.pathname.replace(/\/$/, "");
    const canonicalUrl = `${siteOrigin}${canonicalPath}`;

    setMeta("theme-color", "#f3f0e8");
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", socialImageUrl);
    setMeta("twitter:image:alt", socialImageAlt);
    setProperty("og:title", fullTitle);
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "ARCUS");
    setProperty("og:url", canonicalUrl);
    setProperty("og:locale", document.documentElement.lang === "it" ? "it_IT" : "en_GB");
    setProperty("og:image", socialImageUrl);
    setProperty("og:image:secure_url", socialImageUrl);
    setProperty("og:image:type", "image/png");
    setProperty("og:image:width", "1200");
    setProperty("og:image:height", "630");
    setProperty("og:image:alt", socialImageAlt);
    setLink("canonical", canonicalUrl);

    // The build exposes a complete static schema to crawlers and no-JS users.
    // Once React takes over, replace it with the schema for the active route so
    // client-side navigation never leaves stale event metadata in the page.
    document.getElementById("arcus-static-structured-data")?.remove();

    let structuredDataTag = document.getElementById(
      "arcus-page-structured-data"
    );

    if (structuredDataJson) {
      if (!structuredDataTag) {
        structuredDataTag = document.createElement("script");
        structuredDataTag.id = "arcus-page-structured-data";
        structuredDataTag.type = "application/ld+json";
        document.head.appendChild(structuredDataTag);
      }
      structuredDataTag.textContent = structuredDataJson;
    } else if (structuredDataTag) {
      structuredDataTag.remove();
    }
  }, [description, location.pathname, noIndex, structuredDataJson, title]);

  return null;
}
