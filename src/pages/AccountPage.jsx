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
  getSession,
  loginAccount,
  logoutProfessional,
  registerFreeAccount,
  requestProfessionalAccess,
} from "../utils/apiClient";

import "../styles/platform-levels.css";

function emptyCredentials() {
  return {
    password: "",
    username: "",
  };
}

function emptyAccessRequest() {
  return {
    message: "",
    organization: "",
    role: "",
  };
}

export default function AccountPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState("register");
  const [session, setSession] = useState(null);
  const [credentials, setCredentials] =
    useState(emptyCredentials);
  const [accessRequest, setAccessRequest] =
    useState(emptyAccessRequest);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle");

  const copy = language === "it"
    ? {
        atlas: "Apri Atlas",
        benefitOne: "Salva preferenze e viste pubbliche",
        benefitTwo: "Mantieni separato il livello Open dai dati Professional",
        checking: "ARCUS ACCOUNT",
        create: "Crea account free",
        email: "Email",
        failed:
          "Non riesco a completare l'operazione. Verifica email e password.",
        free: "Account Open",
        intro:
          "Usa ARCUS Open senza login. Crea un account free solo se vuoi salvare preferenze, viste e futuri aggiornamenti senza accedere al database Professional.",
        login: "Accedi",
        logout: "Esci",
        password: "Password",
        professional: "Richiedi accesso Professional",
        requestContext: "Esigenza operativa",
        requestFailed:
          "Non riesco a inviare la richiesta. Riprova tra poco.",
        requestIntro:
          "Lascia una traccia essenziale: ente, ruolo e obiettivo. Un amministratore potra valutare l'abilitazione Professional senza esporre il database riservato.",
        requestOrganization: "Ente o organizzazione",
        requestRole: "Ruolo",
        requestSent:
          "Richiesta inviata. Sara visibile nel pannello Admin ARCUS.",
        requestSubmit: "Invia richiesta",
        requestTitle: "Accesso Professional",
        signed:
          "Il tuo account e attivo. Il livello Open resta separato dagli output Professional.",
        submitLogin: "Accedi all'account",
        submitRegister: "Crea account",
        title: "Account free per il layer Open.",
      }
    : {
        atlas: "Open Atlas",
        benefitOne: "Save public preferences and views",
        benefitTwo: "Keep the Open layer separate from Professional data",
        checking: "ARCUS ACCOUNT",
        create: "Create free account",
        email: "Email",
        failed:
          "The operation could not be completed. Check email and password.",
        free: "Open account",
        intro:
          "Use ARCUS Open without signing in. Create a free account only if you want to save preferences, views and future updates without accessing the Professional database.",
        login: "Sign in",
        logout: "Sign out",
        password: "Password",
        professional: "Request Professional access",
        requestContext: "Operational need",
        requestFailed:
          "The access request could not be submitted. Try again shortly.",
        requestIntro:
          "Leave a concise trace: organization, role and intended use. An administrator can review Professional access without exposing the restricted database.",
        requestOrganization: "Organization",
        requestRole: "Role",
        requestSent:
          "Request submitted. It is now visible in ARCUS Admin.",
        requestSubmit: "Submit request",
        requestTitle: "Professional access",
        signed:
          "Your account is active. The Open layer remains separate from Professional outputs.",
        submitLogin: "Sign in",
        submitRegister: "Create account",
        title: "Free account for the Open layer.",
      };

  useEffect(() => {
    let active = true;

    getSession()
      .then((nextSession) => {
        if (active) {
          setSession(nextSession);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("ready");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setCredentials((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAccessRequestChange = (event) => {
    const { name, value } = event.target;

    setAccessRequest((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage("");
    setStatus("submitting");

    const request =
      mode === "register"
        ? registerFreeAccount
        : loginAccount;

    request(credentials)
      .then((nextSession) => {
        setSession(nextSession);
        setCredentials(emptyCredentials());
        setStatus("ready");
      })
      .catch(() => {
        setMessage(copy.failed);
        setStatus("ready");
      });
  };

  const handleLogout = () => {
    logoutProfessional()
      .catch(() => null)
      .finally(() => {
        setSession(null);
        navigate("/account");
      });
  };

  const handleAccessRequest = (event) => {
    event.preventDefault();
    setRequestMessage("");
    setRequestStatus("submitting");

    requestProfessionalAccess({
      email: session?.username,
      message: accessRequest.message,
      organization: accessRequest.organization,
      role: accessRequest.role,
      source: "account",
    })
      .then(() => {
        setAccessRequest(emptyAccessRequest());
        setRequestMessage(copy.requestSent);
        setRequestStatus("sent");
      })
      .catch(() => {
        setRequestMessage(copy.requestFailed);
        setRequestStatus("idle");
      });
  };

  if (status === "loading") {
    return (
      <main className="professional-auth-loading">
        {copy.checking}
      </main>
    );
  }

  const isAuthenticated = Boolean(session?.authenticated);
  const hasWildcard =
    session?.permissions?.includes("*");
  const isProfessional =
    hasWildcard ||
    session?.permissions?.includes("professional:read");

  return (
    <main className="account-page" id="main-content">
      <PageMeta
        title="ARCUS Account"
        description={copy.intro}
      />

      <Navbar />

      <section className="account-shell">
        <div className="account-copy">
          <span>{copy.free}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <div className="account-benefits">
            <span>{copy.benefitOne}</span>
            <span>{copy.benefitTwo}</span>
          </div>
        </div>

        {isAuthenticated ? (
          <section className="account-status-panel">
            <span>
              {isProfessional
                ? "ARCUS PROFESSIONAL"
                : "ARCUS OPEN"}
            </span>
            <h2>{session.username}</h2>
            <p>{copy.signed}</p>
            <div className="account-actions">
              <Link to="/atlas">{copy.atlas}</Link>
              {isProfessional ? (
                <Link to="/professional/account">
                  Professional
                </Link>
              ) : (
                <a href="#professional-access-request">
                  {copy.professional}
                </a>
              )}
              <button type="button" onClick={handleLogout}>
                {copy.logout}
              </button>
            </div>
            {!isProfessional && (
              <form
                className="account-request-form"
                id="professional-access-request"
                onSubmit={handleAccessRequest}
              >
                <span>{copy.requestTitle}</span>
                <p>{copy.requestIntro}</p>
                <label>
                  <span>{copy.requestOrganization}</span>
                  <input
                    name="organization"
                    onChange={handleAccessRequestChange}
                    placeholder="Comune / Universita / Gestore"
                    value={accessRequest.organization}
                  />
                </label>
                <label>
                  <span>{copy.requestRole}</span>
                  <input
                    name="role"
                    onChange={handleAccessRequestChange}
                    placeholder="Asset manager / Ricercatore / Tecnico"
                    value={accessRequest.role}
                  />
                </label>
                <label>
                  <span>{copy.requestContext}</span>
                  <textarea
                    name="message"
                    onChange={handleAccessRequestChange}
                    placeholder="Screening territoriale, priorita di intervento, analisi inventario..."
                    rows="4"
                    value={accessRequest.message}
                  />
                </label>
                {requestMessage && (
                  <p className="account-message" aria-live="polite">
                    {requestMessage}
                  </p>
                )}
                <button
                  disabled={requestStatus === "submitting"}
                  type="submit"
                >
                  {copy.requestSubmit}
                </button>
              </form>
            )}
          </section>
        ) : (
          <form
            className="account-form"
            onSubmit={handleSubmit}
          >
            <div className="account-mode">
              <button
                className={
                  mode === "register" ? "active" : ""
                }
                onClick={() => setMode("register")}
                type="button"
              >
                {copy.create}
              </button>
              <button
                className={mode === "login" ? "active" : ""}
                onClick={() => setMode("login")}
                type="button"
              >
                {copy.login}
              </button>
            </div>

            <label>
              <span>{copy.email}</span>
              <input
                autoComplete="email"
                name="username"
                onChange={handleChange}
                required
                type="email"
                value={credentials.username}
              />
            </label>

            <label>
              <span>{copy.password}</span>
              <input
                autoComplete={
                  mode === "register"
                    ? "new-password"
                    : "current-password"
                }
                minLength={mode === "register" ? 8 : 1}
                name="password"
                onChange={handleChange}
                required
                type="password"
                value={credentials.password}
              />
            </label>

            {message && (
              <p className="account-message" aria-live="polite">
                {message}
              </p>
            )}

            <button
              disabled={status === "submitting"}
              type="submit"
            >
              {mode === "register"
                ? copy.submitRegister
                : copy.submitLogin}
            </button>

            <Link to="/professional/login">
              {copy.professional}
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
