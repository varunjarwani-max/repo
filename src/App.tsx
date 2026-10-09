import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ScanProvider, useScanContext } from './context/ScanContext';
import Header from './components/Header';
import HonestyBanner from './components/HonestyBanner';
import FooterBar from './components/FooterBar';
import MobileTabBar from './components/MobileTabBar';
import ScanPage from './pages/ScanPage';
import AuditPage from './pages/AuditPage';
import SitesPage from './pages/SitesPage';
import HomePage from './pages/HomePage';
import DevTokensPage from './pages/DevTokensPage';
import EcoBotDrawer from './components/EcoBotDrawer';
import AboutPage from './pages/AboutPage';
import DeveloperPage from './pages/DeveloperPage';

const AppContent: React.FC = () => {
  const [isEcoBotOpen, setIsEcoBotOpen] = useState(false);
  const isHome = useLocation().pathname === '/';
  const { items, liveLatencyMs, scanData, cameraActive } = useScanContext();

  const toggleEcoBot = () => {
    setIsEcoBotOpen((prev) => !prev);
  };

  return (
    <div className="eco-app min-h-screen text-slate-100 flex flex-col font-sans">
      {/* Sticky Header */}
      <Header
        cameraLive={cameraActive}
        latencyMs={scanData ? liveLatencyMs : 0}
        itemCount={items.length}
        isEcoBotOpen={isEcoBotOpen}
        onToggleEcoBot={toggleEcoBot}
      />

      {/* Persistent Honesty Banner */}
      <HonestyBanner />

      {/* Main Content Area (padding bottom on mobile to accommodate bottom tab bar) */}
      <main className="flex-1 flex flex-col pb-16 md:pb-0 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/dev/tokens" element={<DevTokensPage />} />
          <Route path="/developers" element={<DeveloperPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer Status Bar */}
      {!isHome && <FooterBar
        scanId={scanData?.scanId}
        timestamp={scanData?.timestamp}
        modelVersion={scanData?.modelVersion}
      />}

      {/* Mobile Bottom Tab Bar (visible below 768px) */}
      <MobileTabBar
        isEcoBotOpen={isEcoBotOpen}
        onToggleEcoBot={toggleEcoBot}
      />

      {/* EcoBot Assistant Drawer */}
      <EcoBotDrawer
        isOpen={isEcoBotOpen}
        onClose={() => setIsEcoBotOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScanProvider>
        <AppContent />
      </ScanProvider>
    </BrowserRouter>
  );
};

export default App;
