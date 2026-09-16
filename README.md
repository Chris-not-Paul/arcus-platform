# ARCUS

ARCUS is a versioned, source-linked research infrastructure for documented
bridge-collapse events in Italy. The public product includes the Atlas, Open
Analytics, methodology and the complete citable Open release.

## Local development

Requirements: Node.js 22.12 or newer.

```text
npm install
npm run dev
```

The development profile starts the Vite frontend and the local ARCUS API. To
open the development site from another device on the same network, use
`npm run dev:lan`.

## ARCUS Open production build

```text
npm run build:open
```

The deployable site is written to `dist`. The Open profile:

- publishes only the public research surface;
- disables accounts and Professional routes;
- uses the immutable static Open release when no API is available;
- directs expert contributions to `contribute@arcusbridges.org`;
- includes SPA routing, security headers, sitemap and canonical metadata.

Use `npm run build:open` as the hosting build command and `dist` as the output
directory. The canonical production host is `https://www.arcusbridges.org`.

## Release validation

```text
npm run test:open-release
npm run test:open-production
npm run test:atlas-ui
npm run test:analytics-ui
npm run lint
```

For acceptance against an already running Open preview at port 4175:

```text
npm run preview -- --host 127.0.0.1 --port 4175
npm run test:open-production-ui
```

See `docs/ARCUS_OPEN_RELEASE_READINESS.md` for the release boundary and the
remaining non-code launch gates.

## Data boundary

The repository contains the public Open release required by the static site.
Authentication stores, editorial submissions, expert feedback, client data,
backups and other operational material belong under ignored private storage and
must never be added to the public build.
