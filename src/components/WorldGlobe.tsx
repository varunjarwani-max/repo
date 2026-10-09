import { useEffect, useRef, useState } from 'react';
import createGlobe, { type Globe } from 'cobe';
import { ArrowDown, Globe2, MapPin, Pause, Play, RotateCcw } from 'lucide-react';
import { GHAZIPUR_LOCATION, INDIA_FOCUS } from '../data/indiaWasteData';
import '../india-story.css';

interface WorldGlobeProps {
  paused: boolean;
  onToggleMotion: () => void;
}

const INDIA_VIEW = {
  phi: 3 * Math.PI / 2 - INDIA_FOCUS.longitude * Math.PI / 180,
  theta: INDIA_FOCUS.latitude * Math.PI / 180,
  scale: 1.7,
};
const WORLD_VIEW = { phi: 2.4, theta: 0.15, scale: 1 };

export default function WorldGlobe({ paused, onToggleMotion }: WorldGlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const viewRef = useRef({ ...WORLD_VIEW });
  const [focused, setFocused] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [available, setAvailable] = useState(true);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) {
      setAvailable(false);
      return () => host.replaceChildren();
    }
    const size = host.getBoundingClientRect().width;
    let globe: Globe;
    try {
      globe = createGlobe(canvas, {
        width: size, height: size, devicePixelRatio: Math.min(window.devicePixelRatio, 2),
        ...viewRef.current, dark: 1, diffuse: 1.8, mapSamples: 24000,
        mapBrightness: 5, mapBaseBrightness: 0.04,
        baseColor: [0.16, 0.23, 0.18], markerColor: [0.72, 0.93, 0.57], glowColor: [0.14, 0.23, 0.16],
        markers: [{ location: GHAZIPUR_LOCATION, size: 0.055 }],
      });
    } catch {
      setAvailable(false);
      return () => host.replaceChildren();
    }
    globeRef.current = globe;
    setAvailable(true);
    setReady(true);
    const resize = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width > 0) globe.update({ width, height: width });
    });
    resize.observe(host);
    const handleContextLost = (event: Event) => { event.preventDefault(); setAvailable(false); setReady(false); };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    return () => {
      resize.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      globeRef.current = null;
      globe.destroy();
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (focused || !ready || paused) return;
    if (reducedMotion) { setFocused(true); return; }
    const delay = viewRef.current.scale > WORLD_VIEW.scale + 0.05 ? 3000 : 1600;
    const timer = window.setTimeout(() => setFocused(true), delay);
    return () => window.clearTimeout(timer);
  }, [focused, paused, ready, reducedMotion]);

  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const target = focused ? INDIA_VIEW : WORLD_VIEW;
    if (reducedMotion) {
      viewRef.current = { ...target };
      globeRef.current.update(target);
      setArrived(focused);
      return;
    }
    if (paused) return;
    const start = { ...viewRef.current };
    let frame = 0;
    let started: number | undefined;
    const animate = (timestamp: number) => {
      if (started === undefined) started = timestamp;
      const progress = Math.min((timestamp - started) / 2400, 1);
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      const view = {
        phi: start.phi + (target.phi - start.phi) * eased,
        theta: start.theta + (target.theta - start.theta) * eased,
        scale: start.scale + (target.scale - start.scale) * eased,
      };
      viewRef.current = view;
      globeRef.current?.update(view);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else setArrived(focused);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [focused, paused, ready, reducedMotion]);

  const replay = () => { setArrived(false); setFocused(false); };

  return (
    <div className={`world-stage india-world ${arrived ? 'india-world-focused' : ''}`} data-globe-view={arrived ? 'india' : 'journey'}>
      <div className="world-art">
        <div className="world-stars" aria-hidden="true" /><div className="world-halo" aria-hidden="true" />
        <div className="india-globe-viewport" role="img" aria-label="Geographic globe rotating and zooming toward India, with a marker at Ghazipur landfill in Delhi"><div className="india-globe-host" ref={hostRef} /></div>
        {!available && <div className="india-globe-fallback"><Globe2 size={45} aria-hidden="true" /><strong>India in focus</strong><span>Interactive globe unavailable on this device.</span></div>}
        <div className="india-globe-eyebrow"><span /> {arrived ? 'IN FOCUS / INDIA' : 'A WORLD OF WASTE / A CLOSER LOOK'}</div>
        <a className="india-globe-label" href="#india-story"><MapPin size={16} aria-hidden="true" /><span>Ghazipur · Delhi<small>Landfill photo archive · 2013</small></span><ArrowDown size={14} aria-hidden="true" /></a>
        <span className="world-caption" aria-live="polite">{arrived ? 'INDIA · 22.6° N / 79.0° E' : 'FROM ONE PLANET TO ONE PLACE'}</span>
      </div>
      <div className="world-controls">
        <button type="button" onClick={arrived ? replay : () => setFocused(true)} disabled={!available || !ready} aria-label={arrived ? 'Replay globe journey to India' : 'Zoom globe to India'}>{arrived ? <RotateCcw size={12} aria-hidden="true" /> : <MapPin size={12} aria-hidden="true" />}<span>{arrived ? 'Replay journey' : 'Zoom to India'}</span></button>
        <button type="button" onClick={onToggleMotion} aria-pressed={paused} aria-label={paused ? 'Resume page animations' : 'Pause page animations'}>{paused ? <Play size={12} aria-hidden="true" /> : <Pause size={12} aria-hidden="true" />}<span>{paused ? 'Resume motion' : 'Pause motion'}</span></button>
        <span>GEOGRAPHIC VIEW · NOT A LIVE LANDFILL FEED</span>
      </div>
    </div>
  );
}
