import { ScanLine, Recycle, TriangleAlert, IndianRupee, ArrowUpRight } from 'lucide-react';
import { Item } from '../types';
import { CATEGORY_COLORS } from '../lib/constants';

export default function ScanOverview({ items }: { items: Item[] }) {
  const weight = items.reduce((sum, item) => sum + item.weightGrams, 0);
  const recovered = items.filter(item => item.category === 'recyclable').reduce((sum, item) => sum + item.weightGrams, 0);
  const hazards = items.filter(item => item.isHazardous).length;
  const minValue = items.reduce((sum, item) => sum + (item.estimatedValueInr?.min || 0), 0);
  const maxValue = items.reduce((sum, item) => sum + (item.estimatedValueInr?.max || 0), 0);
  const stats = [
    { label: 'Items detected', value: String(items.length).padStart(2, '0'), note: 'On the visible surface', icon: ScanLine, color: undefined },
    { label: 'Recoverable material', value: `${weight ? ((recovered / weight) * 100).toFixed(1) : 0}%`, note: 'By estimated weight', icon: Recycle, color: CATEGORY_COLORS.recyclable },
    { label: 'Hazards flagged', value: String(hazards).padStart(2, '0'), note: 'Separate before sorting', icon: TriangleAlert, color: CATEGORY_COLORS.hazardous },
    { label: 'Potential recovery value', value: `₹${minValue}–${maxValue}`, note: 'Illustrative estimate · INR', icon: IndianRupee, color: undefined },
  ];
  return <section className="scan-overview" aria-label="Current scan summary">{stats.map(stat => <article className="overview-card" key={stat.label}><div className="overview-label"><span>{stat.label}</span><stat.icon size={15} style={{ color: stat.color }} /></div><div className="overview-value">{stat.value}<span className="metric-indicator"><ArrowUpRight size={13} /> Demo</span></div><p>{stat.note}</p></article>)}</section>;
}
