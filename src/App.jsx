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
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DataAccessPage = lazy(() => import("./pages/DataAccessPage"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ProfessionalPage = lazy(() => import("./pages/ProfessionalPage"));
const EnterprisePage = lazy(() => import("./pages/EnterprisePage"));
const ReportMapPath01 = lazy(() => import("./pages/ReportMapPath01"));

import LanguageProvider from "./context/LanguageProvider";

import IntroOverlay from "./components/layout/IntroOverlay";
import ScrollToTop from "./components/layout/ScrollToTop";

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

  const [showIntro, setShowIntro] = useState(true);
  const isReportExportRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/report-map/") ||
      window.location.pathname.startsWith("/professional/atlas-export/"));

  return (
    <>
      {!isReportExportRoute && (
        <a
          className="skip-link"
          href="#main-content"
        >
          Skip to content
        </a>
      )}

      {!isReportExportRoute && showIntro && (
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
            element={<Navigate replace to="/professional" />}
          />

          <Route
            path="/data-access"
            element={<DataAccessPage />}
          />

          <Route
            path="/plans"
            element={<PlansPage />}
          />

          <Route
            path="/professional"
            element={<ProfessionalPage />}
          />

          <Route
            path="/report-map/path01"
            element={<ReportMapPath01 />}
          />

          <Route
            path="/professional/atlas-export/path01"
            element={<ReportMapPath01 />}
          />

          <Route
            path="/enterprise"
            element={<EnterprisePage />}
          />

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
