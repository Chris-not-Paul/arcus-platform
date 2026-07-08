import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  accountSessions,
  changeAccountPassword,
  getSession,
  logoutProfessional,
  professionalAccount,
  professionalDataRelease,
  professionalExportHistory,
  professionalUsage,
  requestProfessionalCancellation,
  revokeOtherAccountSessions,
  resumeProfessionalSubscription,
} from "../utils/apiClient";

import "../styles/platform-levels.css";

function formatDate(value, language) {
  if (!value) {
    return language === "it"
      ? "Da definire contrattualmente"
      : "To be defined contractually";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    language === "it" ? "it-IT" : "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function formatDateTime(value, language) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    language === "it" ? "it-IT" : "en-GB",
    {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function accountFromSession(session) {
  if (!session?.authenticated) {
    return null;
  }

  return {
    organization: {
      cancelAtPeriodEnd: false,
      cancellationRequestedAt: null,
      exportLimit: "-",
      id: session.organization?.id || "session-organization",
      name: session.organization?.name || "ARCUS",
      plan: session.organization?.plan || "professional",
      planRenewsAt: null,
      slug: session.organization?.id || "arcus",
      status: "active",
    },
    role: session.role,
    session,
    syncLimited: true,
    username: session.username,
  };
}

export default function ProfessionalAccountPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [exportHistory, setExportHistory] = useState([]);
  const [release, setRelease] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [usage, setUsage] = useState(null);
  const [status, setStatus] = useState("loading");
  const [sessionStatus, setSessionStatus] = useState("idle");
  const [updating, setUpdating] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");

  const copy = language === "it"
    ? {
        account: "Account Professional",
        back: "Torna alla console",
        cancel: "Richiedi disdetta",
        cancelHelp:
          "La richiesta viene registrata per l'organizzazione. L'accesso resta attivo fino alla data di rinnovo o alla verifica contrattuale da parte di ARCUS.",
        cancellationActive: "Disdetta programmata",
        cancellationHelp:
          "La richiesta di disdetta e stata registrata. Puoi annullarla finche il piano e attivo.",
        confirmCancel:
          "Vuoi registrare la richiesta di disdetta per questa organizzazione?",
        exports: "Limite output per richiesta",
        exportHistory: "Storico export",
        exportHistoryEmpty: "Nessun export Professional registrato.",
        exportRelease: "Release dati",
        exportReleaseHelp:
          "Ogni output e collegato a una release dati e a una versione metodologia.",
        failed: "Non riesco a caricare o aggiornare l'account.",
        passwordChange: "Aggiorna password",
        passwordChanged:
          "Password aggiornata. Riapro il login per sicurezza.",
        passwordConfirm: "Conferma nuova password",
        passwordCurrent: "Password attuale",
        passwordFailed:
          "Non riesco ad aggiornare la password. Verifica i dati inseriti.",
        passwordMismatch: "Le nuove password non coincidono.",
        passwordNew: "Nuova password",
        passwordText:
          "Il cambio password revoca le sessioni attive e richiede un nuovo accesso.",
        includedModules: "Moduli attivi",
        limited:
          "I dettagli contrattuali non sono sincronizzati in questo momento. La sessione Professional resta attiva.",
        limit: "limite",
        modulesHelp:
          "I moduli sono derivati dagli entitlements attivi per il piano corrente.",
        organization: "Organizzazione",
        overview: "Overview account",
        plan: "Piano",
        remaining: "residui",
        renewal: "Prossimo rinnovo",
        revokeOtherSessions: "Revoca altre sessioni",
        revokeOtherSessionsDone:
          "Le altre sessioni attive sono state revocate.",
        revokeOtherSessionsFailed:
          "Non riesco a revocare le altre sessioni.",
        resume: "Mantieni il piano attivo",
        role: "Ruolo",
        security: "Sicurezza",
        securityText:
          "La sessione usa un cookie HttpOnly e puo essere revocata dagli amministratori dell'organizzazione.",
        sessions: "Sessioni attive",
        sessionsCurrent: "Corrente",
        sessionsEmpty: "Nessuna sessione attiva rilevata.",
        sessionsExpires: "Scade",
        sessionsText:
          "Controlla gli accessi aperti e chiudi quelli non piu necessari.",
        signOut: "Esci dall'account",
        signedInAs: "Accesso attivo come",
        synced: "Sincronizzato",
        status: "Stato",
        subtitle:
          "Piano, accesso e impostazioni dell'organizzazione ARCUS.",
        title: "Gestisci il tuo accesso Professional.",
        usage: "Uso giornaliero",
        usageHelp:
          "Le quote proteggono il database Professional e vengono azzerate ogni giorno.",
        used: "usati",
      }
    : {
        account: "Professional account",
        back: "Return to console",
        cancel: "Request cancellation",
        cancelHelp:
          "The request is recorded for the organization. Access remains active until the renewal date or ARCUS contract review.",
        cancellationActive: "Cancellation scheduled",
        cancellationHelp:
          "The cancellation request has been recorded. You can revoke it while the plan is active.",
        confirmCancel:
          "Do you want to register a cancellation request for this organization?",
        exports: "Output limit per request",
        exportHistory: "Export history",
        exportHistoryEmpty: "No Professional exports recorded.",
        exportRelease: "Data release",
        exportReleaseHelp:
          "Every output is linked to a data release and methodology version.",
        failed: "The account could not be loaded or updated.",
        passwordChange: "Update password",
        passwordChanged:
          "Password updated. Reopening sign-in for security.",
        passwordConfirm: "Confirm new password",
        passwordCurrent: "Current password",
        passwordFailed:
          "The password could not be updated. Check the submitted values.",
        passwordMismatch: "The new passwords do not match.",
        passwordNew: "New password",
        passwordText:
          "Changing the password revokes active sessions and requires a fresh sign-in.",
        includedModules: "Active modules",
        limited:
          "Contract details are not synchronized right now. The Professional session is still active.",
        limit: "limit",
        modulesHelp:
          "Modules are derived from the active entitlements for the current plan.",
        organization: "Organization",
        overview: "Account overview",
        plan: "Plan",
        remaining: "remaining",
        renewal: "Next renewal",
        revokeOtherSessions: "Revoke other sessions",
        revokeOtherSessionsDone:
          "Other active sessions have been revoked.",
        revokeOtherSessionsFailed:
          "Other sessions could not be revoked.",
        resume: "Keep plan active",
        role: "Role",
        security: "Security",
        securityText:
          "The session uses an HttpOnly cookie and can be revoked by organization administrators.",
        sessions: "Active sessions",
        sessionsCurrent: "Current",
        sessionsEmpty: "No active sessions detected.",
        sessionsExpires: "Expires",
        sessionsText:
          "Review open access points and close the ones you no longer need.",
        signOut: "Sign out",
        signedInAs: "Signed in as",
        synced: "Synchronized",
        status: "Status",
        subtitle:
          "Plan, access and organization settings for ARCUS.",
        title: "Manage your Professional access.",
        usage: "Daily usage",
        usageHelp:
          "Quotas protect the Professional database and reset every day.",
        used: "used",
      };
  const limitedMessage = copy.limited;

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) =>
        Promise.all([
          professionalAccount()
            .then((accountData) => ({
              ...accountData,
              session,
              syncLimited: false,
            }))
            .catch(() => accountFromSession(session)),
          professionalUsage().catch(() => null),
          accountSessions().catch(() => []),
          professionalDataRelease().catch(() => null),
          professionalExportHistory().catch(() => []),
        ])
      )
      .then(([
        nextAccount,
        nextUsage,
        nextSessions,
        nextRelease,
        nextExportHistory,
      ]) => {
        if (!active) {
          return;
        }

        if (nextAccount?.organization) {
          setAccount(nextAccount);
          setExportHistory(nextExportHistory);
          setRelease(nextRelease);
          setSessions(nextSessions);
          setUsage(nextUsage);
          setMessage(nextAccount.syncLimited ? limitedMessage : "");
          setStatus("ready");
        } else {
          setStatus("error");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [limitedMessage]);

  const handlePlanAction = () => {
    const organization = account?.organization;

    if (!organization || updating || account?.syncLimited) {
      if (account?.syncLimited) {
        setMessage(copy.limited);
      }
      return;
    }

    if (
      !organization.cancelAtPeriodEnd &&
      !window.confirm(copy.confirmCancel)
    ) {
      return;
    }

    setUpdating(true);
    setMessage("");

    const request = organization.cancelAtPeriodEnd
      ? resumeProfessionalSubscription
      : requestProfessionalCancellation;

    request()
      .then((updatedOrganization) => {
        setAccount((current) => ({
          ...current,
          organization: updatedOrganization,
        }));
      })
      .catch(() => setMessage(copy.failed))
      .finally(() => setUpdating(false));
  };

  const handleSignOut = () => {
    logoutProfessional()
      .catch(() => null)
      .finally(() => {
        navigate("/professional/login", {
          replace: true,
        });
      });
  };

  const handlePasswordField = (event) => {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePasswordChange = (event) => {
    event.preventDefault();
    setMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage(copy.passwordMismatch);
      return;
    }

    setPasswordStatus("submitting");

    changeAccountPassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
      .then(() => {
        setPasswordForm({
          confirmPassword: "",
          currentPassword: "",
          newPassword: "",
        });
        setMessage(copy.passwordChanged);
        window.setTimeout(() => {
          navigate("/professional/login", {
            replace: true,
          });
        }, 900);
      })
      .catch(() => {
        setMessage(copy.passwordFailed);
        setPasswordStatus("idle");
      });
  };

  const handleRevokeOtherSessions = () => {
    setSessionStatus("submitting");
    setMessage("");

    revokeOtherAccountSessions()
      .then(() =>
        accountSessions().then((nextSessions) => {
          setSessions(nextSessions);
          setMessage(copy.revokeOtherSessionsDone);
        })
      )
      .catch(() => {
        setMessage(copy.revokeOtherSessionsFailed);
      })
      .finally(() => {
        setSessionStatus("idle");
      });
  };

  if (status === "loading") {
    return (
      <main className="professional-auth-loading">
        ARCUS PROFESSIONAL
      </main>
    );
  }

  if (status === "error" || !account?.organization) {
    return (
      <main className="professional-account-page" id="main-content">
        <Navbar />
        <section className="professional-account-empty">
          <p>{copy.failed}</p>
          <Link to="/professional">{copy.back}</Link>
        </section>
      </main>
    );
  }

  const { organization, role, username } = account;
  const isCancelling = organization.cancelAtPeriodEnd;
  const entitlements =
    usage?.entitlements || account.entitlements || account.session?.entitlements;
  const usageResources = usage?.usage?.resources || [];
  const modules = entitlements?.modules || [];

  return (
    <main className="professional-account-page" id="main-content">
      <PageMeta
        title="ARCUS Professional Account"
        description={copy.subtitle}
      />

      <Navbar />

      <section className="professional-account-shell">
        <header className="professional-account-header">
          <div>
            <span>{copy.account}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="professional-account-header-actions">
            <span className={account.syncLimited ? "limited" : "synced"}>
              {account.syncLimited ? "Limited sync" : copy.synced}
            </span>
            <Link to="/professional">{copy.back}</Link>
          </div>
        </header>

        <section className="professional-account-plan">
          <div>
            <span>{copy.plan}</span>
            <h2>ARCUS {organization.plan}</h2>
            <p>
              {account.syncLimited
                ? copy.limited
                : isCancelling
                ? copy.cancellationHelp
                : copy.cancelHelp}
            </p>
          </div>
          <div className={isCancelling ? "scheduled" : "active"}>
            <span>{copy.status}</span>
            <strong>
              {isCancelling
                ? copy.cancellationActive
                : organization.status}
            </strong>
          </div>
        </section>

        <section className="professional-account-body">
          <div className="professional-account-main">
            <div className="professional-account-section-label">
              {copy.overview}
            </div>

            <section className="professional-account-grid">
              <article>
                <span>{copy.organization}</span>
                <strong>{organization.name}</strong>
                <p>{organization.slug}</p>
              </article>
              <article>
                <span>{copy.renewal}</span>
                <strong>
                  {formatDate(organization.planRenewsAt, language)}
                </strong>
                <p>{copy.exports}: {organization.exportLimit}</p>
              </article>
            </section>

            <section className="professional-account-usage">
              <div className="professional-account-section-label">
                {copy.usage}
              </div>
              <p>{copy.usageHelp}</p>
              <div className="professional-account-usage-grid">
                {usageResources.length ? (
                  usageResources.map((resource) => {
                    const limit = Number.isFinite(resource.limit)
                      ? resource.limit
                      : 0;
                    const used = Number(resource.used || 0);
                    const percent = limit > 0
                      ? Math.min((used / limit) * 100, 100)
                      : 0;

                    return (
                      <article key={resource.key}>
                        <span>{resource.label}</span>
                        <strong>
                          {used} / {limit}
                        </strong>
                        <div
                          aria-hidden="true"
                          className="professional-account-usage-bar"
                        >
                          <i style={{ width: `${percent}%` }} />
                        </div>
                        <p>
                          {resource.remaining} {copy.remaining}
                        </p>
                      </article>
                    );
                  })
                ) : (
                  <article>
                    <span>{copy.usage}</span>
                    <strong>-</strong>
                    <p>{copy.limited}</p>
                  </article>
                )}
              </div>
            </section>

            <section className="professional-account-release">
              <div>
                <div className="professional-account-section-label">
                  {copy.exportRelease}
                </div>
                <p>{copy.exportReleaseHelp}</p>
              </div>
              <div className="professional-account-release-grid">
                <article>
                  <span>{copy.exportRelease}</span>
                  <strong>{release?.id || "-"}</strong>
                  <p>{release?.name || "-"}</p>
                </article>
                <article>
                  <span>Methodology</span>
                  <strong>{release?.methodologyVersion || "-"}</strong>
                  <p>{release?.publicRelease || "-"}</p>
                </article>
              </div>
              <div className="professional-account-export-list">
                <span>{copy.exportHistory}</span>
                {exportHistory.length ? (
                  exportHistory.slice(0, 5).map((item) => (
                    <article key={item.exportId}>
                      <div>
                        <strong>{item.type}</strong>
                        <p>{item.scopeLabel || item.filename}</p>
                      </div>
                      <div>
                        <span>{item.eventCount} events</span>
                        <p>{formatDateTime(item.createdAt, language)}</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <p>{copy.exportHistoryEmpty}</p>
                )}
              </div>
            </section>

            <section className="professional-account-modules">
              <div>
                <div className="professional-account-section-label">
                  {copy.includedModules}
                </div>
                <p>{copy.modulesHelp}</p>
              </div>
              <div>
                {modules.length ? (
                  modules.map((moduleName) => (
                    <span key={moduleName}>{moduleName}</span>
                  ))
                ) : (
                  <span>{organization.plan}</span>
                )}
              </div>
            </section>

            <section className="professional-account-cancellation">
              <div>
                <span>{isCancelling ? copy.cancellationActive : copy.cancel}</span>
                <p>
                  {isCancelling
                    ? copy.cancellationHelp
                    : copy.cancelHelp}
                </p>
              </div>
              <button
                className={isCancelling ? "resume" : "cancel"}
                disabled={updating || account.syncLimited}
                type="button"
                onClick={handlePlanAction}
              >
                {isCancelling ? copy.resume : copy.cancel}
              </button>
            </section>
          </div>

          <aside className="professional-account-side">
            <article>
              <span>{copy.signedInAs}</span>
              <strong>{username}</strong>
              <p>{copy.role}: {role}</p>
            </article>

            <article>
              <span>{copy.security}</span>
              <p>{copy.securityText}</p>
            </article>

            <section className="professional-account-sessions">
              <div>
                <span>{copy.sessions}</span>
                <p>{copy.sessionsText}</p>
              </div>
              <div className="professional-account-session-list">
                {sessions.length ? (
                  sessions.map((session, index) => (
                    <article
                      className={session.current ? "current" : ""}
                      key={`${session.expiresAt}-${index}`}
                    >
                      <strong>
                        {session.current
                          ? copy.sessionsCurrent
                          : session.role}
                      </strong>
                      <p>
                        {copy.sessionsExpires}:{" "}
                        {formatDateTime(session.expiresAt, language)}
                      </p>
                    </article>
                  ))
                ) : (
                  <p>{copy.sessionsEmpty}</p>
                )}
              </div>
              <button
                disabled={
                  sessionStatus === "submitting" ||
                  sessions.filter((session) => !session.current).length === 0
                }
                type="button"
                onClick={handleRevokeOtherSessions}
              >
                {copy.revokeOtherSessions}
              </button>
            </section>

            <form
              className="professional-account-password"
              onSubmit={handlePasswordChange}
            >
              <span>{copy.passwordChange}</span>
              <p>{copy.passwordText}</p>
              <label>
                <span>{copy.passwordCurrent}</span>
                <input
                  autoComplete="current-password"
                  name="currentPassword"
                  onChange={handlePasswordField}
                  required
                  type="password"
                  value={passwordForm.currentPassword}
                />
              </label>
              <label>
                <span>{copy.passwordNew}</span>
                <input
                  autoComplete="new-password"
                  minLength="8"
                  name="newPassword"
                  onChange={handlePasswordField}
                  required
                  type="password"
                  value={passwordForm.newPassword}
                />
              </label>
              <label>
                <span>{copy.passwordConfirm}</span>
                <input
                  autoComplete="new-password"
                  minLength="8"
                  name="confirmPassword"
                  onChange={handlePasswordField}
                  required
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </label>
              <button
                disabled={passwordStatus === "submitting"}
                type="submit"
              >
                {copy.passwordChange}
              </button>
            </form>

            <button type="button" onClick={handleSignOut}>
              {copy.signOut}
            </button>
          </aside>
        </section>

        {message && (
          <p className="professional-account-message" aria-live="polite">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
