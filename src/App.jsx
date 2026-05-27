import {
  lazy,
  Suspense,
  useState,
} from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

const HomePage = lazy(() => import("./pages/HomePage"));
const AtlasPage = lazy(() => import("./pages/AtlasPage"));
const MethodologyPage = lazy(() => import("./pages/MethodologyPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const PremiumAnalyticsPage = lazy(() => import("./pages/PremiumAnalyticsPage"));
const PublicationsPage = lazy(() => import("./pages/PublicationsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const ProfessionalPage = lazy(() => import("./pages/ProfessionalPage"));
const EnterprisePage = lazy(() => import("./pages/EnterprisePage"));

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
            element={<PremiumAnalyticsPage />}
          />

          <Route
            path="/professional"
            element={<ProfessionalPage />}
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
