import { runDatabaseMigrations } from "../server/database.js";

const result = await runDatabaseMigrations();

console.log(
  `ARCUS storage: ${result.storage}; migrations applied: ${result.migrated.join(", ") || "none"}`
);
