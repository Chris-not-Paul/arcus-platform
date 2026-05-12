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
import PublicationsPage from "./pages/PublicationsPage";

import IntroOverlay from "./components/layout/IntroOverlay";

import "leaflet/dist/leaflet.css";

function App() {

  const [showIntro, setShowIntro] = useState(true);

  return (
    <>
      {showIntro && (
        <IntroOverlay
          onFinish={() => setShowIntro(false)}
        />
      )}

      <BrowserRouter>
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

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;