import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  authDataDir,
  professionalPassword,
  professionalUsername,
  usersFilePath,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";
import {
  ensureDefaultOrganization,
  getOrganizationAccount,
  organizationIsActive,
} from "./organizationService.js";

const hashAlgorithm = "sha512";
const hashIterations = 210000;
const hashKeyLength = 64;
let cachedUsers = null;

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(
      String(password),
      salt,
      hashIterations,
      hashKeyLength,
      hashAlgorithm
    )
    .toString("hex");
}

function createPasswordRecord(password) {
  const salt =
    crypto.randomBytes(24).toString("hex");

  return {
    algorithm: "pbkdf2",
    hash: hashPassword(password, salt),
    iterations: hashIterations,
    keyLength: hashKeyLength,
    digest: hashAlgorithm,
    salt,
  };
}

export function buildPasswordRecord(password) {
  return createPasswordRecord(password);
}

function verifyPassword(password, passwordRecord) {
  if (!passwordRecord?.hash || !passwordRecord?.salt) {
    return false;
  }

  const attempted = crypto
    .pbkdf2Sync(
      String(password),
      passwordRecord.salt,
      passwordRecord.iterations || hashIterations,
      passwordRecord.keyLength || hashKeyLength,
      passwordRecord.digest || hashAlgorithm
    )
    .toString("hex");
  const expected = Buffer.from(
    passwordRecord.hash,
    "hex"
  );
  const received = Buffer.from(attempted, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

async function writeInitialUsersFile() {
  await fs.mkdir(authDataDir, {
    recursive: true,
  });

  const users = [
    {
      createdAt: new Date().toISOString(),
      id: "local-professional",
      password: createPasswordRecord(
        professionalPassword
      ),
      role: "professional",
      username: professionalUsername,
    },
  ];

  await fs.writeFile(
    usersFilePath,
    `${JSON.stringify({ users }, null, 2)}\n`,
    "utf8"
  );

  return users;
}

async function ensureInitialDatabaseUser() {
  const database = await getDatabase();
  const organization = await ensureDefaultOrganization();
  const existing = await database.query(
    "SELECT id, username, role, disabled, organization_id FROM users WHERE username = $1",
    [professionalUsername]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const user = {
    id: "local-professional",
    password: createPasswordRecord(professionalPassword),
    role: "professional",
    username: professionalUsername,
  };

  await database.query(
    `INSERT INTO users
      (id, organization_id, username, role, password)
      VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      user.id,
      organization.id,
      user.username,
      user.role,
      JSON.stringify(user.password),
    ]
  );

  return {
    ...user,
    disabled: false,
    organization_id: organization.id,
  };
}

async function persistUsers(users) {
  await fs.mkdir(authDataDir, {
    recursive: true,
  });

  await writeJsonFile(usersFilePath, { users });
  cachedUsers = users;
}

export async function loadUsers() {
  if (isDatabaseEnabled()) {
    await ensureInitialDatabaseUser();
    const database = await getDatabase();
    const result = await database.query(
      "SELECT id, organization_id, username, role, password, disabled, created_at, updated_at FROM users ORDER BY created_at ASC"
    );

    return result.rows.map((row) => ({
      ...row,
      createdAt: row.created_at?.toISOString(),
      organizationId: row.organization_id,
      updatedAt: row.updated_at?.toISOString(),
    }));
  }

  if (cachedUsers) {
    return cachedUsers;
  }

  try {
    const content = await fs.readFile(
      usersFilePath,
      "utf8"
    );
    const parsed = JSON.parse(content);

    cachedUsers = parsed.users || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedUsers = await writeInitialUsersFile();
  }

  return cachedUsers;
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validatePublicRegistration({ password, username }) {
  const normalizedUsername = normalizeUsername(username);

  if (
    !normalizedUsername ||
    normalizedUsername.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUsername)
  ) {
    const error = new Error("valid_email_required");

    error.statusCode = 400;
    throw error;
  }

  validatePasswordPolicy(password);

  return {
    password: String(password),
    username: normalizedUsername,
  };
}

function validatePasswordPolicy(password) {
  if (String(password || "").length < 8) {
    const error = new Error("password_too_short");

    error.statusCode = 400;
    throw error;
  }
}

export async function verifyUserCredentials({
  password,
  username,
}) {
  const users = await loadUsers();
  const user = users.find(
    (item) =>
      String(item.username).toLowerCase() ===
      String(username || "").toLowerCase()
  );

  if (!user || user.disabled) {
    return null;
  }

  if (!verifyPassword(password, user.password)) {
    return null;
  }

  const organization = isDatabaseEnabled()
    ? await getUserOrganization(user.organizationId)
    : await ensureDefaultOrganization();

  if (!organizationIsActive(organization)) {
    return null;
  }

  return {
    exportLimit: organization.exportLimit,
    id: user.id,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationPlan: organization.plan,
    organizationStatus: organization.status,
    role: user.role || "professional",
    username: user.username,
  };
}

export async function createFreeUser({ password, username }) {
  const registration = validatePublicRegistration({
    password,
    username,
  });
  const users = await loadUsers();
  const existing = users.find(
    (user) =>
      String(user.username).toLowerCase() ===
      registration.username
  );

  if (existing) {
    const error = new Error("account_already_exists");

    error.statusCode = 409;
    throw error;
  }

  const passwordRecord = createPasswordRecord(registration.password);

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const organization = await ensureDefaultOrganization();
    const id = `user-${crypto.randomUUID()}`;
    const result = await database.query(
      `INSERT INTO users
        (id, organization_id, username, role, password, disabled)
        VALUES ($1, $2, $3, 'free', $4::jsonb, FALSE)
        RETURNING id, username, role`,
      [
        id,
        organization.id,
        registration.username,
        JSON.stringify(passwordRecord),
      ]
    );

    return {
      ...result.rows[0],
      organizationId: organization.id,
      organizationName: organization.name,
      organizationPlan: organization.plan,
      organizationStatus: organization.status,
    };
  }

  const organization = await ensureDefaultOrganization();
  const user = {
    createdAt: new Date().toISOString(),
    id: `user-${crypto.randomUUID()}`,
    password: passwordRecord,
    role: "free",
    updatedAt: new Date().toISOString(),
    username: registration.username,
  };

  await persistUsers([...users, user]);

  return {
    id: user.id,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationPlan: organization.plan,
    organizationStatus: organization.status,
    role: user.role,
    username: user.username,
  };
}

export async function isUserActive(username) {
  return Boolean(await getUserContext(username));
}

export async function getUserContext(username) {
  const users = await loadUsers();
  const user = users.find(
    (item) =>
      String(item.username).toLowerCase() ===
      String(username || "").toLowerCase()
  );

  if (!user || user.disabled) {
    return null;
  }

  const organization = isDatabaseEnabled()
    ? await getUserOrganization(user.organizationId)
    : await ensureDefaultOrganization();

  if (!organizationIsActive(organization)) {
    return null;
  }

  return {
    exportLimit: organization.exportLimit,
    id: user.id,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationPlan: organization.plan,
    organizationStatus: organization.status,
    role: user.role || "professional",
    username: user.username,
  };
}

export async function listUsersForAdmin() {
  const users = await loadUsers();

  return users.map((user) => ({
    createdAt: user.createdAt,
    disabled: Boolean(user.disabled),
    id: user.id,
    organizationId: user.organizationId || "org-local-arcus",
    role: user.role || "professional",
    updatedAt: user.updatedAt || null,
    username: user.username,
  }));
}

export async function setUserDisabled(username, disabled) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `UPDATE users
        SET disabled = $2, updated_at = NOW()
        WHERE LOWER(username) = LOWER($1)
        RETURNING username, role, disabled`,
      [username, Boolean(disabled)]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      disabled: result.rows[0].disabled,
      role: result.rows[0].role || "professional",
      username: result.rows[0].username,
    };
  }

  const users = await loadUsers();
  const index = users.findIndex(
    (user) =>
      String(user.username).toLowerCase() ===
      String(username || "").toLowerCase()
  );

  if (index === -1) {
    return null;
  }

  const updatedUser = {
    ...users[index],
    disabled: Boolean(disabled),
    updatedAt: new Date().toISOString(),
  };
  const nextUsers = [...users];

  nextUsers[index] = updatedUser;
  await persistUsers(nextUsers);

  return {
    disabled: updatedUser.disabled,
    role: updatedUser.role || "professional",
    username: updatedUser.username,
  };
}

export async function promoteUserToProfessional(username) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `UPDATE users
        SET role = 'professional',
            disabled = FALSE,
            updated_at = NOW()
        WHERE LOWER(username) = LOWER($1)
        RETURNING id, username, role, disabled, updated_at`,
      [normalizedUsername]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      disabled: result.rows[0].disabled,
      id: result.rows[0].id,
      role: result.rows[0].role,
      updatedAt: result.rows[0].updated_at?.toISOString(),
      username: result.rows[0].username,
    };
  }

  const users = await loadUsers();
  const index = users.findIndex(
    (user) =>
      String(user.username).toLowerCase() === normalizedUsername
  );

  if (index === -1) {
    return null;
  }

  const updatedUser = {
    ...users[index],
    disabled: false,
    role: "professional",
    updatedAt: new Date().toISOString(),
  };
  const nextUsers = [...users];

  nextUsers[index] = updatedUser;
  await persistUsers(nextUsers);

  return {
    disabled: false,
    id: updatedUser.id,
    role: updatedUser.role,
    updatedAt: updatedUser.updatedAt,
    username: updatedUser.username,
  };
}

export async function changeUserPassword({
  currentPassword,
  newPassword,
  username,
}) {
  const normalizedUsername = normalizeUsername(username);

  validatePasswordPolicy(newPassword);

  if (!normalizedUsername) {
    return null;
  }

  const users = await loadUsers();
  const user = users.find(
    (item) =>
      String(item.username).toLowerCase() === normalizedUsername
  );

  if (!user || user.disabled) {
    return null;
  }

  if (!verifyPassword(currentPassword, user.password)) {
    const error = new Error("current_password_invalid");

    error.statusCode = 401;
    throw error;
  }

  return setUserPassword(normalizedUsername, newPassword);
}

export async function setUserPassword(username, password) {
  const normalizedUsername = normalizeUsername(username);

  validatePasswordPolicy(password);

  if (!normalizedUsername) {
    return null;
  }

  const passwordRecord = createPasswordRecord(password);

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `UPDATE users
        SET password = $2::jsonb,
            disabled = FALSE,
            updated_at = NOW()
        WHERE LOWER(username) = LOWER($1)
        RETURNING id, username, role, disabled, updated_at`,
      [normalizedUsername, JSON.stringify(passwordRecord)]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      disabled: result.rows[0].disabled,
      id: result.rows[0].id,
      role: result.rows[0].role,
      updatedAt: result.rows[0].updated_at?.toISOString(),
      username: result.rows[0].username,
    };
  }

  const users = await loadUsers();
  const index = users.findIndex(
    (user) =>
      String(user.username).toLowerCase() === normalizedUsername
  );

  if (index === -1) {
    return null;
  }

  const updatedUser = {
    ...users[index],
    disabled: false,
    password: passwordRecord,
    updatedAt: new Date().toISOString(),
  };
  const nextUsers = [...users];

  nextUsers[index] = updatedUser;
  await persistUsers(nextUsers);

  return {
    disabled: false,
    id: updatedUser.id,
    role: updatedUser.role,
    updatedAt: updatedUser.updatedAt,
    username: updatedUser.username,
  };
}

export async function upsertUser({ password, role, username }) {
  const users = await loadUsers();
  const existing = users.find(
    (user) =>
      String(user.username).toLowerCase() ===
      String(username).toLowerCase()
  );
  const passwordRecord = createPasswordRecord(password);

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const organization = await ensureDefaultOrganization();
    const id = existing?.id || `user-${crypto.randomUUID()}`;
    const result = await database.query(
      `INSERT INTO users
        (id, organization_id, username, role, password, disabled)
        VALUES ($1, $2, $3, $4, $5::jsonb, FALSE)
        ON CONFLICT (username) DO UPDATE
        SET role = EXCLUDED.role,
            password = EXCLUDED.password,
            disabled = FALSE,
            updated_at = NOW()
        RETURNING id, username, role`,
      [
        id,
        organization.id,
        username,
        role,
        JSON.stringify(passwordRecord),
      ]
    );

    return {
      created: !existing,
      ...result.rows[0],
    };
  }

  const nextUser = {
    createdAt: existing?.createdAt || new Date().toISOString(),
    id: existing?.id || `user-${Date.now()}`,
    password: passwordRecord,
    role,
    updatedAt: new Date().toISOString(),
    username,
  };
  const nextUsers = existing
    ? users.map((user) =>
        user.id === existing.id ? { ...user, ...nextUser } : user
      )
    : [...users, nextUser];

  await persistUsers(nextUsers);

  return {
    created: !existing,
    id: nextUser.id,
    role: nextUser.role,
    username: nextUser.username,
  };
}

async function getUserOrganization(organizationId) {
  return getOrganizationAccount(organizationId);
}
