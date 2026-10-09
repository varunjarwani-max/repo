import React from 'react';

interface SiteSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export const SiteSparkline: React.FC<SiteSparklineProps> = ({
  data,
  color = '#10B981',
  width = 70,
  height = 20,
}) => {
  if (!data || data.length < 2) {
    return <span className="font-mono text-[10px] text-slate-500">No data</span>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible select-none shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* End Point Indicator */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
};

export default SiteSparkline;
