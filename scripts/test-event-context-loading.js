import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { contextMatchesEvent, loadContextJson, loadEventContext, invalidateContextResource } from "../src/utils/eventContextResource.js";
import { localizedBridgeDisplayName, localizedEventDescription, publicRecordDescription } from "../src/utils/eventDisplayLabels.js";

const originalFetch = globalThis.fetch;
try {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ value: 1 }); };
  const [first, second] = await Promise.all([loadContextJson("/deduplicate"), loadContextJson("/deduplicate")]);
  assert.strictEqual(first, second);
  await loadContextJson("/deduplicate");
  assert.equal(calls, 1, "Concurrent and later readers share both download and parsed JSON");

  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  await assert.rejects(loadContextJson("/recover"));
  globalThis.fetch = async () => Response.json({ recovered: true });
  assert.equal((await loadContextJson("/recover")).recovered, true);

  globalThis.fetch = async () => new Response("not json");
  await assert.rejects(loadContextJson("/malformed"));
  globalThis.fetch = async () => Response.json({ recovered: true });
  assert.equal((await loadContextJson("/malformed")).recovered, true);

  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("Request timed out")), { once: true });
  });
  await assert.rejects(loadContextJson("/timeout", { timeoutMs: 5 }), /timed out/);

  let bad = true;
  globalThis.fetch = async () => Response.json(bad ? {} : { events: {} });
  await assert.rejects(loadEventContext("rainfall", "IT00.01.01"), /Invalid context catalogue/);
  bad = false;
  assert.equal(await loadEventContext("rainfall", "IT00.01.01"), null, "Valid catalogue absence is distinct from failure");
  invalidateContextResource("rainfall", "IT00.01.01");

  globalThis.fetch = async (url) => Response.json(url.endsWith("index.json")
    ? { events: { "IT00.01.01": { file: "IT00.01.01.json" } } }
    : { event_id: "IT99.01.01", status: "context_available", daily: [{}] });
  await assert.rejects(loadEventContext("rainfall", "IT00.01.01"), /Invalid event context/);

  const current = JSON.parse(await fs.readFile("private-data/open/releases/current.json", "utf8"));
  const { events } = JSON.parse(await fs.readFile(`private-data/open/releases/${current.version}/events.json`, "utf8"));
  globalThis.fetch = async (url) => Response.json(JSON.parse(await fs.readFile(`public${url}`, "utf8")));
  const counts = {};
  for (const kind of ["rainfall", "hydraulic", "territorial", "hazard-history", "media"]) {
    invalidateContextResource(kind, "IT00.01.01");
    counts[kind] = 0;
    for (const event of events) {
      const result = await loadEventContext(kind, event.event_id);
      if (result) counts[kind]++;
      if (kind === "media" && result) {
        assert.equal(
          result.every(
            (asset) =>
              asset.file &&
              ["cleared_open", "cleared_permission"].includes(asset.rights_status)
          ),
          true
        );
      }
      assert.ok(contextMatchesEvent(kind, result, event), `Context matches current event: ${kind}/${event.event_id}`);
      if (result?.event_date) assert.equal(result.event_date, event.date);
      if (kind === "hazard-history" && event.exact_location === false) assert.equal(result, null);
    }
  }
  assert.equal(counts.territorial, events.length);
  assert.equal(counts["hazard-history"], events.filter((event) => event.exact_location).length);
  assert.equal(counts.media, 15, "Only events with publishable images reach the Atlas media surface");
  assert.equal(localizedBridgeDisplayName({ bridge_name: "Barberino bridge" }, "it"), "Ponte di Barberino");
  assert.equal(localizedBridgeDisplayName({ bridge_name: "Barberino bridge" }, "en"), "Barberino bridge");
  assert.equal(publicRecordDescription("Vedi B00.10.22 e IT20.10.18."), "Vedi IT00.10.22 e IT20.10.18.");
  assert.equal(
    localizedEventDescription({
      bridge_name: "Ponte di prova",
      collapse_severity: "TC",
      component_involved: "Pier / foundation",
      date: "2020-04-08",
      failure_cause_evidence: "Documented",
      failure_process: "Scour",
      failure_trigger: "Flood",
      injuries: 1,
      municipality: "Aulla",
      province: "Massa-Carrara",
      specific_cause: "Hydraulic",
      victims: 0,
    }, "it"),
    "In data 8 aprile 2020, nel territorio di Aulla (provincia di Massa-Carrara), si è verificato un crollo totale che ha interessato l’opera «Ponte di prova». La causa è classificata come idraulica. Il record identifica come evento innescante una piena. Il processo osservato è scalzamento. La componente coinvolta è una pila o la fondazione. Il record riporta 0 vittime e 1 ferito. L’attribuzione causale è documentata."
  );
  assert.equal(contextMatchesEvent("rainfall", { event_date: "2020-10-03", requested_location: { latitude: 45, longitude: 8 } }, { date: "2020-10-03", latitude: 45, longitude: 9 }), false);
  assert.equal(contextMatchesEvent("hydraulic", { event_date: "2000-01-01" }, { date: "2020-01-01" }), false);
  console.log("Context loading: cache, retry, timeout, malformed/absent/incorrect identity and full catalogue passed", counts);
} finally {
  globalThis.fetch = originalFetch;
}
