export type ContainerType = 'excavation' | 'stockpile' | 'null' | 'external';

export interface ContainerNode {
  id: string;
  name: string;
  type: ContainerType;
  x: number;
  y: number;
  capacity: number;
  currentVolume: number;
  materialType: string;
  plantCount: number;
}

export interface TransferLink {
  id: string;
  sourceId: string;
  targetId: string;
  dailyRate: number;
  fleetCount: number;
  materialId?: string;
}

export interface SimFrame {
  day: number;
  nodeVolumes: Record<string, number>;
  linkFlows: Record<string, number>;
  alerts: string[];
}
