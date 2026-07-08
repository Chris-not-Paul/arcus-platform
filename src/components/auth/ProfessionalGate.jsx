import {
  useEffect,
  useState,
} from "react";

import { Navigate } from "react-router-dom";

import { getSession } from "../../utils/apiClient";

function ProfessionalGate({
  children,
  label = "ARCUS PROFESSIONAL",
  permission = "professional:read",
}) {
  const [state, setState] = useState("checking");

  useEffect(() => {
    let active = true;

    getSession()
      .then((session) => {
        if (!active) {
          return;
        }

        setState(
          session.authenticated &&
            (session.permissions?.includes(permission) ||
              session.permissions?.includes("*"))
            ? "authenticated"
            : "anonymous"
        );
      })
      .catch(() => {
        if (active) {
          setState("anonymous");
        }
      });

    return () => {
      active = false;
    };
  }, [permission]);

  if (state === "checking") {
    return (
      <main className="professional-auth-loading">
        {label}
      </main>
    );
  }

  if (state === "anonymous") {
    return (
      <Navigate
        replace
        to="/professional/login"
      />
    );
  }

  return children;
}

export default ProfessionalGate;
