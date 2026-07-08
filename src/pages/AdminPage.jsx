import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  adminAccessRequests,
  adminApiKeys,
  adminAuditEvents,
  adminCreateApiKey,
  adminRevokeApiKey,
  adminResetUserPassword,
  adminRevokeUserSessions,
  adminSetUserDisabled,
  adminUpdateAccessRequestStatus,
  adminUsers,
  getSession,
} from "../utils/apiClient";

import "../styles/platform-levels.css";

function formatDate(value, language) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    language === "it" ? "it-IT" : "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

const apiKeyPermissionOptions = [
  "professional:read",
  "professional:export",
  "professional:report",
];

export default function AdminPage() {
  const { language } = useLanguage();
  const [users, setUsers] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [activePanel, setActivePanel] = useState("users");
  const [busyUser, setBusyUser] = useState("");
  const [busyRequest, setBusyRequest] = useState("");
  const [busyApiKey, setBusyApiKey] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState(null);
  const [apiKeyDraft, setApiKeyDraft] = useState({
    label: "",
    permissions: ["professional:read"],
  });
  const [passwordReset, setPasswordReset] = useState({
    password: "",
    username: "",
  });

  const copy = language === "it"
    ? {
        active: "Attivi",
        activeSessions: "Sessioni attive",
        admin: "Access management",
        apiKeyCreate: "Crea API key",
        apiKeyCreated:
          "API key creata. Copiala ora: non sarà più visibile.",
        apiKeyEmpty: "Nessuna API key configurata.",
        apiKeyFailed: "Non riesco ad aggiornare le API key.",
        apiKeyIntro:
          "Genera chiavi revocabili per integrazioni server-side con ARCUS Professional.",
        apiKeyLabel: "Etichetta",
        apiKeyLabelPlaceholder: "Es. Integrazione report Q3",
        apiKeySecret: "Chiave generata",
        apiKeys: "API key",
        apiKeyWarning:
          "Conserva la chiave in un password manager o secret vault. ARCUS salva solo l'hash.",
        approve: "Approva",
        audit: "Audit operativo",
        auditEmpty: "Nessun evento audit disponibile.",
        auditIntro:
          "Ultime azioni rilevanti registrate dal backend ARCUS.",
        back: "Torna alla console",
        created: "Creato",
        disabled: "Disabilitati",
        disable: "Disabilita",
        empty: "Nessun utente disponibile.",
        failed: "Non riesco ad aggiornare gli accessi.",
        free: "Free",
        intro:
          "Gestisci utenti, ruoli e sessioni ARCUS da un pannello operativo essenziale.",
        refresh: "Aggiorna",
        reject: "Rifiuta",
        resetCancel: "Annulla",
        resetPassword: "Reset password",
        resetPasswordHelp:
          "La nuova password deve avere almeno 8 caratteri. Le sessioni esistenti saranno revocate.",
        resetPasswordPlaceholder: "Nuova password temporanea",
        resetPasswordSuccess:
          "Password aggiornata e sessioni utente revocate.",
        requests: "Richieste Professional",
        requestsEmpty: "Nessuna richiesta Professional in coda.",
        requestsIntro:
          "Valuta le richieste arrivate dagli account Open prima di abilitare il livello riservato.",
        reviewed: "Segna vista",
        restore: "Riabilita",
        revoked: "Revocata",
        revoke: "Revoca sessioni",
        revokeKey: "Revoca key",
        role: "Ruolo",
        self: "Sessione corrente",
        signed: "Amministratore",
        status: "Stato",
        title: "Governo accessi ARCUS.",
        total: "Utenti totali",
        users: "Utenti",
      }
    : {
        active: "Active",
        activeSessions: "Active sessions",
        admin: "Access management",
        apiKeyCreate: "Create API key",
        apiKeyCreated:
          "API key created. Copy it now: it will not be shown again.",
        apiKeyEmpty: "No API keys configured.",
        apiKeyFailed: "API keys could not be updated.",
        apiKeyIntro:
          "Generate revocable keys for server-side integrations with ARCUS Professional.",
        apiKeyLabel: "Label",
        apiKeyLabelPlaceholder: "E.g. Q3 reporting integration",
        apiKeySecret: "Generated key",
        apiKeys: "API keys",
        apiKeyWarning:
          "Store the key in a password manager or secret vault. ARCUS only stores the hash.",
        approve: "Approve",
        audit: "Operational audit",
        auditEmpty: "No audit events available.",
        auditIntro:
          "Latest relevant actions recorded by the ARCUS backend.",
        back: "Return to console",
        created: "Created",
        disabled: "Disabled",
        disable: "Disable",
        empty: "No users available.",
        failed: "Access management could not be updated.",
        free: "Free",
        intro:
          "Manage ARCUS users, roles and sessions from a focused operational panel.",
        refresh: "Refresh",
        reject: "Reject",
        resetCancel: "Cancel",
        resetPassword: "Reset password",
        resetPasswordHelp:
          "The new password must be at least 8 characters. Existing sessions will be revoked.",
        resetPasswordPlaceholder: "New temporary password",
        resetPasswordSuccess:
          "Password updated and user sessions revoked.",
        requests: "Professional requests",
        requestsEmpty: "No Professional requests in queue.",
        requestsIntro:
          "Review Open account requests before enabling the restricted layer.",
        reviewed: "Mark reviewed",
        restore: "Enable",
        revoked: "Revoked",
        revoke: "Revoke sessions",
        revokeKey: "Revoke key",
        role: "Role",
        self: "Current session",
        signed: "Administrator",
        status: "Status",
        title: "ARCUS access governance.",
        total: "Total users",
        users: "Users",
      };

  const loadAdminState = useCallback((showLoading = true) => {
    if (showLoading) {
      setStatus("loading");
      setMessage("");
    }

    Promise.all([
      getSession(),
      adminUsers(),
      adminAccessRequests(),
      adminApiKeys(),
      adminAuditEvents(),
    ])
      .then(([
        nextSession,
        nextUsers,
        nextRequests,
        nextApiKeys,
        nextAuditEvents,
      ]) => {
        setSession(nextSession);
        setUsers(nextUsers);
        setAccessRequests(nextRequests);
        setApiKeys(nextApiKeys);
        setAuditEvents(nextAuditEvents);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage(copy.failed);
      });
  }, [copy.failed]);

  useEffect(() => {
    let active = true;

    Promise.all([
      getSession(),
      adminUsers(),
      adminAccessRequests(),
      adminApiKeys(),
      adminAuditEvents(),
    ])
      .then(([
        nextSession,
        nextUsers,
        nextRequests,
        nextApiKeys,
        nextAuditEvents,
      ]) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
        setUsers(nextUsers);
        setAccessRequests(nextRequests);
        setApiKeys(nextApiKeys);
        setAuditEvents(nextAuditEvents);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(copy.failed);
      });

    return () => {
      active = false;
    };
  }, [copy.failed]);

  const summary = useMemo(() => {
    const disabled = users.filter((user) => user.disabled).length;
    const activeSessions = users.reduce(
      (total, user) => total + Number(user.activeSessions || 0),
      0
    );

    return {
      active: users.length - disabled,
      activeSessions,
      disabled,
      requests: accessRequests.filter(
        (request) => request.status === "new"
      ).length,
      apiKeys: apiKeys.filter((apiKey) => !apiKey.revokedAt).length,
      total: users.length,
    };
  }, [accessRequests, apiKeys, users]);

  const updateUser = (username, action) => {
    setBusyUser(username);
    setMessage("");

    const request =
      action === "revoke"
        ? adminRevokeUserSessions(username)
        : adminSetUserDisabled(username, action === "disable");

    request
      .then(() => loadAdminState(false))
      .catch(() => {
        setMessage(copy.failed);
      })
      .finally(() => {
        setBusyUser("");
      });
  };

  const handlePasswordReset = (event) => {
    event.preventDefault();

    if (!passwordReset.username || passwordReset.password.length < 8) {
      setMessage(copy.failed);
      return;
    }

    setBusyUser(passwordReset.username);
    setMessage("");

    adminResetUserPassword(
      passwordReset.username,
      passwordReset.password
    )
      .then(() => {
        setPasswordReset({
          password: "",
          username: "",
        });
        setMessage(copy.resetPasswordSuccess);
        loadAdminState(false);
      })
      .catch(() => {
        setMessage(copy.failed);
      })
      .finally(() => {
        setBusyUser("");
      });
  };

  const updateRequestStatus = (requestId, nextStatus) => {
    setBusyRequest(requestId);
    setMessage("");

    adminUpdateAccessRequestStatus(requestId, nextStatus)
      .then(() => loadAdminState(false))
      .catch(() => {
        setMessage(copy.failed);
      })
      .finally(() => {
        setBusyRequest("");
      });
  };

  const toggleApiKeyPermission = (permission) => {
    setApiKeyDraft((current) => {
      const hasPermission = current.permissions.includes(permission);
      const permissions = hasPermission
        ? current.permissions.filter((value) => value !== permission)
        : [...current.permissions, permission];

      return {
        ...current,
        permissions: permissions.length
          ? permissions
          : ["professional:read"],
      };
    });
  };

  const createApiKey = (event) => {
    event.preventDefault();

    if (!apiKeyDraft.label.trim()) {
      setMessage(copy.apiKeyFailed);
      return;
    }

    setBusyApiKey("create");
    setCreatedApiKey(null);
    setMessage("");

    adminCreateApiKey(apiKeyDraft)
      .then((data) => {
        setCreatedApiKey(data);
        setApiKeyDraft({
          label: "",
          permissions: ["professional:read"],
        });
        setMessage(copy.apiKeyCreated);
        loadAdminState(false);
      })
      .catch(() => {
        setMessage(copy.apiKeyFailed);
      })
      .finally(() => {
        setBusyApiKey("");
      });
  };

  const revokeApiKey = (apiKeyId) => {
    setBusyApiKey(apiKeyId);
    setMessage("");

    adminRevokeApiKey(apiKeyId)
      .then(() => {
        setCreatedApiKey(null);
        loadAdminState(false);
      })
      .catch(() => {
        setMessage(copy.apiKeyFailed);
      })
      .finally(() => {
        setBusyApiKey("");
      });
  };

  return (
    <main className="admin-page" id="main-content">
      <PageMeta
        title="ARCUS Admin"
        description={copy.intro}
      />

      <Navbar />

      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <span>{copy.admin}</span>
            <h1>{copy.title}</h1>
            <p>{copy.intro}</p>
          </div>

          <div className="admin-header-actions">
            <div>
              <span>{copy.signed}</span>
              <strong>{session?.username || "-"}</strong>
            </div>
            <button type="button" onClick={() => loadAdminState(true)}>
              {copy.refresh}
            </button>
            <Link to="/professional">{copy.back}</Link>
          </div>
        </header>

        <section className="admin-summary-grid">
          <article>
            <span>{copy.total}</span>
            <strong>{summary.total}</strong>
          </article>
          <article>
            <span>{copy.active}</span>
            <strong>{summary.active}</strong>
          </article>
          <article>
            <span>{copy.disabled}</span>
            <strong>{summary.disabled}</strong>
          </article>
          <article>
            <span>{copy.activeSessions}</span>
            <strong>{summary.activeSessions}</strong>
          </article>
          <article>
            <span>{copy.requests}</span>
            <strong>{summary.requests}</strong>
          </article>
          <article>
            <span>{copy.apiKeys}</span>
            <strong>{summary.apiKeys}</strong>
          </article>
        </section>

        <nav className="admin-panel-tabs" aria-label={copy.admin}>
          {[
            ["users", copy.users, users.length],
            ["requests", copy.requests, summary.requests],
            ["apiKeys", copy.apiKeys, summary.apiKeys],
            ["audit", copy.audit, auditEvents.length],
          ].map(([key, label, count]) => (
            <button
              className={activePanel === key ? "active" : ""}
              key={key}
              onClick={() => setActivePanel(key)}
              type="button"
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </nav>

        {activePanel === "users" && (
        <section className="admin-user-panel">
          {status === "loading" ? (
            <p className="admin-state">ARCUS ADMIN</p>
          ) : users.length ? (
            users.map((user) => {
              const isCurrentUser =
                user.username === session?.username;

              return (
                <article
                  className={[
                    user.disabled ? "disabled" : "",
                    isCurrentUser ? "current" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={user.id || user.username}
                >
                  <div>
                    <span>
                      {user.role || copy.free}
                      {isCurrentUser ? ` - ${copy.self}` : ""}
                    </span>
                  <strong>{user.username}</strong>
                  <p>
                    {copy.created}: {formatDate(user.createdAt, language)}
                  </p>
                </div>

                <div className="admin-user-meta">
                  <span>{copy.status}</span>
                  <strong>
                    {user.disabled ? copy.disabled : copy.active}
                  </strong>
                </div>

                <div className="admin-user-meta">
                  <span>{copy.activeSessions}</span>
                  <strong>{user.activeSessions || 0}</strong>
                </div>

                <div className="admin-user-actions">
                  <button
                    disabled={
                      busyUser === user.username ||
                      isCurrentUser
                    }
                    onClick={() =>
                      updateUser(
                        user.username,
                        user.disabled ? "enable" : "disable"
                      )
                    }
                    type="button"
                  >
                    {user.disabled ? copy.restore : copy.disable}
                  </button>
                  <button
                    disabled={
                      busyUser === user.username ||
                      Number(user.activeSessions || 0) === 0 ||
                      isCurrentUser
                    }
                    onClick={() => updateUser(user.username, "revoke")}
                    type="button"
                  >
                    {copy.revoke}
                  </button>
                  <button
                    disabled={
                      busyUser === user.username ||
                      isCurrentUser
                    }
                    onClick={() =>
                      setPasswordReset((current) => ({
                        password:
                          current.username === user.username
                            ? current.password
                            : "",
                        username:
                          current.username === user.username
                            ? ""
                            : user.username,
                      }))
                    }
                    type="button"
                  >
                    {copy.resetPassword}
                  </button>
                </div>

                {passwordReset.username === user.username && (
                  <form
                    className="admin-password-reset-panel"
                    onSubmit={handlePasswordReset}
                  >
                    <div>
                      <span>{copy.resetPassword}</span>
                      <p>{copy.resetPasswordHelp}</p>
                    </div>
                    <input
                      minLength="8"
                      onChange={(event) =>
                        setPasswordReset((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder={copy.resetPasswordPlaceholder}
                      required
                      type="password"
                      value={passwordReset.password}
                    />
                    <button
                      disabled={busyUser === user.username}
                      type="submit"
                    >
                      {copy.resetPassword}
                    </button>
                    <button
                      onClick={() =>
                        setPasswordReset({
                          password: "",
                          username: "",
                        })
                      }
                      type="button"
                    >
                      {copy.resetCancel}
                    </button>
                  </form>
                )}
              </article>
              );
            })
          ) : (
            <p className="admin-state">{copy.empty}</p>
          )}
        </section>
        )}

        {activePanel === "requests" && (
        <section className="admin-request-panel">
          <header>
            <div>
              <span>{copy.requests}</span>
              <h2>{copy.requests}</h2>
            </div>
            <p>{copy.requestsIntro}</p>
          </header>

          {status === "loading" ? (
            <p className="admin-state">ARCUS REQUESTS</p>
          ) : accessRequests.length ? (
            accessRequests.map((accessRequest) => (
              <article key={accessRequest.id}>
                <div>
                  <span>
                    {accessRequest.status} -{" "}
                    {formatDate(accessRequest.createdAt, language)}
                  </span>
                  <strong>{accessRequest.email}</strong>
                  <p>
                    {[
                      accessRequest.organization,
                      accessRequest.role,
                    ]
                      .filter(Boolean)
                      .join(" - ") || "Open account"}
                  </p>
                  {accessRequest.message && (
                    <p className="admin-request-message">
                      {accessRequest.message}
                    </p>
                  )}
                </div>

                <div className="admin-request-actions">
                  <button
                    disabled={
                      busyRequest === accessRequest.id ||
                      accessRequest.status === "reviewed"
                    }
                    onClick={() =>
                      updateRequestStatus(
                        accessRequest.id,
                        "reviewed"
                      )
                    }
                    type="button"
                  >
                    {copy.reviewed}
                  </button>
                  <button
                    disabled={
                      busyRequest === accessRequest.id ||
                      accessRequest.status === "approved"
                    }
                    onClick={() =>
                      updateRequestStatus(
                        accessRequest.id,
                        "approved"
                      )
                    }
                    type="button"
                  >
                    {copy.approve}
                  </button>
                  <button
                    disabled={
                      busyRequest === accessRequest.id ||
                      accessRequest.status === "rejected"
                    }
                    onClick={() =>
                      updateRequestStatus(
                        accessRequest.id,
                        "rejected"
                      )
                    }
                    type="button"
                  >
                    {copy.reject}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="admin-state">{copy.requestsEmpty}</p>
          )}
        </section>
        )}

        {activePanel === "apiKeys" && (
        <section className="admin-api-key-panel">
          <header>
            <div>
              <span>{copy.apiKeys}</span>
              <h2>{copy.apiKeys}</h2>
            </div>
            <p>{copy.apiKeyIntro}</p>
          </header>

          {createdApiKey?.key && (
            <article className="admin-api-key-secret">
              <div>
                <span>{copy.apiKeySecret}</span>
                <strong>{createdApiKey.apiKey?.label}</strong>
                <p>{copy.apiKeyWarning}</p>
              </div>
              <textarea
                readOnly
                rows="2"
                value={createdApiKey.key}
              />
            </article>
          )}

          <form className="admin-api-key-create" onSubmit={createApiKey}>
            <label>
              <span>{copy.apiKeyLabel}</span>
              <input
                onChange={(event) =>
                  setApiKeyDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder={copy.apiKeyLabelPlaceholder}
                required
                type="text"
                value={apiKeyDraft.label}
              />
            </label>

            <fieldset>
              <legend>{copy.role}</legend>
              <div>
                {apiKeyPermissionOptions.map((permission) => (
                  <label key={permission}>
                    <input
                      checked={apiKeyDraft.permissions.includes(permission)}
                      onChange={() =>
                        toggleApiKeyPermission(permission)
                      }
                      type="checkbox"
                    />
                    <span>{permission}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              disabled={busyApiKey === "create"}
              type="submit"
            >
              {copy.apiKeyCreate}
            </button>
          </form>

          {status === "loading" ? (
            <p className="admin-state">ARCUS API KEYS</p>
          ) : apiKeys.length ? (
            <div className="admin-api-key-list">
              {apiKeys.map((apiKey) => (
                <article
                  className={apiKey.revokedAt ? "revoked" : ""}
                  key={apiKey.id}
                >
                  <div>
                    <span>
                      {apiKey.revokedAt
                        ? copy.revoked
                        : copy.active}{" "}
                      - {formatDate(apiKey.createdAt, language)}
                    </span>
                    <strong>{apiKey.label}</strong>
                    <p>{apiKey.permissions.join(" - ")}</p>
                  </div>

                  <div className="admin-api-key-meta">
                    <span>ID</span>
                    <strong>{apiKey.id}</strong>
                  </div>

                  <div className="admin-api-key-meta">
                    <span>{copy.status}</span>
                    <strong>
                      {apiKey.revokedAt ? copy.revoked : copy.active}
                    </strong>
                  </div>

                  <button
                    disabled={Boolean(apiKey.revokedAt) ||
                      busyApiKey === apiKey.id}
                    onClick={() => revokeApiKey(apiKey.id)}
                    type="button"
                  >
                    {copy.revokeKey}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-state">{copy.apiKeyEmpty}</p>
          )}
        </section>
        )}

        {activePanel === "audit" && (
        <section className="admin-audit-panel">
          <header>
            <div>
              <span>{copy.audit}</span>
              <h2>{copy.audit}</h2>
            </div>
            <p>{copy.auditIntro}</p>
          </header>

          {status === "loading" ? (
            <p className="admin-state">ARCUS AUDIT</p>
          ) : auditEvents.length ? (
            <div className="admin-audit-list">
              {auditEvents.slice(0, 12).map((event, index) => {
                const details = event.details || {};
                const actor =
                  details.performedBy ||
                  details.username ||
                  details.requestedByRole ||
                  event.userId ||
                  "-";
                const context = [
                  details.status,
                  details.exportType,
                  details.reference,
                  details.requestId,
                ]
                  .filter(Boolean)
                  .join(" - ");

                return (
                  <article key={`${event.event}-${event.at}-${index}`}>
                    <span>{formatDate(event.at, language)}</span>
                    <strong>{event.event}</strong>
                    <p>
                      {actor}
                      {context ? ` - ${context}` : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="admin-state">{copy.auditEmpty}</p>
          )}
        </section>
        )}

        {message && (
          <p className="admin-message" aria-live="polite">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
