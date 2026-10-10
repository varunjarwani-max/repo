import { ArrowUpRight, ScanLine, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PileSceneSvg from './PileSceneSvg';
import { ALL_MOCK_ITEMS } from '../data/mockData';
import { CATEGORY_META, HONESTY_STRINGS } from '../lib/constants';

const featuredItems = ALL_MOCK_ITEMS.slice(0, 3);

export default function ScanPreview() {
  const hazardousCount = ALL_MOCK_ITEMS.filter(item => item.isHazardous).length;
  return (
    <div className="hero-scan-preview" aria-label="Illustrated scan preview using demo data">
      <div className="preview-heading"><span><ScanLine size={17} aria-hidden="true" /> Material intelligence</span><span className="preview-demo">{HONESTY_STRINGS.demoTag}</span></div>
      <div className="preview-canvas">
        <PileSceneSvg />
        <span className="preview-scene-caption">ILLUSTRATED SAMPLE / NOT A LIVE SCAN</span>
        {featuredItems.map(item => {
          const meta = CATEGORY_META[item.category];
          const Icon = meta.icon;
          return <div className="preview-box" key={item.id} style={{ left: `${item.bbox.x * 100}%`, top: `${item.bbox.y * 100}%`, width: `${item.bbox.width * 100}%`, height: `${item.bbox.height * 100}%`, borderColor: meta.colorHex }}><span style={{ borderColor: meta.colorHex }}><Icon size={11} aria-hidden="true" />{String(item.itemNumber).padStart(2, '0')} · {meta.label}</span></div>;
        })}
      </div>
      <div className="preview-metrics"><div><strong>{ALL_MOCK_ITEMS.length}<small>items</small></strong><span>Illustrated sample</span></div><div><strong>{Object.keys(CATEGORY_META).length}<small>streams</small></strong><span>Material categories</span></div><div><strong>{hazardousCount}<small>flagged</small></strong><span>Potential hazards</span></div></div>
      <div className="preview-items">{featuredItems.map(item => {
        const meta = CATEGORY_META[item.category];
        const Icon = meta.icon;
        return <div className="preview-item" key={item.id}><span className={`preview-item-icon ${meta.badgeClass}`}><Icon size={17} aria-hidden="true" /></span><div><strong>{item.label}</strong><span>{item.material} · {meta.label}</span></div><span className="preview-directive">{item.isHazardous ? 'Keep separate' : item.targetBin}<ArrowUpRight size={13} aria-hidden="true" /></span></div>;
      })}</div>
      <div className="preview-footer"><span><ShieldCheck size={14} aria-hidden="true" /> {HONESTY_STRINGS.visibleTopLayerNotice}</span><Link to="/scan">Explore the scanner <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    </div>
  );
}
