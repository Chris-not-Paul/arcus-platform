import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  passwordResetTokensFilePath,
  passwordResetTokenTtlMinutes,
} from "./config.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getUserContext,
  setUserPassword,
} from "./userStore.js";

let cachedTokens = null;
let writeQueue = Promise.resolve();

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function normalizeResetRecord(record) {
  return {
    consumedAt: record.consumed_at?.toISOString?.() ||
      record.consumedAt ||
      null,
    createdAt: record.created_at?.toISOString?.() || record.createdAt,
    expiresAt: record.expires_at?.toISOString?.() || record.expiresAt,
    id: record.id,
    tokenHash: record.token_hash || record.tokenHash,
    userId: record.user_id || record.userId,
    username: record.username,
  };
}

async function loadResetTokens() {
  if (cachedTokens) {
    return cachedTokens;
  }

  try {
    const content = await fs.readFile(passwordResetTokensFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedTokens = parsed.tokens || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedTokens = [];
  }

  return cachedTokens;
}

async function persistResetTokens(tokens) {
  cachedTokens = tokens;
  writeQueue = writeQueue.then(() =>
    writeJsonFile(passwordResetTokensFilePath, { tokens })
  );

  return writeQueue;
}

export async function createPasswordResetToken(username) {
  const user = await getUserContext(username);

  if (!user) {
    return null;
  }

  const token = generateToken();
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + passwordResetTokenTtlMinutes * 60 * 1000
  );
  const record = {
    consumedAt: null,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    id: `reset-${crypto.randomUUID()}`,
    tokenHash: hashToken(token),
    userId: user.id,
    username: user.username,
  };

  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query(
      `INSERT INTO password_reset_tokens
        (id, user_id, username, token_hash, expires_at)
        VALUES ($1, $2, $3, $4, $5)`,
      [
        record.id,
        record.userId,
        record.username,
        record.tokenHash,
        record.expiresAt,
      ]
    );
  } else {
    const tokens = await loadResetTokens();

    await persistResetTokens([record, ...tokens]);
  }

  return {
    record: normalizeResetRecord(record),
    token,
    user,
  };
}

export async function consumePasswordResetToken({
  newPassword,
  token,
}) {
  const tokenHash = hashToken(token);

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, user_id, username, token_hash, expires_at, consumed_at, created_at
        FROM password_reset_tokens
        WHERE token_hash = $1`,
      [tokenHash]
    );
    const record = result.rows[0]
      ? normalizeResetRecord(result.rows[0])
      : null;

    if (!record || record.consumedAt ||
      new Date(record.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const user = await setUserPassword(record.username, newPassword);

    if (!user) {
      return null;
    }

    await database.query(
      `UPDATE password_reset_tokens
        SET consumed_at = NOW()
        WHERE id = $1`,
      [record.id]
    );

    return {
      record: {
        ...record,
        consumedAt: new Date().toISOString(),
      },
      user,
    };
  }

  const tokens = await loadResetTokens();
  const index = tokens.findIndex(
    (record) => record.tokenHash === tokenHash
  );
  const record = index >= 0
    ? normalizeResetRecord(tokens[index])
    : null;

  if (!record || record.consumedAt ||
    new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = await setUserPassword(record.username, newPassword);

  if (!user) {
    return null;
  }

  const updated = {
    ...tokens[index],
    consumedAt: new Date().toISOString(),
  };
  const nextTokens = [...tokens];

  nextTokens[index] = updated;
  await persistResetTokens(nextTokens);

  return {
    record: normalizeResetRecord(updated),
    user,
  };
}
