export const openApiDocument = {
  components: {
    headers: {
      RequestId: {
        description: "Stable request id returned on every ARCUS API response.",
        schema: {
          type: "string",
        },
      },
    },
    schemas: {
      ErrorResponse: {
        additionalProperties: true,
        properties: {
          error: {
            description: "Machine-readable error code.",
            type: "string",
          },
          requestId: {
            type: "string",
          },
          statusCode: {
            type: "integer",
          },
        },
        required: ["error", "requestId", "statusCode"],
        type: "object",
      },
    },
  },
  info: {
    title: "ARCUS API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {
    "/api/v1/health": {
      get: { summary: "Service health" },
    },
    "/api/v1/auth/login": {
      post: { summary: "Create a Professional session" },
    },
    "/api/v1/auth/register": {
      post: { summary: "Create a free ARCUS Open account" },
    },
    "/api/v1/auth/password": {
      post: { summary: "Change the authenticated user's password" },
    },
    "/api/v1/auth/password/request-reset": {
      post: { summary: "Request a password reset email" },
    },
    "/api/v1/auth/password/reset": {
      post: { summary: "Reset a password with a valid reset token" },
    },
    "/api/v1/auth/sessions": {
      get: { summary: "List active sessions for the authenticated user" },
    },
    "/api/v1/auth/sessions/revoke-other": {
      post: { summary: "Revoke other active sessions for the authenticated user" },
    },
    "/api/v1/access-requests": {
      post: { summary: "Submit a Professional access request" },
    },
    "/api/v1/professional/exports": {
      post: { summary: "Generate a bounded Professional output" },
    },
    "/api/v1/professional/exports/recent": {
      get: { summary: "List recent Professional exports" },
    },
    "/api/v1/professional/data-release": {
      get: { summary: "Read the active Professional data release" },
    },
    "/api/v1/professional/workspaces": {
      get: { summary: "List organization workspaces" },
      post: { summary: "Create an organization workspace" },
    },
    "/api/v1/professional/account": {
      get: { summary: "Read Professional account and organization status" },
    },
    "/api/v1/professional/usage": {
      get: { summary: "Read Professional entitlements and daily usage" },
    },
    "/api/v1/professional/report-jobs": {
      post: { summary: "Register a report generation job" },
    },
    "/api/v1/professional/report-jobs/recent": {
      get: { summary: "List recent report jobs" },
    },
    "/api/v1/professional/report-jobs/{id}": {
      get: { summary: "Read report job status" },
    },
    "/api/v1/professional/report-jobs/{id}/complete": {
      post: { summary: "Mark a client-generated report job as completed" },
    },
    "/api/v1/admin/access-requests": {
      get: { summary: "List Professional access requests" },
    },
    "/api/v1/admin/access-requests/{id}/status": {
      post: { summary: "Update a Professional access request status" },
    },
    "/api/v1/admin/audit-events": {
      get: { summary: "List recent ARCUS audit events" },
    },
    "/api/v1/admin/ops/status": {
      get: { summary: "Read ARCUS operational status checks" },
    },
    "/api/v1/admin/email-outbox": {
      get: { summary: "List transactional email outbox entries" },
    },
    "/api/v1/admin/api-keys": {
      get: { summary: "List organization API keys" },
      post: { summary: "Create a machine-to-machine API key" },
    },
    "/api/v1/admin/api-keys/{id}/revoke": {
      post: { summary: "Revoke an API key" },
    },
    "/api/v1/admin/users/{username}/password": {
      post: { summary: "Reset a user's password and revoke sessions" },
    },
  },
};
