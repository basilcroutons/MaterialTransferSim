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

      const plannedTransfers: Map<string, number> = new Map();

      this.links.forEach(link => {
        const source = this.nodes.get(link.sourceId);
        const target = this.nodes.get(link.targetId);

        if (source && target) {
          const maxTransfer = Math.min(link.dailyRate, source.currentVolume);
          const actualTransfer = Math.min(maxTransfer, target.capacity - target.currentVolume);
          
          plannedTransfers.set(link.id, (day === 0) ? 0 : Math.max(0, actualTransfer));
          linkFlows[link.id] = (day === 0) ? 0 : Math.max(0, actualTransfer);
        } else {
          linkFlows[link.id] = 0;
        }
      });

      if (day > 0) {
        this.links.forEach(link => {
          const source = this.nodes.get(link.sourceId);
          const target = this.nodes.get(link.targetId);
          const transferAmount = plannedTransfers.get(link.id) || 0;

          if (source && target && transferAmount > 0) {
            source.currentVolume = Math.max(0, source.currentVolume - transferAmount);
            target.currentVolume = Math.min(target.capacity, target.currentVolume + transferAmount);
          }
        });
      }

      this.nodes.forEach(node => {
        nodeVolumes[node.id] = node.currentVolume;
        if (node.currentVolume >= node.capacity) {
          const alertMsg = `Day ${day}: Node ${node.name} reached capacity!`;
          if (!alerts.includes(alertMsg)) {
            alerts.push(alertMsg);
          }
        }
      });

      frames.push({ day, nodeVolumes, linkFlows, alerts });
    }

    return frames;
  }
}
