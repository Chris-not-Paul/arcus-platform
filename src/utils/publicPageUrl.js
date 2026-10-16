// Netlify serves the prerendered directory pages with a trailing slash.
// Keep crawler metadata and sitemap URLs aligned with that HTTP 200 target.
export function canonicalPagePath(pathname = '/') {
  return `${String(pathname).replace(/\/+$/, '')}/`;
}

export function canonicalPageUrl(origin, pathname = '/') {
  return `${String(origin).replace(/\/+$/, '')}${canonicalPagePath(pathname)}`;
}
