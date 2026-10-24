import { Material } from './Material';

export interface TransferPipeline {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    maxCapacity: number;
    currentFlowRate: number;
    activeMaterial?: Material;
}
