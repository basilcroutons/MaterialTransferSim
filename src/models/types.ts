export interface Material {
    id: string;
    name: string;
    density: number; // kg/m3
    viscosity: number; // cP
}

export interface ContainerNode {
    id: string;
    label: string;
    type: 'source' | 'buffer' | 'destination';
    x: number;
    y: number;
    capacity: number; // m3
    currentVolume: number; // m3
    materialId?: string;
}

export interface TransferLink {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    maxCapacityRate: number; // m3/day
    currentFlowRate: number; // m3/day
}

export interface SimFrame {
    day: number;
    nodeVolumes: Record<string, number>;
    linkFlows: Record<string, number>;
    alerts: string[];
}
