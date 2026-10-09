import { useState } from 'react';
import { ArrowUpRight, ArrowRight, ScanLine, Recycle, Leaf, Box, Pause, Play, Cloud, ExternalLink } from 'lucide-react';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS } from '../lib/constants';

interface ScanHeroProps {
  onScan: () => void;
  onUpload: () => void;
  isAnalysing: boolean;
  cameraActive?: boolean;
  cameraOpening?: boolean;
}

export default function ScanHero({ onScan, onUpload, isAnalysing, cameraActive = false, cameraOpening = false }: ScanHeroProps) {
  const { backendStatus } = useScanContext();
  const [paused, setPaused] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);
  return (
    <section className="scan-hero">
      <div className="hero-copy">
        <span className="eyebrow"><span className="status-dot" /> A SMALL SCAN. A BIGGER IMPACT.</span>
        <h1>Waste is only waste.<br /><span>Until you see its potential.</span></h1>
        <p>Turn a pile of waste into a plan. Identify materials, flag hazards, and discover what deserves a second life.</p>
        <div className="hero-actions">
          <button className="eco-button primary" onClick={onScan} disabled={isAnalysing || cameraOpening}><ScanLine size={16} />{isAnalysing ? 'Analysing frame…' : cameraOpening ? 'Opening camera…' : cameraActive ? 'Capture & analyse' : 'Scan with camera'}<ArrowRight size={15} /></button>
          <button className="eco-button secondary" onClick={onUpload} disabled={isAnalysing}>Upload a photo <ArrowUpRight size={16} /></button>
        </div>
        <div className="hero-footnote"><Leaf size={13} /> Built for a more circular world <span>·</span> Environmental Hacks 2026</div>
      </div>
      <div className={`orbital-scene ${paused ? 'is-paused' : ''}`}>
        <div className="orbital-art" aria-hidden="true">
          <div className="orbital-grid" />
          <div className="planet-shadow" />
          <div className="planet-orbit orbit-one" /><div className="planet-orbit orbit-two" />
          <div className="glass-planet">
            <div className="planet-wireframe">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotateY(${i * 22.5}deg)` }} />)}</div>
            <div className="planet-latitude latitude-one" /><div className="planet-latitude latitude-two" /><div className="planet-latitude latitude-three" />
            <Recycle className="planet-symbol" strokeWidth={1.4} />
            <div className="planet-shine" />
          </div>
          <div className="orbit-particle particle-one" /><div className="orbit-particle particle-two" />
          <div className="floating-label label-material"><Box size={14} /><span>Materials recovered<small>A second life starts here</small></span><ArrowUpRight size={14} /></div>
          <div className="floating-label label-circular"><Leaf size={14} /><span>Designed for circularity</span></div>
          <span className="scene-coordinate">CIRCULAR INTELLIGENCE / 01</span>
        </div>
        <button className="motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play 3D animation' : 'Pause 3D animation'}>{paused ? <Play size={12} /> : <Pause size={12} />}</button>
      </div>
      <div className="cloud-strip">
        <span><Cloud size={15} /><strong>Gemini image understanding</strong><span className="cloud-divider">/</span> Server-side frame analysis <span className="proposed-pill">{backendStatus === 'connected' ? HONESTY_STRINGS.liveTag : 'Ready for capture'}</span></span>
        <button onClick={() => setShowArchitecture(!showArchitecture)} aria-expanded={showArchitecture}>Explore architecture <ArrowUpRight size={14} /></button>
      </div>
      {showArchitecture && <div className="architecture-details"><div><strong>Camera frame → server endpoint → Gemini → validated detections</strong><p>Only a captured frame or uploaded photo is sent to Gemini. The API key stays on the server. Results include estimated boxes, materials and sorting guidance; no video is continuously streamed to the model.</p><p>Add GEMINI_API_KEY in project environment variables. Images and scans are not saved to a database. Robot API exports the current results, never hardware commands. The older AWS backend remains optional via VITE_API_URL.</p></div><a href="https://ai.google.dev/gemini-api/docs/image-understanding" target="_blank" rel="noreferrer">Gemini image understanding docs <ExternalLink size={14} /></a></div>}
    </section>
  );
}
