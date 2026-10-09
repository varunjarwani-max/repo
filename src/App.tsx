import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ScanProvider, useScanContext } from './context/ScanContext';
import Header from './components/Header';
import HonestyBanner from './components/HonestyBanner';
import FooterBar from './components/FooterBar';
import MobileTabBar from './components/MobileTabBar';
import ScanPage from './pages/ScanPage';
import AuditPage from './pages/AuditPage';
import SitesPage from './pages/SitesPage';
import RobotApiPage from './pages/RobotApiPage';
import DevTokensPage from './pages/DevTokensPage';
import EcoBotDrawer from './components/EcoBotDrawer';
import AboutPage from './pages/AboutPage';

const AppContent: React.FC = () => {
  const [isEcoBotOpen, setIsEcoBotOpen] = useState(false);
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
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/robot-api" element={<RobotApiPage />} />
          <Route path="/dev/tokens" element={<DevTokensPage />} />
          <Route path="*" element={<Navigate to="/scan" replace />} />
        </Routes>
      </main>

      {/* Footer Status Bar */}
      <FooterBar
        scanId={scanData?.scanId}
        timestamp={scanData?.timestamp}
        modelVersion={scanData?.modelVersion}
      />

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
