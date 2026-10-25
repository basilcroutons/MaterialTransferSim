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
}

export interface SimFrame {
  day: number;
  nodeVolumes: Record<string, number>;
  linkFlows: Record<string, number>;
  alerts: string[];
}