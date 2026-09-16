import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { validateContribution } from "../server/contributionStore.js";

const valid = validateContribution({
  contributionTypes: ["new_source", "new_source"],
  email: "Expert@Example.org",
  eventId: "IT20.01.01",
  evidenceBasis: "published_source",
  name: "Expert Name",
  sources: ["https://example.org/report"],
  summary: "Documented information supported by the linked primary technical report.",
  targetType: "existing_event",
  termsAccepted: true,
});

assert.equal(valid.email, "expert@example.org");
assert.deepEqual(valid.contributionTypes, ["new_source"]);

assert.throws(() => validateContribution({ ...valid, eventId: "B01" }), /valid_event_id_required/);
assert.throws(() => validateContribution({ ...valid, sources: ["javascript:alert(1)"] }), /invalid_source_url/);
assert.throws(() => validateContribution({ ...valid, termsAccepted: false }), /contribution_terms_required/);
assert.throws(() => validateContribution({ ...valid, website: "spam" }), /contribution_rejected/);
assert.throws(
  () => validateContribution({ ...valid, sourceAvailability: "offline_document" }),
  /offline_document_metadata_required/
);
const offline = validateContribution({
  ...valid,
  documentSource: {
    accessBasis: "inspection_on_request",
    documentType: "technical_report",
    issuer: "Technical authority",
    title: "Non-digitised assessment",
  },
  sourceAvailability: "offline_document",
  sources: [],
  termsAccepted: true,
});
assert.equal(offline.documentSource.accessBasis, "inspection_on_request");

const page = await fs.readFile(new URL("../src/pages/ContributePage.jsx", import.meta.url), "utf8");
const server = await fs.readFile(new URL("../server/server.js", import.meta.url), "utf8");
const analytics = await fs.readFile(new URL("../src/pages/AnalyticsPage.jsx", import.meta.url), "utf8");

assert.match(page, /nessun contenuto viene pubblicato automaticamente/i);
assert.match(page, /creditLine/);
assert.match(page, /rightsBasis/);
assert.match(page, /Documento non disponibile online/);
assert.match(page, /Riconoscimento pubblico solo dopo accettazione e consenso/);
assert.match(page, /SEGUI LA PROPOSTA/);
assert.match(server, /\/api\/contributions/);
assert.match(server, /\/api\/admin\/contributions/);
assert.match(analytics, /<rect fill="#ffffff" height=\{height\} width=\{width\} \/>/);

console.log("Expert contribution workflow tests passed.");
