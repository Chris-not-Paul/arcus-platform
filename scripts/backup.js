import {
  applyBackupRetention,
  createBackup,
  verifyBackup,
} from "../server/backupService.js";
import { closeDatabase } from "../server/database.js";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  if (directIndex >= 0) {
    return process.argv[directIndex + 1] || fallback;
  }

  return fallback;
}

const destination = argValue("destination");
const label = argValue("label", "manual");

try {
  const backup = await createBackup({
    destination: destination || undefined,
    label,
  });
  const verification = await verifyBackup(backup.backupPath);
  const retention = await applyBackupRetention({
    destination: destination || undefined,
  });

  console.log(
    JSON.stringify({
      backupPath: backup.backupPath,
      deletedByRetention: retention.deleted,
      id: backup.manifest.id,
      ok: verification.ok,
      storage: backup.manifest.storage,
    })
  );
} finally {
  await closeDatabase();
}
