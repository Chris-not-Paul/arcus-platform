import {
  lazy,
  Suspense,
  useState,
} from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LanguageProvider from "./context/LanguageProvider";

import IntroOverlay from "./components/layout/IntroOverlay";
import ScrollToTop from "./components/layout/ScrollToTop";

import "leaflet/dist/leaflet.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const AtlasPage = lazy(() => import("./pages/AtlasPage"));
const EventDossierPage = lazy(() => import("./pages/EventDossierPage"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const DataAccessPage = lazy(() => import("./pages/DataAccessPage"));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage"));
const ContributePage = lazy(() => import("./pages/ContributePage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RightsPage = lazy(() => import("./pages/RightsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PageLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--arcus-night)",
        color: "var(--arcus-text-on-dark)",
        fontFamily: "var(--arcus-font-display, system-ui, sans-serif)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      ARCUS
    </div>
  );
}

function OpenApp() {
  const [showIntro, setShowIntro] = useState(
    () => window.location.pathname === "/"
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      {showIntro && (
        <IntroOverlay onFinish={() => setShowIntro(false)} />
      )}

      <LanguageProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/atlas" element={<AtlasPage />} />
              <Route
                path="/atlas/events/:eventSlug"
                element={<EventDossierPage />}
              />
              <Route path="/methodology" element={<MethodologyPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/data-access" element={<DataAccessPage />} />
              <Route path="/contribute" element={<ContributePage />} />
              <Route
                path="/plans"
                element={<Navigate replace to="/data-access" />}
              />
              <Route path="/publications" element={<PublicationsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/rights" element={<RightsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </LanguageProvider>
    </>
  );
}

export default OpenApp;
