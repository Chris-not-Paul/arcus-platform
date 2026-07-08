import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const testRoot = path.resolve(
  ".tmp",
  `email-suite-${Date.now()}`
);
const received = [];

const webhookServer = http.createServer((request, response) => {
  const chunks = [];

  request.on("data", (chunk) => {
    chunks.push(chunk);
  });
  request.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");

    received.push({
      authorization: request.headers.authorization || "",
      body: JSON.parse(body),
      method: request.method,
      url: request.url,
    });
    response.writeHead(202, {
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ accepted: true }));
  });
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

await new Promise((resolve) => {
  webhookServer.listen(0, "127.0.0.1", resolve);
});

const { port } = webhookServer.address();

process.env.ARCUS_PRIVATE_DATA_DIR = testRoot;
process.env.ARCUS_EMAIL_TRANSPORT = "webhook";
process.env.ARCUS_EMAIL_WEBHOOK_URL = `http://127.0.0.1:${port}/email`;
process.env.ARCUS_EMAIL_WEBHOOK_API_KEY = "email-suite-secret";
process.env.ARCUS_EMAIL_WEBHOOK_TIMEOUT_MS = "5000";
process.env.ARCUS_APP_BASE_URL = "http://127.0.0.1:5173";

try {
  const {
    emailDeliveryStatus,
    listEmailOutboxForAdmin,
    sendPasswordResetEmail,
  } = await import("../server/emailService.js");

  const sent = await sendPasswordResetEmail({
    token: "suite-reset-token",
    username: "email-suite@example.test",
  });

  assert(sent.status === "sent", "webhook email was not marked sent");
  assert(received.length === 1, "webhook did not receive one email");
  assert(
    received[0].authorization === "Bearer email-suite-secret",
    "webhook authorization header missing"
  );
  assert(
    received[0].body.to === "email-suite@example.test",
    "webhook payload recipient mismatch"
  );
  assert(
    received[0].body.metadata.resetUrl.includes("suite-reset-token"),
    "webhook payload reset token missing"
  );

  const outbox = await listEmailOutboxForAdmin();

  assert(outbox[0].status === "sent", "outbox did not record sent status");
  assert(
    outbox[0].providerStatus === 202,
    "outbox did not record provider status"
  );

  const deliveryStatus = await emailDeliveryStatus();

  assert(deliveryStatus.failed === 0, "email status reports failures");

  console.log(
    JSON.stringify({
      ok: true,
      checks: [
        "email-webhook-delivery",
        "email-webhook-auth",
        "email-outbox-status",
      ],
    })
  );
} finally {
  await new Promise((resolve) => webhookServer.close(resolve));
  await fs.rm(testRoot, {
    force: true,
    recursive: true,
  });
}
