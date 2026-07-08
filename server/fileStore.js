import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  const content = `${JSON.stringify(payload, null, 2)}\n`;

  await fs.writeFile(temporaryPath, content, "utf8");

  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    if (!["EBUSY", "EEXIST", "EPERM"].includes(error.code)) {
      throw error;
    }

    await fs.rm(filePath, { force: true });
    await fs.rename(temporaryPath, filePath);
  }
}
