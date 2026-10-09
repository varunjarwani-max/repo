import { useState } from 'react';
import { ArrowUpRight, ArrowRight, ScanLine, Recycle, Leaf, Box, Pause, Play, Cloud, ExternalLink } from 'lucide-react';
import { useScanContext } from '../context/ScanContext';
import { HONESTY_STRINGS } from '../lib/constants';

interface ScanHeroProps {
  onScan: () => void;
  onUpload: () => void;
  isAnalysing: boolean;
}

export default function ScanHero({ onScan, onUpload, isAnalysing }: ScanHeroProps) {
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
          <button className="eco-button primary" onClick={onScan} disabled={isAnalysing}><ScanLine size={16} />{isAnalysing ? 'Analysing sample…' : 'Start a demo scan'}<ArrowRight size={15} /></button>
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
        <span><Cloud size={15} /><strong>Your AWS building block</strong><span className="cloud-divider">/</span> Amazon Bedrock + Nova image understanding <span className="proposed-pill">{backendStatus === 'connected' ? HONESTY_STRINGS.liveTag : 'Prepared · demo mode'}</span></span>
        <button onClick={() => setShowArchitecture(!showArchitecture)} aria-expanded={showArchitecture}>Explore architecture <ArrowUpRight size={14} /></button>
      </div>
      {showArchitecture && <div className="architecture-details"><div><strong>Photo → API Gateway → Lambda → Amazon Bedrock</strong><p>Use Amazon Nova Lite or Pro to classify visible waste and return bounding boxes. Validate the JSON in Lambda, keep uploaded images private in S3, and retain a human-review step for hazardous items. Deploy this Vite frontend with AWS Amplify Hosting.</p><p>AWS deployment code is included. Only a successful uploaded-photo scan shows Live backend; sample scans remain demo data. Image-based estimates need validation before operational use.</p></div><a href="https://docs.aws.amazon.com/nova/latest/userguide/modalities-image.html" target="_blank" rel="noreferrer">AWS image understanding docs <ExternalLink size={14} /></a></div>}
    </section>
  );
}
