import { LucideIcon, Recycle, Leaf, TriangleAlert, Trash2 } from 'lucide-react';
import { Category } from '../types';

export interface CategoryMeta {
  key: Category;
  label: string;
  colorHex: string;
  bgTint: string;
  borderTint: string;
  glowClass: string;
  icon: LucideIcon;
  badgeClass: string;
}

export interface BinMeta {
  colorHex: string;
  binName: string;
  swatchClass: string;
  directive: string;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  recyclable: '#10B981',
  organic: '#F59E0B',
  hazardous: '#EF4444',
  nonrecyclable: '#64748B',
};

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  recyclable: {
    key: 'recyclable',
    label: 'Recyclable',
    colorHex: '#10B981',
    bgTint: 'rgba(16, 185, 129, 0.08)',
    borderTint: 'rgba(16, 185, 129, 0.25)',
    glowClass: '',
    icon: Recycle,
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  organic: {
    key: 'organic',
    label: 'Organic',
    colorHex: '#F59E0B',
    bgTint: 'rgba(245, 158, 11, 0.08)',
    borderTint: 'rgba(245, 158, 11, 0.25)',
    glowClass: '',
    icon: Leaf,
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  hazardous: {
    key: 'hazardous',
    label: 'Hazardous',
    colorHex: '#EF4444',
    bgTint: 'rgba(239, 68, 68, 0.12)',
    borderTint: 'rgba(239, 68, 68, 0.40)',
    glowClass: 'shadow-glow-hazardous animate-pulse-hazard',
    icon: TriangleAlert,
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  nonrecyclable: {
    key: 'nonrecyclable',
    label: 'Non-Recyclable',
    colorHex: '#64748B',
    bgTint: 'rgba(100, 116, 139, 0.08)',
    borderTint: 'rgba(100, 116, 139, 0.20)',
    glowClass: '',
    icon: Trash2,
    badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
};

export const BIN_MAPPING: Record<Category, BinMeta> = {
  recyclable: {
    colorHex: '#2563EB',
    binName: 'Blue dry bin',
    swatchClass: 'bg-blue-600',
    directive: 'Blue dry-waste bin (Rinse, flatten, keep dry)',
  },
  organic: {
    colorHex: '#16A34A',
    binName: 'Green wet bin',
    swatchClass: 'bg-green-600',
    directive: 'Green wet-waste bin (Compost or wet collection)',
  },
  hazardous: {
    colorHex: '#DC2626',
    binName: 'Red hazardous container',
    swatchClass: 'bg-red-600',
    directive: 'Red hazardous container (Never normal bin; isolate for specialist e-waste/battery drop-off)',
  },
  nonrecyclable: {
    colorHex: '#0F172A',
    binName: 'Black reject bin',
    swatchClass: 'bg-slate-900 border border-slate-700',
    directive: 'Black reject bin (Standard non-recyclable municipal disposal)',
  },
};

export const HONESTY_STRINGS = {
  banner: 'Visible surface only - items beneath the top layer are not counted. Weights and values are estimates. Demo data.',
  auditDisclaimer: 'Estimates only - not a certified weighbridge or audit record.',
  robotNotice: 'Output is robot-ready in format. It has not been tested on physical robot hardware.',
  surfaceNotice: 'Visible surface only — items beneath the top layer are not counted. Weights and values are estimates.',
  liveTag: 'Live backend',
  fallbackTag: 'Demo data — backend unavailable',
  demoTag: 'Demo data',
  uploadFallback: 'Photo analysis is unavailable. Showing the illustrated demo pile and demo results instead; these are not detections from your uploaded photo.',
  confirmationTag: 'Needs confirmation',
  confirmedTag: 'User confirmed',
  confidenceNotice: 'Confidence is model-reported, not measured accuracy.',
  geometryNotice: 'Boxes are model estimates. Masks and grasp points are box-derived previews, not measured segmentation or tested robot coordinates.',
  modelVersion: 'ecoscan-seg-v0 (demo)',
  visibleTopLayerNotice: 'Top visible layer analysis',
} as const;

export const APP_INFO = {
  name: 'EcoScan AI',
  subtitle: 'waste pile analysis',
  defaultScanId: 'SCAN-2026-0881',
  defaultSiteName: 'Demo Yard A',
  defaultSiteId: 'SITE-YARD-A',
  defaultLatencyMs: 42,
  resolution: '1920x1200',
} as const;
