import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { FileBlob, SpreadsheetFile } from "file:///C:/Users/W12-OPERATOR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const file = path.resolve("private-data/raw/MASTER_RESEARCH.xlsx");
const output = path.resolve("tmp/evidence-review-2026-10-19");
await fs.mkdir(output, { recursive: true });
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const events = wb.worksheets.getItem("EVENTS");
const qa = wb.worksheets.getItem("QA_SUMMARY");
if (!process.argv.includes("--apply")) {
  for (const [sheetName, range, name] of [["EVENTS", "W2:AD9", "events"], ["QA_SUMMARY", "A10:B14", "summary"]]) {
    const preview = await wb.render({ sheetName, range, scale: 1.5, format: "png" });
    await fs.writeFile(path.join(output, `${name}-before.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  console.log("Read-only previews exported; inspect before --apply.");
} else {
  const plan = JSON.parse(await fs.readFile("config/curation/evidence-review-2026-10-19.json", "utf8"));
  const rows = events.getRange("A2:AI2000").values;
  const sources = wb.worksheets.getItem("SOURCES").getRange("A2:M5000").values;
  const log = wb.worksheets.getItem("CURATION_LOG");
  const existingLog = log.getRange("A1:H5000").values;
  assert.equal(rows.filter((r) => r[0]).length, 260);
  assert.deepEqual(rows.filter((r) => r[26] === "Unspecified").map((r) => r[0]).sort(), plan.decisions.map((d) => d.id).sort());
  assert.equal(existingLog.findLastIndex((r) => r.some((v) => v !== null && v !== "")), 2216);
  await fs.copyFile(file, path.join(output, "MASTER_RESEARCH-before.xlsx"));
  const logRows = [];
  for (const d of plan.decisions) {
    const index = rows.findIndex((r) => r[0] === d.id);
    const source = sources.find((r) => r[0] === d.source && r[1] === d.id);
    assert.ok(source?.[5], `Missing matched source ${d.source}`);
    assert.equal(rows[index][26], "Unspecified");
    events.getRange(`AA${index + 2}`).values = [[d.level]];
    logRows.push([plan.date, d.id, "failure_cause_evidence", "Unspecified", d.level, d.level, source[5], `${d.reason} Source: ${d.source}. ${plan.scope}`]);
  }
  log.getRange("A2218:H2244").values = logRows;
  const counts = {};
  for (const r of events.getRange("A2:AI2000").values.filter((r) => r[0])) counts[r[26]] = (counts[r[26]] || 0) + 1;
  qa.getRange("B2").values = [[plan.date]];
  qa.getRange("B11:B14").values = ["Documented", "Probable", "Needs review", "Unspecified"].map((x) => [counts[x] || 0]);
  qa.getRange("A16").values = [["Evidence levels refer to the recorded cause/process, not certainty of every attribute. A documented broad flood attribution does not establish a detailed hydraulic mechanism. Needs review identifies unresolved event-to-source matches or causal attributions; unknown cause/process values are preserved."]];
  wb.recalculate();
  console.log((await wb.inspect({ kind: "table", range: "QA_SUMMARY!A10:B14", include: "values,formulas", tableMaxRows: 5, tableMaxCols: 2 })).ndjson);
  const errors = await wb.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 30 }, summary: "Evidence edit formula error check", maxChars: 800 });
  console.log(errors.ndjson);
  for (const [sheetName, range, name] of [["EVENTS", "W2:AD9", "events"], ["QA_SUMMARY", "A10:B14", "summary"]]) {
    const preview = await wb.render({ sheetName, range, scale: 1.5, format: "png" });
    await fs.writeFile(path.join(output, `${name}-after.png`), new Uint8Array(await preview.arrayBuffer()));
  }
  await (await SpreadsheetFile.exportXlsx(wb)).save(file);
  console.log(JSON.stringify({ edited: plan.decisions.length, counts, logRows: logRows.length }));
}
