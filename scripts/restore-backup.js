import {
  restoreBackup,
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

const backupPath = argValue("backup");
const confirm = process.argv.includes("--confirm-restore");
const verifyOnly = process.argv.includes("--verify-only");

if (!backupPath) {
  console.error(
    "Usage: node scripts/restore-backup.js --backup=<path> [--verify-only|--confirm-restore]"
  );
  process.exitCode = 1;
} else {
  try {
    if (verifyOnly) {
      const verification = await verifyBackup(backupPath);

      console.log(
        JSON.stringify({
          failures: verification.failures,
          id: verification.manifest.id,
          ok: verification.ok,
          storage: verification.manifest.storage,
        })
      );
    } else {
      const restored = await restoreBackup(backupPath, {
        confirm,
      });

      console.log(
        JSON.stringify({
          id: restored.manifest.id,
          restored: restored.restored,
          storage: restored.manifest.storage,
        })
      );
    }
  } finally {
    await closeDatabase();
  }
}
