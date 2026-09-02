export function researchEventId(event) {
  return event?.research_event_id || event?.event_id || null;
}
