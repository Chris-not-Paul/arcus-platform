import fs from "node:fs/promises";
import path from "node:path";

const testRoot = path.resolve(
  ".tmp",
  `backup-suite-${Date.now()}`
);
const privateData = path.join(testRoot, "private-data");
const backupRoot = path.join(testRoot, "backups");

process.env.ARCUS_PRIVATE_DATA_DIR = privateData;
process.env.ARCUS_BACKUP_DIR = backupRoot;
process.env.ARCUS_BACKUP_RETENTION_COUNT = "2";
process.env.ARCUS_BACKUP_RETENTION_DAYS = "30";

const {
  applyBackupRetention,
  createBackup,
  restoreBackup,
  verifyBackup,
} = await import("../server/backupService.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await fs.mkdir(path.join(privateData, "auth"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(privateData, "auth", "users.json"),
    `${JSON.stringify(
      {
        users: [
          {
            id: "user-1",
            role: "professional",
            username: "backup@example.test",
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await fs.mkdir(path.join(privateData, "processed"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(privateData, "processed", "events.json"),
    "[{\"event_id\":\"BKP.00.01\"}]\n",
    "utf8"
  );

  const backup = await createBackup({
    label: "suite",
  });
  const verification = await verifyBackup(backup.backupPath);

  assert(verification.ok, "backup checksum verification failed");
  assert(
    verification.manifest.storage === "file",
    "backup did not use file storage"
  );
  assert(
    verification.manifest.files.some((file) =>
      file.path.endsWith("auth/users.json")
    ),
    "backup did not include auth users"
  );

  await fs.writeFile(
    path.join(privateData, "auth", "users.json"),
    "{\"users\":[]}\n",
    "utf8"
  );

  const restored = await restoreBackup(backup.backupPath, {
    confirm: true,
  });
  const restoredUsers = await fs.readFile(
    path.join(privateData, "auth", "users.json"),
    "utf8"
  );

  assert(restored.restored === true, "restore did not complete");
  assert(
    restoredUsers.includes("backup@example.test"),
    "restore did not recover original user file"
  );

  await createBackup({ label: "suite-second" });
  await createBackup({ label: "suite-third" });
  const retention = await applyBackupRetention();

  assert(
    retention.kept.length <= 2,
    "backup retention kept too many backups"
  );
  assert(
    retention.deleted.length >= 1,
    "backup retention did not delete old backups"
  );

  console.log(
    JSON.stringify({
      ok: true,
      checks: [
        "file-backup",
        "checksum-verification",
        "file-restore",
        "backup-retention",
      ],
    })
  );
} finally {
  await fs.rm(testRoot, {
    force: true,
    recursive: true,
  });
}
