import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { siteOrigin } from "../../config/site";

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
  title,
}) {
  const location = useLocation();

  useEffect(() => {
    const fullTitle =
      title === "ARCUS"
        ? "ARCUS Atlas"
        : `${title} | ARCUS Atlas`;

    document.title = fullTitle;

    setMeta("description", description);
    const canonicalPath = location.pathname === "/"
      ? "/"
      : location.pathname.replace(/\/$/, "");
    const canonicalUrl = `${siteOrigin}${canonicalPath}`;

    setMeta("theme-color", "#f2f0eb");
    setMeta("robots", noIndex ? "noindex, nofollow" : "index, follow");
    setMeta("twitter:card", "summary");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setProperty("og:title", fullTitle);
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "ARCUS Atlas");
    setProperty("og:url", canonicalUrl);
    setProperty("og:locale", document.documentElement.lang === "it" ? "it_IT" : "en_GB");
    setLink("canonical", canonicalUrl);
  }, [description, location.pathname, noIndex, title]);

  return null;
}
