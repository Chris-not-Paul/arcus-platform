import {
  loginRateLimitLockMs,
  loginRateLimitMaxAttempts,
  loginRateLimitWindowMs,
} from "./config.js";

const attempts = new Map();

function now() {
  return Date.now();
}

function normalizeKey(value) {
  return String(value || "unknown")
    .toLowerCase()
    .trim();
}

export function loginAttemptKey(request, username) {
  const forwarded =
    request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(
        forwarded ||
          request.socket.remoteAddress ||
          "local"
      ).split(",")[0];

  return `${normalizeKey(ip)}:${normalizeKey(username)}`;
}

export function checkLoginRateLimit(key) {
  const record = attempts.get(key);
  const currentTime = now();

  if (!record) {
    return {
      allowed: true,
      remaining: loginRateLimitMaxAttempts,
    };
  }

  if (record.lockedUntil && record.lockedUntil > currentTime) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (record.lockedUntil - currentTime) / 1000
      ),
    };
  }

  if (record.windowStartedAt + loginRateLimitWindowMs <= currentTime) {
    attempts.delete(key);
    return {
      allowed: true,
      remaining: loginRateLimitMaxAttempts,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(
      loginRateLimitMaxAttempts - record.count,
      0
    ),
  };
}

export function recordLoginFailure(key) {
  const currentTime = now();
  const record = attempts.get(key);
  const nextRecord =
    record &&
    record.windowStartedAt + loginRateLimitWindowMs > currentTime
      ? record
      : {
          count: 0,
          windowStartedAt: currentTime,
        };

  nextRecord.count += 1;

  if (nextRecord.count >= loginRateLimitMaxAttempts) {
    nextRecord.lockedUntil =
      currentTime + loginRateLimitLockMs;
  }

  attempts.set(key, nextRecord);

  return nextRecord;
}

export function recordLoginSuccess(key) {
  attempts.delete(key);
}

