import crypto from "node:crypto";

import {
  secureSessionCookie,
  sessionMaxAgeSeconds,
} from "./config.js";
import {
  createSessionRecord,
  deleteSessionRecord,
  getSessionRecord,
} from "./sessionStore.js";
import {
  getUserContext,
  verifyUserCredentials,
} from "./userStore.js";
import { authenticateApiKeyRequest } from "./apiKeyStore.js";
import { sessionHasPermission } from "./accessPolicy.js";

const sessionCookieName = "ARCUS_SESSION";

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = decodeURIComponent(
        part.slice(0, separatorIndex)
      );
      const value = decodeURIComponent(
        part.slice(separatorIndex + 1)
      );

      cookies[name] = value;

      return cookies;
    }, {});
}

export function authenticateCredentials({
  password,
  username,
}) {
  return verifyUserCredentials({
    password,
    username,
  });
}

export async function createSession(user) {
  const sessionId =
    crypto.randomBytes(32).toString("hex");
  const csrfToken =
    crypto.randomBytes(32).toString("hex");
  const expiresAt =
    Date.now() + sessionMaxAgeSeconds * 1000;

  await createSessionRecord({
    csrfToken,
    expiresAt,
    id: sessionId,
    organizationId: user.organizationId,
    role: user.role,
    userId: user.id,
    username: user.username,
  });

  return {
    cookie: `${sessionCookieName}=${encodeURIComponent(
      sessionId
    )}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionMaxAgeSeconds}${secureSessionCookie ? "; Secure" : ""}`,
    session: {
      csrfToken,
      expiresAt,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      organizationPlan: user.organizationPlan,
      organizationStatus: user.organizationStatus,
      role: user.role,
      userId: user.id,
      username: user.username,
    },
  };
}

export function clearSessionCookie() {
  return `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureSessionCookie ? "; Secure" : ""}`;
}

export async function destroySession(request) {
  const cookies = parseCookies(request.headers.cookie);
  const sessionId = cookies[sessionCookieName];

  if (sessionId) {
    await deleteSessionRecord(sessionId);
  }
}

export async function getSession(request) {
  const cookies = parseCookies(request.headers.cookie);
  const sessionId = cookies[sessionCookieName];

  if (!sessionId) {
    return null;
  }

  const session = await getSessionRecord(sessionId);

  if (!session) {
    return null;
  }

  const userContext = await getUserContext(session.username);

  if (!userContext) {
    await deleteSessionRecord(sessionId);
    return null;
  }

  return {
    ...session,
    exportLimit: userContext.exportLimit,
    organizationId: userContext.organizationId,
    organizationName: userContext.organizationName,
    organizationPlan: userContext.organizationPlan,
    organizationStatus: userContext.organizationStatus,
  };
}

export async function getRequestSession(request) {
  return (await getSession(request)) || authenticateApiKeyRequest(request);
}

export async function isCsrfTokenValid(request) {
  const session = await getSession(request);
  const submitted =
    request.headers["x-arcus-csrf-token"];

  if (!session?.csrfToken || !submitted) {
    return false;
  }

  const expected = Buffer.from(session.csrfToken);
  const received = Buffer.from(String(submitted));

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

export async function isProfessionalRequestAuthorized(
  request,
  permission = "professional:read"
) {
  const session = await getRequestSession(request);

  return sessionHasPermission(session, permission);
}
