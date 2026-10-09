import {
  lazy,
  Suspense,
  useState,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const AtlasPage = lazy(() => import("./pages/AtlasPage"));
const EventDossierPage = lazy(() => import("./pages/EventDossierPage"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DataAccessPage = lazy(() => import("./pages/DataAccessPage"));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ContributePage = lazy(() => import("./pages/ContributePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RightsPage = lazy(() => import("./pages/RightsPage"));

import LanguageProvider from "./context/LanguageProvider";

import IntroOverlay from "./components/layout/IntroOverlay";
import ProfessionalGate from "./components/auth/ProfessionalGate";
import ScrollToTop from "./components/layout/ScrollToTop";
import { accountsEnabled } from "./config/site";

import "leaflet/dist/leaflet.css";

function PageLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--arcus-night)",
        color: "var(--arcus-text-on-dark)",
        fontFamily:
          "var(--arcus-font-display, system-ui, sans-serif)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      ARCUS
    </div>
  );
}

function App() {

  const [showIntro, setShowIntro] = useState(() => window.location.pathname === "/");
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
      >
        Skip to content
      </a>

      {showIntro && (
        <IntroOverlay
          onFinish={() => setShowIntro(false)}
        />
      )}

      <LanguageProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoading />}>
            <Routes>

          {/* HOME */}
          <Route
            path="/"
            element={<HomePage />}
          />

          {/* ATLAS */}
          <Route
            path="/atlas"
            element={<AtlasPage />}
          />

          <Route
            path="/atlas/events/:eventSlug"
            element={<EventDossierPage />}
          />

          {/* METHODOLOGY */}
          <Route
            path="/methodology"
            element={<MethodologyPage />}
          />

          {/* ANALYTICS */}
          <Route
            path="/analytics"
            element={<AnalyticsPage />}
          />

          <Route
            path="/analytics/pro"
            element={<Navigate replace to="/analytics" />}
          />

          <Route
            path="/data-access"
            element={<DataAccessPage />}
          />

          <Route
            path="/contribute"
            element={<ContributePage />}
          />

          <Route
            path="/plans"
            element={<Navigate replace to="/data-access" />}
          />

          <Route
            path="/professional/*"
            element={<Navigate replace to="/data-access" />}
          />

          {accountsEnabled && (
            <Route
              path="/account"
              element={<AccountPage />}
            />
          )}

          {accountsEnabled && (
            <Route
              path="/admin"
              element={
                <ProfessionalGate
                  label="ARCUS ADMIN"
                  permission="admin:access"
                >
                  <AdminPage />
                </ProfessionalGate>
              }
            />
          )}

          {/* PUBLICATIONS */}
          <Route
            path="/publications"
            element={<PublicationsPage />}
          />

          {/* ABOUT */}
          <Route
            path="/about"
            element={<AboutPage />}
          />

          <Route
            path="/privacy"
            element={<PrivacyPage />}
          />

          <Route
            path="/rights"
            element={<RightsPage />}
          />

          <Route
            path="*"
            element={<NotFoundPage />}
          />

            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </>
  );
}

export default App;
