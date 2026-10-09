import React from 'react';
import { Item } from '../types';
import PileSceneSvg from './PileSceneSvg';

interface ItemCropThumbnailProps {
  item: Item;
  size?: number;
  className?: string;
}

export const ItemCropThumbnail: React.FC<ItemCropThumbnailProps> = ({
  item,
  size = 56,
  className = '',
}) => {
  if (item.cropUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-card overflow-hidden bg-surface-2 border border-border shrink-0 flex items-center justify-center ${className}`}
      >
        <img
          src={item.cropUrl}
          alt={item.label}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Calculate viewBox in 1000x625 space with 8% padding
  const rawX = item.bbox.x * 1000;
  const rawY = item.bbox.y * 625;
  const rawW = item.bbox.width * 1000;
  const rawH = item.bbox.height * 625;

  const padX = rawW * 0.08;
  const padY = rawH * 0.08;

  const cropX = Math.max(0, rawX - padX);
  const cropY = Math.max(0, rawY - padY);
  const cropW = Math.min(1000 - cropX, rawW + padX * 2);
  const cropH = Math.min(625 - cropY, rawH + padY * 2);

  const viewBox = `${cropX} ${cropY} ${cropW} ${cropH}`;

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-card overflow-hidden bg-surface-2 border border-border shrink-0 flex items-center justify-center relative select-none ${className}`}
      title={`${item.label} (${item.material})`}
    >
      <PileSceneSvg
        viewBox={viewBox}
        className="w-full h-full pointer-events-none"
      />
    </div>
  );
};

export default ItemCropThumbnail;
