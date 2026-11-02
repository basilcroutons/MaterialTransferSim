export type ContainerType = 'excavation' | 'stockpile' | 'null' | 'external';
export type OverflowMode = 'strict' | 'overfill';
export type StrictSubRule = 'throttleback' | 'headroom_hold';
export type NodeStatus = 'active' | 'maintenance' | 'blocked';

export interface MaterialDefinition {
  code: string;
  name: string;
  bulkIN: number;   // Swell / deposit factor (e.g., 1.25)
  bulkOUT: number;  // Shrinkage / extraction factor (e.g., 0.90)
}

export interface ContainerNode {
  id: string;
  name: string;
  type: ContainerType;
  x: number;
  y: number;
  capacity: number;
  currentVolume: number;
  materialType: string; // Material code reference (e.g., 'CLAY', 'TOPS')
  plantCount: number;
  overflowMode?: OverflowMode;
  strictSubRule?: StrictSubRule;
  headroomThreshold?: number; // e.g. 500 m³ spare space required to resume after headroom hold
  status?: NodeStatus;
  allowedMaterials?: string[];
  notes?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface TransferLink {
  id: string;
  sourceId: string;
  targetId: string;
  dailyRate: number;
  fleetCount: number;
  materialId?: string;
  priority?: number;
  rateSchedule?: { day: number; rate: number }[];
  notes?: string;
}

export type FlowStatus = 'frozen' | 'starved' | 'full' | 'restricted' | 'blocked' | 'idle';

export interface SimFrame {
  day: number;
  nodeVolumes: Record<string, number>;
  linkFlows: Record<string, number>;
  linkStatuses: Record<string, FlowStatus>;
  nodeStatuses: Record<string, FlowStatus>;
  alerts: string[];
}

export interface ContainerProperties {
  type: ContainerType;
  capacity: number;
  currentVolume: number;
  materialType: string;
  plantCount: number;
  overflowMode?: OverflowMode;
  strictSubRule?: StrictSubRule;
  headroomThreshold?: number;
  status?: NodeStatus;
  allowedMaterials?: string[];
  notes?: string;
}

export interface LinkProperties {
  dailyRate: number;
  fleetCount: number;
  materialId?: string;
  priority?: number;
  rateSchedule?: { day: number; rate: number }[];
  notes?: string;
}

export type ClipboardData =
  | {
      type: 'container';
      sourceName: string;
      properties: ContainerProperties;
    }
  | {
      type: 'link';
      sourceName: string;
      properties: LinkProperties;
    };

export const GRAPH_LINE_COLORS = [
  '#0d9488', // Teal
  '#b45309', // Amber / Orange
  '#38bdf8', // Cyan / Light Blue
  '#a855f7', // Purple
  '#22c55e', // Green
  '#ec4899', // Pink
  '#eab308', // Yellow
  '#6366f1', // Indigo
];

export const HIGHLIGHT_DASH_PATTERNS = [
  { name: 'dots', canvas: [9, 12], svg: '9 12' },                         // Dotted (3x)
  { name: 'medium-dashes', canvas: [24, 15], svg: '24 15' },              // Dashed (3x)
  { name: 'dash-dot', canvas: [36, 12, 9, 12], svg: '36 12 9 12' },       // Dash-dot (3x)
  { name: 'long-dashes', canvas: [48, 18], svg: '48 18' },                 // Long-dash (3x)
  { name: 'short-dashes', canvas: [15, 12], svg: '15 12' },                // Short-dash (3x)
  { name: 'dash-two-dots', canvas: [36, 9, 9, 9, 9, 9], svg: '36 9 9 9 9 9' }, // Dash-two-dots (3x)
];