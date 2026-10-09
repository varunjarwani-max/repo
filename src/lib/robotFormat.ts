import { Item, RobotOutputEnvelope, RobotItemPayload } from '../types';
import { APP_INFO, HONESTY_STRINGS } from './constants';

export interface ScanEnvelopeMeta {
  scanId?: string;
  siteId?: string;
  timestamp?: string;
  imageWidth?: number;
  imageHeight?: number;
  modelVersion?: string;
}

/**
 * Transforms optical segmentation items and envelope metadata into machine-readable robot format.
 * Dynamically generated from active items so user category modifications immediately update the output.
 */
export function toRobotJson(items: Item[], meta: ScanEnvelopeMeta = {}): RobotOutputEnvelope {
  const totalWeight = items.reduce((acc, i) => acc + i.weightGrams, 0);
  const recyclableWeight = items
    .filter((i) => i.category === 'recyclable')
    .reduce((acc, i) => acc + i.weightGrams, 0);

  const recoverableShareWeightPct =
    totalWeight > 0 ? Number(((recyclableWeight / totalWeight) * 100).toFixed(1)) : 0;

  const hazardousUnitsCount = items.filter((i) => i.isHazardous || i.category === 'hazardous').length;

  const robotItems: RobotItemPayload[] = items.map((item) => ({
    id: item.id,
    itemNumber: item.itemNumber,
    label: item.label,
    material: item.material,
    category: item.category,
    confidence: Number(item.confidence.toFixed(3)),
    normalisedBBox: {
      x: Number(item.bbox.x.toFixed(3)),
      y: Number(item.bbox.y.toFixed(3)),
      width: Number(item.bbox.width.toFixed(3)),
      height: Number(item.bbox.height.toFixed(3)),
    },
    maskPolygon: item.polygon.map(([px, py]) => [
      Number(px.toFixed(3)),
      Number(py.toFixed(3)),
    ]),
    graspPoint: {
      x: Number(item.graspPoint.x.toFixed(3)),
      y: Number(item.graspPoint.y.toFixed(3)),
    },
    estimatedWeightGrams: item.weightGrams,
    estimatedValueInr: item.estimatedValueInr,
    hazard: {
      isHazardous: item.isHazardous,
      handlingDirective: item.isHazardous
        ? 'Do not compact, crush or puncture. Follow local hazardous protocols.'
        : 'Safe for automated vacuum / mechanical pneumatic pick.',
    },
    targetBin: item.targetBin,
    recommendedAction: item.actionRequired,
  }));

  return {
    scanId: meta.scanId || APP_INFO.defaultScanId,
    siteId: meta.siteId || APP_INFO.defaultSiteId,
    timestamp: meta.timestamp || new Date().toISOString(),
    imageDimensions: {
      width: meta.imageWidth || 1920,
      height: meta.imageHeight || 1200,
    },
    modelVersion: meta.modelVersion || HONESTY_STRINGS.modelVersion,
    totalDetectedItems: items.length,
    summary: {
      recoverableShareWeightPct,
      hazardousUnitsCount,
    },
    items: robotItems,
  };
}

export interface SchemaFieldDef {
  field: string;
  type: string;
  description: string;
}

export const ROBOT_SCHEMA_DEFINITIONS: SchemaFieldDef[] = [
  { field: 'scanId', type: 'string', description: 'Unique telemetry identifier for the segmented camera batch.' },
  { field: 'siteId', type: 'string', description: 'Municipal yard or recycling facility station identifier.' },
  { field: 'timestamp', type: 'string (ISO)', description: 'UTC timestamp of optical shutter acquisition.' },
  { field: 'imageDimensions', type: 'object {width, height}', description: 'Optical camera sensor pixel dimensions for coordinate scaling.' },
  { field: 'modelVersion', type: 'string', description: 'Computer vision neural model build tag and inference pipeline.' },
  { field: 'totalDetectedItems', type: 'number (integer)', description: 'Total count of segmented objects on visible top surface.' },
  { field: 'summary.recoverableShareWeightPct', type: 'number (float)', description: 'Total stream recoverable dry mass fraction (0 to 100%).' },
  { field: 'summary.hazardousUnitsCount', type: 'number (integer)', description: 'Count of batteries or volatile items requiring immediate lockout.' },
  { field: 'items[].id', type: 'string', description: 'Unique alphanumeric identifier for segmented object instance.' },
  { field: 'items[].itemNumber', type: 'number (integer)', description: 'Display index tag matching visual viewfinder overlay.' },
  { field: 'items[].label', type: 'string', description: 'Plain English semantic classification label.' },
  { field: 'items[].material', type: 'string', description: 'Identified material sub-type (e.g. PET, HDPE, Aluminium, Glass).' },
  { field: 'items[].category', type: 'enum', description: 'Sorting classification: recyclable | organic | hazardous | nonrecyclable.' },
  { field: 'items[].confidence', type: 'number (0..1)', description: 'Model classification confidence score.' },
  { field: 'items[].normalisedBBox', type: 'object {x, y, width, height}', description: 'Normalized bounding box rectangle (0.0 to 1.0 relative coordinates).' },
  { field: 'items[].maskPolygon', type: 'array of [x, y]', description: 'Normalized boundary polygon points for precise contour picking.' },
  { field: 'items[].graspPoint', type: 'object {x, y}', description: 'Calculated centroid grasp crosshair vector for end-effector suction or gripper.' },
  { field: 'items[].estimatedWeightGrams', type: 'number (integer)', description: 'Estimated item mass in grams for pneumatic pressure modulation.' },
  { field: 'items[].estimatedValueInr', type: 'object {min, max} | null', description: 'Secondary market recoverable value range in INR.' },
  { field: 'items[].hazard.isHazardous', type: 'boolean', description: 'Flag indicating whether item must bypass normal conveyor bins.' },
  { field: 'items[].hazard.handlingDirective', type: 'string', description: 'Worker safety or robot safety directive for hazardous waste handling.' },
  { field: 'items[].targetBin', type: 'string', description: 'Physical container directive (Blue dry bin, Green wet bin, Red container).' },
  { field: 'items[].recommendedAction', type: 'string', description: 'Robotic or operator handling instruction before sorting.' },
];
