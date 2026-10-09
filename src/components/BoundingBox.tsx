import React from 'react';
import { Item } from '../types';
import { CATEGORY_COLORS, CATEGORY_META } from '../lib/constants';

interface BoundingBoxProps {
  item: Item;
  isActive: boolean;
  isDimmed: boolean;
  showMasks: boolean;
  showGraspPoints: boolean;
  isBelowThreshold: boolean;
  isDiscovered?: boolean;
  staggerIndex?: number;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

export const BoundingBox: React.FC<BoundingBoxProps> = ({
  item,
  isActive,
  isDimmed,
  showMasks,
  showGraspPoints,
  isBelowThreshold,
  isDiscovered = true,
  staggerIndex = 0,
  onHover,
  onSelect,
}) => {
  // SVG coordinates in 1000x625 space
  const svgX = item.bbox.x * 1000;
  const svgY = item.bbox.y * 1000;
  const svgW = item.bbox.width * 1000;
  const svgH = item.bbox.height * 1000;
  const perimeter = Math.round(2 * (svgW + svgH));

  const graspX = item.graspPoint.x * 1000;
  const graspY = item.graspPoint.y * 1000;

  const categoryColor = CATEGORY_COLORS[item.category];
  const meta = CATEGORY_META[item.category];

  const strokeColor = isBelowThreshold ? '#8B919A' : categoryColor;
  const fillColor = isBelowThreshold
    ? 'rgba(139, 145, 154, 0.08)'
    : isDimmed
    ? 'rgba(0, 0, 0, 0.2)'
    : meta.bgTint;

  const strokeWidth = isActive ? 3 : 2;
  const strokeDash = isBelowThreshold ? '6 4' : isDiscovered ? 'none' : `${perimeter}`;
  const strokeOffset = isDiscovered ? 0 : perimeter;

  // Polygon points string for mask mode
  const polygonPointsStr = item.polygon
    .map(([px, py]) => `${px * 1000},${py * 625}`)
    .join(' ');

  const formattedNum = String(item.itemNumber).padStart(2, '0');
  const confPercent = Math.round(item.confidence * 100);

  return (
    <g
      id={`bbox-${item.id}`}
      style={{
        opacity: !isDiscovered ? 0 : isDimmed ? 0.35 : 1,
        transition: 'opacity 250ms ease, filter 180ms ease',
        cursor: 'pointer',
        animationDelay: `${staggerIndex * 60}ms`,
      }}
      className="group transition-all"
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(item.id)}
      role="button"
      tabIndex={0}
      aria-label={`Waste item ${item.itemNumber}: ${item.label}, ${item.category}, confidence ${confPercent}%`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      {/* 1. Main Geometry: Mask Polygon OR Rounded Rectangle */}
      {showMasks ? (
        <polygon
          points={polygonPointsStr}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      ) : (
        <rect
          x={svgX}
          y={svgY}
          width={svgW}
          height={svgH}
          rx={6}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isBelowThreshold ? '6 4' : perimeter}
          strokeDashoffset={strokeOffset}
          style={{
            transition: 'stroke-dashoffset 300ms cubic-bezier(0.16, 1, 0.3, 1), fill 200ms ease',
          }}
        />
      )}

      {/* 2. Hazardous Slow Pulsing Outer Dashed Ring & Radar Ripple */}
      {item.isHazardous && !isBelowThreshold && (
        <>
          <rect
            x={svgX - 5}
            y={svgY - 5}
            width={svgW + 10}
            height={svgH + 10}
            rx={10}
            fill="none"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            className="animate-pulse-hazard"
          />
          {/* Radar Ripple: Two concentric rings scaling 1 to 2.4 from box center */}
          <g transform={`translate(${svgX + svgW / 2}, ${svgY + svgH / 2})`} pointerEvents="none">
            <circle
              r={Math.max(12, Math.min(svgW, svgH) * 0.3)}
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              className="hazard-radar-ring-1"
            />
            <circle
              r={Math.max(12, Math.min(svgW, svgH) * 0.3)}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.5"
              className="hazard-radar-ring-2"
            />
          </g>
        </>
      )}

      {/* 3. Numbered Corner Tag at Top-Left */}
      <g transform={`translate(${svgX}, ${svgY})`}>
        {/* Filled tag rectangle */}
        <rect
          x="0"
          y="0"
          width="26"
          height="18"
          rx="3"
          fill={isBelowThreshold ? '#475569' : strokeColor}
        />
        <text
          x="13"
          y="13"
          textAnchor="middle"
          fill="#0F172A"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
          fontWeight="bold"
        >
          {formattedNum}
        </text>

        {/* 4. Short Label Strip beneath or adjacent to tag */}
        <g transform="translate(29, 0)">
          <rect
            x="0"
            y="0"
            width={isBelowThreshold ? 130 : Math.max(90, item.label.length * 7 + 38)}
            height="18"
            rx="3"
            fill="#0F172A"
            fillOpacity="0.88"
            stroke={strokeColor}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          <text
            x="6"
            y="13"
            fill="#F8FAFC"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="600"
          >
            {item.label}
          </text>
          <text
            x={isBelowThreshold ? 72 : Math.max(90, item.label.length * 7 + 38) - 6}
            y="13"
            textAnchor={isBelowThreshold ? 'start' : 'end'}
            fill={isBelowThreshold ? '#EF4444' : '#94A3B8'}
            fontFamily="JetBrains Mono, monospace"
            fontSize="9"
          >
            {isBelowThreshold ? 'Needs confirm' : `${confPercent}%`}
          </text>
        </g>
      </g>

      {/* 5. Robotic Grasp Point (Crosshair Target) */}
      {showGraspPoints && (
        <g transform={`translate(${graspX}, ${graspY})`} pointerEvents="none">
          <circle r="6" fill="none" stroke="#10B981" strokeWidth="1.5" />
          <circle r="1.5" fill="#10B981" />
          <line x1="-10" y1="0" x2="10" y2="0" stroke="#10B981" strokeWidth="1.2" />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#10B981" strokeWidth="1.2" />
        </g>
      )}
    </g>
  );
};

export default BoundingBox;
