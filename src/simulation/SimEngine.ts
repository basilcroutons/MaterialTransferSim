import { ContainerNode, TransferLink, SimFrame } from '../models/types';

export class SimEngine {
    private nodes: Map<string, ContainerNode>;
    private links: Map<string, TransferLink>;
    private totalDays: number;

    constructor(nodes: ContainerNode[], links: TransferLink[], totalDays: number = 30) {
        this.nodes = new Map(nodes.map(n => [n.id, { ...n }]));
        this.links = new Map(links.map(l => [l.id, { ...l }]));
        this.totalDays = totalDays;
    }

    public runSimulation(): SimFrame[] {
        const frames: SimFrame[] = [];

        for (let day = 0; day <= this.totalDays; day++) {
            const alerts: string[] = [];
            const nodeVolumes: Record<string, number> = {};
            const linkFlows: Record<string, number> = {};

            // Execute transfers for active links
            this.links.forEach(link => {
                const source = this.nodes.get(link.sourceNodeId);
                const target = this.nodes.get(link.targetNodeId);

                if (source && target) {
                    const maxTransfer = Math.min(link.maxCapacityRate, source.currentVolume);
                    const actualTransfer = Math.min(maxTransfer, target.capacity - target.currentVolume);

                    if (actualTransfer > 0) {
                        source.currentVolume -= actualTransfer;
                        target.currentVolume += actualTransfer;
                    }

                    linkFlows[link.id] = actualTransfer;

                    if (target.currentVolume >= target.capacity) {
                        alerts.push(`Day ${day}: Node ${target.label} reached maximum capacity!`);
                    }
                }
            });

            this.nodes.forEach(node => {
                nodeVolumes[node.id] = node.currentVolume;
            });

            frames.push({
                day,
                nodeVolumes,
                linkFlows,
                alerts
            });
        }

        return frames;
    }
}
