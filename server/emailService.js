import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  appBaseUrl,
  emailFromAddress,
  emailOutboxFilePath,
  emailTransport,
  emailWebhookApiKey,
  emailWebhookTimeoutMs,
  emailWebhookUrl,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";

let cachedOutbox = null;
let writeQueue = Promise.resolve();

async function loadOutbox() {
  if (cachedOutbox) {
    return cachedOutbox;
  }

  try {
    const content = await fs.readFile(emailOutboxFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedOutbox = parsed.emails || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedOutbox = [];
  }

  return cachedOutbox;
}

async function persistOutbox(emails) {
  cachedOutbox = emails;
  writeQueue = writeQueue.then(() =>
    writeJsonFile(emailOutboxFilePath, { emails })
  );

  return writeQueue;
}

async function deliverViaWebhook(email) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, emailWebhookTimeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (emailWebhookApiKey) {
      headers.Authorization = `Bearer ${emailWebhookApiKey}`;
    }

    const response = await fetch(emailWebhookUrl, {
      body: JSON.stringify({
        body: email.body,
        from: email.from,
        id: email.id,
        metadata: email.metadata || {},
        subject: email.subject,
        template: email.template,
        to: email.to,
      }),
      headers,
      method: "POST",
      signal: controller.signal,
    });
    const text = await response.text();

    return {
      ok: response.ok,
      providerResponse: text.slice(0, 1200),
      providerStatus: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function passwordResetUrl(token) {
  const url = new URL("/account", appBaseUrl);

  url.searchParams.set("resetToken", token);

  return url.toString();
}

export async function sendTransactionalEmail(message) {
  const emailBase = {
    at: new Date().toISOString(),
    from: emailFromAddress,
    id: `email-${crypto.randomUUID()}`,
    provider: emailTransport,
    ...message,
  };
  let email = {
    ...emailBase,
    status: "queued-local",
  };

  if (emailTransport === "webhook") {
    try {
      const delivery = await deliverViaWebhook(emailBase);

      email = {
        ...emailBase,
        deliveredAt: delivery.ok ? new Date().toISOString() : null,
        providerResponse: delivery.providerResponse,
        providerStatus: delivery.providerStatus,
        status: delivery.ok ? "sent" : "failed",
      };
    } catch (error) {
      email = {
        ...emailBase,
        error: error.name === "AbortError"
          ? "email_webhook_timeout"
          : "email_webhook_failed",
        providerStatus: null,
        status: "failed",
      };
    }
  }

  const outbox = await loadOutbox();

  await persistOutbox([email, ...outbox]);

  if (emailTransport === "webhook" && email.status !== "sent") {
    const error = new Error(email.error || "email_delivery_failed");

    error.email = email;
    error.statusCode = 502;
    throw error;
  }

  return email;
}

export async function sendPasswordResetEmail({
  token,
  username,
}) {
  const resetUrl = passwordResetUrl(token);

  return sendTransactionalEmail({
    body:
      `A password reset was requested for ${username}.\n\n` +
      `Open this link within the configured expiry window:\n${resetUrl}\n\n` +
      "If you did not request this, ignore this email.",
    metadata: {
      resetUrl,
      username,
    },
    subject: "Reset your ARCUS password",
    template: "password-reset",
    to: username,
  });
}

export async function listEmailOutboxForAdmin(limit = 50) {
  const outbox = await loadOutbox();
  const max = Math.min(Math.max(Number(limit) || 50, 1), 200);

  return outbox.slice(0, max).map((email) => ({
    at: email.at,
    id: email.id,
    metadata: email.metadata || {},
    provider: email.provider,
    providerStatus: email.providerStatus || null,
    status: email.status,
    subject: email.subject,
    template: email.template,
    to: email.to,
  }));
}

export async function emailDeliveryStatus(limit = 50) {
  const emails = await listEmailOutboxForAdmin(limit);
  const failed = emails.filter((email) => email.status === "failed");

  return {
    failed: failed.length,
    lastFailureAt: failed[0]?.at || null,
    recent: emails.length,
    status: failed.length ? "degraded" : "ok",
  };
}
