import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  loginProfessional,
} from "../utils/apiClient";

import "../styles/platform-levels.css";

function ProfessionalLoginPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const copy =
    language === "it"
      ? {
          eyebrow: "ARCUS PROFESSIONAL",
          title: "Accesso controllato alla console operativa.",
          text:
            "Il database live, i layer Professional e gli export operativi sono disponibili solo dentro sessioni autorizzate.",
          username: "Username",
          password: "Password",
          submit: "Accedi",
          submitting: "Verifica...",
          error:
            "Credenziali non valide o sessione non disponibile.",
          free: "Crea un account free",
          open: "Torna al layer Open",
        }
      : {
          eyebrow: "ARCUS PROFESSIONAL",
          title: "Controlled access to the operational console.",
          text:
            "The live evidence base, Professional layers and operational exports are available only inside authorised sessions.",
          username: "Username",
          password: "Password",
          submit: "Sign in",
          submitting: "Checking...",
          error:
            "Invalid credentials or session unavailable.",
          free: "Create a free account",
          open: "Return to Open layer",
        };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    loginProfessional({
      password,
      username,
    })
      .then(() => {
        navigate("/professional", {
          replace: true,
        });
      })
      .catch(() => {
        setError(copy.error);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <main
      className="professional-login-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Professional Login"
        description={copy.text}
      />

      <Navbar />

      <section className="professional-login-shell">
        <div className="professional-login-copy">
          <span>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.text}</p>
        </div>

        <form
          className="professional-login-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>{copy.username}</span>
            <input
              autoComplete="username"
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
              type="text"
              value={username}
            />
          </label>

          <label>
            <span>{copy.password}</span>
            <input
              autoComplete="current-password"
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              type="password"
              value={password}
            />
          </label>

          {error && (
            <p className="professional-login-error">
              {error}
            </p>
          )}

          <button
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? copy.submitting
              : copy.submit}
          </button>

          <a href="/atlas">{copy.open}</a>
          <a href="/account">{copy.free}</a>
        </form>
      </section>
    </main>
  );
}

export default ProfessionalLoginPage;
