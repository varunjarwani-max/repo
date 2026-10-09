import { ArrowUpRight, Leaf, Pause, Play, Recycle } from 'lucide-react';

interface WorldGlobeProps {
  paused: boolean;
  onToggleMotion: () => void;
}

export default function WorldGlobe({ paused, onToggleMotion }: WorldGlobeProps) {
  return (
    <div className="world-stage">
      <div className="world-art" role="img" aria-label="An artistic green Earth with orbiting rings, symbolising a more circular world">
        <div className="world-stars" />
        <div className="world-halo" />
        <div className="world-orbit world-orbit-back" />
        <div className="world-sphere">
          <div className="world-surface" />
          <div className="world-light" />
          <div className="world-latitude" />
          <div className="world-latitude world-latitude-top" />
          <div className="world-meridian" />
          <div className="world-meridian world-meridian-second" />
        </div>
        <div className="world-orbit world-orbit-front"><span /></div>
        <div className="world-satellite"><Recycle size={18} strokeWidth={1.5} /></div>
        <div className="world-label world-label-first"><span className="world-label-icon"><Recycle size={15} /></span><span>A second life.<small>Not a second thought.</small></span><ArrowUpRight size={14} /></div>
        <div className="world-label world-label-second"><Leaf size={14} /><span>Change starts at home</span></div>
        <div className="world-cross world-cross-one" /><div className="world-cross world-cross-two" />
        <span className="world-caption">ONE PLANET. EVERYDAY POSSIBILITIES.</span>
      </div>
      <div className="world-controls">
        <span>ARTISTIC EARTH · NOT LIVE IMPACT DATA</span>
        <button type="button" onClick={onToggleMotion} aria-pressed={paused} aria-label={paused ? 'Resume page animations' : 'Pause page animations'}>
          {paused ? <Play size={12} /> : <Pause size={12} />}<span>{paused ? 'Resume motion' : 'Pause motion'}</span>
        </button>
      </div>
    </div>
  );
}
