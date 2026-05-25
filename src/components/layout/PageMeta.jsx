import { useEffect } from "react";

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

export default function PageMeta({
  description,
  title,
}) {
  useEffect(() => {
    const fullTitle =
      title === "ARCUS"
        ? "ARCUS Atlas"
        : `${title} | ARCUS Atlas`;

    document.title = fullTitle;

    setMeta("description", description);
    setMeta("theme-color", "#120f0d");
    setProperty("og:title", fullTitle);
    setProperty("og:description", description);
    setProperty("og:type", "website");
    setProperty("og:site_name", "ARCUS Atlas");
  }, [description, title]);

  return null;
}
