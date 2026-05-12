import "../styles/home/HomePage.css";

import Navbar from "../components/layout/Navbar";

import HeroSection from "../components/home/HeroSection";
import CredibilitySection from "../components/home/CredibilitySection";
import LiveDatasetSection from "../components/home/LiveDatasetSection";
import WhySection from "../components/home/WhySection";
import BreathingSection from "../components/home/BreathingSection";
import AtlasIntelligenceSection from "../components/home/AtlasIntelligenceSection";
import MethodologySection from "../components/home/MethodologySection";
import PipelineSection from "../components/home/PipelineSection";

export default function HomePage() {

  return (
    <main className="home-page">

      <Navbar />

      {/* HERO */}

      <HeroSection />

      {/* RESEARCH INFRASTRUCTURE */}

      <CredibilitySection />

      {/* LIVE DATASET */}

      <LiveDatasetSection />

      {/* WHY ARCUS */}

      <WhySection />

      {/* BREATHING SECTION */}

      <BreathingSection />

      {/* ATLAS INTELLIGENCE */}

      <AtlasIntelligenceSection />

      {/* METHODOLOGY */}

      <MethodologySection />

      {/* PIPELINE */}

      <PipelineSection />

    </main>
  );
}