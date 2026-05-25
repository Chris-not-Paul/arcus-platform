import { useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import AtlasPage from "./pages/AtlasPage";
import MethodologyPage from "./pages/MethodologyPage";
import AboutPage from "./pages/AboutPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import PremiumAnalyticsPage from "./pages/PremiumAnalyticsPage";
import PublicationsPage from "./pages/PublicationsPage";
import NotFoundPage from "./pages/NotFoundPage";

import LanguageProvider from "./context/LanguageProvider";

import IntroOverlay from "./components/layout/IntroOverlay";
import ScrollToTop from "./components/layout/ScrollToTop";

import "leaflet/dist/leaflet.css";

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
        </BrowserRouter>
      </LanguageProvider>
    </>
  );
}

export default App;
