import { ContainerNode, TransferLink, SimFrame } from '../models/types';
import { SimEngine } from '../simulation/SimEngine';

export class CanvasViewModel {
    private nodes: ContainerNode[];
    private links: TransferLink[];
    private frames: SimFrame[] = [];
    private currentFrameIndex: number = 0;

    constructor() {
        // Default initial setup for MaterialTransferSim vertical slice
        this.nodes = [
            { id: 'node-1', label: 'Source Pit A', type: 'source', x: 150, y: 200, capacity: 10000, currentVolume: 8500 },
            { id: 'node-2', label: 'Buffer Tank B', type: 'buffer', x: 450, y: 200, capacity: 5000, currentVolume: 1200 },
            { id: 'node-3', label: 'Process Plant C', type: 'destination', x: 750, y: 200, capacity: 12000, currentVolume: 2000 },
        ];

        this.links = [
            { id: 'link-1', sourceNodeId: 'node-1', targetNodeId: 'node-2', maxCapacityRate: 500, currentFlowRate: 500 },
            { id: 'link-2', sourceNodeId: 'node-2', targetNodeId: 'node-3', maxCapacityRate: 400, currentFlowRate: 400 },
        ];

        this.recalculateSimulation();
    }

    public recalculateSimulation(): void {
        const engine = new SimEngine(this.nodes, this.links, 30);
        this.frames = engine.runSimulation();
    }

    public getNodes(): ContainerNode[] {
        return this.nodes;
    }

    public getLinks(): TransferLink[] {
        return this.links;
    }

    public getFrames(): SimFrame[] {
        return this.frames;
    }

    public getCurrentFrame(): SimFrame {
        return this.frames[this.currentFrameIndex] || this.frames[0];
    }

    public setFrameIndex(index: number): void {
        if (index >= 0 && index < this.frames.length) {
            this.currentFrameIndex = index;
        }
    }
}
