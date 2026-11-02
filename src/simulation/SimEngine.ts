import { ContainerNode, TransferLink, SimFrame, MaterialDefinition, FlowStatus } from '../models/types';

export type OverflowMode = 'strict' | 'overfill';
export type StrictSubRule = 'throttleback' | 'headroom_hold';

export class SimEngine {
  private nodes: Map<string, ContainerNode>;
  private links: Map<string, TransferLink>;
  private materials: Map<string, MaterialDefinition>;
  private totalDays: number;
  private defaultOverflowMode: OverflowMode;
  private headroomHoldStates: Map<string, boolean> = new Map();

  constructor(
    nodes: ContainerNode[],
    links: TransferLink[],
    materials: MaterialDefinition[] = [],
    totalDays: number = 30,
    overflowMode: OverflowMode = 'strict'
  ) {
    this.nodes = new Map(nodes.map(n => [n.id, { ...n }]));
    this.links = new Map(links.map(l => [l.id, { ...l }]));
    this.materials = new Map(materials.map(m => [m.code, { ...m }]));
    this.totalDays = totalDays;
    this.defaultOverflowMode = overflowMode;
  }

  public runSimulation(): SimFrame[] {
    const frames: SimFrame[] = [];
    this.headroomHoldStates.clear();

    for (let day = 0; day <= this.totalDays; day++) {
      const alerts: string[] = [];
      const nodeVolumes: Record<string, number> = {};
      const linkFlows: Record<string, number> = {};

      // Snapshot start-of-day volumes to accurately classify source starvation vs capacity blocks
      const startOfDayVolumes: Record<string, number> = {};
      this.nodes.forEach(n => {
        startOfDayVolumes[n.id] = n.currentVolume;
      });

      const activeLinkRates: Map<string, number> = new Map();
      this.links.forEach(link => {
        let currentRate = link.dailyRate;
        if (link.rateSchedule && link.rateSchedule.length > 0) {
          const sorted = [...link.rateSchedule].sort((a, b) => a.day - b.day);
          for (const sched of sorted) {
            if (day >= sched.day) {
              currentRate = sched.rate;
            }
          }
        }
        activeLinkRates.set(link.id, currentRate);
      });

      const plannedTransfers: Map<string, number> = new Map();
      const requestedTransfers: Map<string, number> = new Map();

      // Step 1: Outbound source availability and allocation
      // Group links by source to ensure multi-link sources don't create phantom material
      const sourceOutboundLinks: Map<string, TransferLink[]> = new Map();
      this.links.forEach(link => {
        const list = sourceOutboundLinks.get(link.sourceId) || [];
        list.push(link);
        sourceOutboundLinks.set(link.sourceId, list);
      });

      sourceOutboundLinks.forEach((outboundLinks, sourceId) => {
        const source = this.nodes.get(sourceId);
        if (!source) {
          outboundLinks.forEach(l => requestedTransfers.set(l.id, 0));
          return;
        }

        if (source.status === 'blocked' || source.status === 'maintenance') {
          outboundLinks.forEach(l => requestedTransfers.set(l.id, 0));
          if (day > 0 && !alerts.includes(`Day ${day}: Source ${source.name} is blocked or under maintenance.`)) {
            alerts.push(`Day ${day}: Source ${source.name} is blocked or under maintenance.`);
          }
          return;
        }

        if (source.currentVolume <= 0) {
          outboundLinks.forEach(l => requestedTransfers.set(l.id, 0));
          if (day > 0 && !alerts.includes(`Day ${day}: Stockout at source ${source.name}.`)) {
            alerts.push(`Day ${day}: Stockout at source ${source.name}.`);
          }
          return;
        }

        let totalOutboundRate = 0;
        const validLinks: TransferLink[] = [];

        outboundLinks.forEach(link => {
          const target = this.nodes.get(link.targetId);
          if (!target) {
            requestedTransfers.set(link.id, 0);
            return;
          }

          if (target.allowedMaterials && target.allowedMaterials.length > 0) {
            if (!target.allowedMaterials.includes(source.materialType)) {
              requestedTransfers.set(link.id, 0);
              if (day > 0 && !alerts.includes(`Day ${day}: Material mismatch between ${source.name} (${source.materialType}) and target ${target.name}.`)) {
                alerts.push(`Day ${day}: Material mismatch between ${source.name} (${source.materialType}) and target ${target.name}.`);
              }
              return;
            }
          }

          const rate = activeLinkRates.get(link.id) ?? link.dailyRate;
          totalOutboundRate += rate;
          validLinks.push(link);
        });

        // If source material is less than total outbound demand, share pro-rata
        const availableVol = source.currentVolume;
        if (totalOutboundRate > 0) {
          const sourceRatio = Math.min(1.0, availableVol / totalOutboundRate);
          validLinks.forEach(link => {
            const rate = activeLinkRates.get(link.id) ?? link.dailyRate;
            requestedTransfers.set(link.id, rate * sourceRatio);
          });
        }
      });

      // Step 2: Target capacity constraints and throttling
      const targetInflows: Map<string, TransferLink[]> = new Map();
      this.links.forEach(link => {
        const target = this.nodes.get(link.targetId);
        if (target) {
          const list = targetInflows.get(link.targetId) || [];
          list.push(link);
          targetInflows.set(link.targetId, list);
        }
      });

      targetInflows.forEach((inboundLinks, targetId) => {
        const target = this.nodes.get(targetId);
        if (!target) return;

        const overflowMode = target.overflowMode || this.defaultOverflowMode;
        const subRule = target.strictSubRule || 'throttleback';
        const headroomThreshold = target.headroomThreshold ?? 500;

        const currentVol = target.currentVolume;
        const capacity = target.capacity;
        const headroom = Math.max(0, capacity - currentVol);

        let isHalted = this.headroomHoldStates.get(targetId) || false;

        if (overflowMode === 'strict' && subRule === 'headroom_hold') {
          if (currentVol >= capacity) {
            isHalted = true;
          } else if (isHalted && headroom < headroomThreshold) {
            isHalted = true;
          } else if (isHalted && headroom >= headroomThreshold) {
            isHalted = false;
          }
          this.headroomHoldStates.set(targetId, isHalted);
        }

        let totalRequestedForTarget = 0;
        inboundLinks.forEach(link => {
          totalRequestedForTarget += (requestedTransfers.get(link.id) || 0);
        });

        if (overflowMode === 'overfill') {
          inboundLinks.forEach(link => {
            const req = requestedTransfers.get(link.id) || 0;
            plannedTransfers.set(link.id, (day === 0) ? 0 : req);
            linkFlows[link.id] = (day === 0) ? 0 : req;
          });
        } else {
          if (subRule === 'headroom_hold' && isHalted) {
            inboundLinks.forEach(link => {
              plannedTransfers.set(link.id, 0);
              linkFlows[link.id] = 0;
            });
            if (day > 0) {
              const alertMsg = `Day ${day}: Target ${target.name} awaiting headroom threshold (${headroomThreshold} m³ spare required).`;
              if (!alerts.includes(alertMsg)) alerts.push(alertMsg);
            }
          } else {
            const allowableHeadroom = headroom;
            const throttleFactor = totalRequestedForTarget > 0 
              ? Math.min(1.0, allowableHeadroom / totalRequestedForTarget) 
              : 1.0;

            inboundLinks.forEach(link => {
              const req = requestedTransfers.get(link.id) || 0;
              const actual = (subRule === 'throttleback') ? (req * throttleFactor) : (headroom > 0 ? req : 0);
              plannedTransfers.set(link.id, (day === 0) ? 0 : Math.max(0, actual));
              linkFlows[link.id] = (day === 0) ? 0 : Math.max(0, actual);
            });

            if (day > 0 && totalRequestedForTarget > allowableHeadroom && subRule === 'throttleback') {
              const alertMsg = `Day ${day}: Target ${target.name} nearing capacity. Transfer rates throttled pro-rata.`;
              if (!alerts.includes(alertMsg)) alerts.push(alertMsg);
            }
          }
        }
      });

      // Step 3: Apply physical transfers
      if (day > 0) {
        this.links.forEach(link => {
          const source = this.nodes.get(link.sourceId);
          const target = this.nodes.get(link.targetId);
          const transferAmount = plannedTransfers.get(link.id) || 0;

          if (source && target && transferAmount > 0) {
            const mat = this.materials.get(source.materialType);
            const bulkOut = mat ? mat.bulkOUT : 1.0;
            const bulkIn = mat ? mat.bulkIN : 1.0;

            const volumeRemoved = transferAmount * bulkOut;
            source.currentVolume = Math.max(0, source.currentVolume - volumeRemoved);

            const volumeAdded = transferAmount * bulkIn;
            const targetOverflowMode = target.overflowMode || this.defaultOverflowMode;
            target.currentVolume = targetOverflowMode === 'overfill' 
              ? target.currentVolume + volumeAdded 
              : Math.min(target.capacity, target.currentVolume + volumeAdded);
          }
        });
      }

      // Record resulting node volumes & capacity alerts
      this.nodes.forEach(node => {
        nodeVolumes[node.id] = node.currentVolume;
        if (node.currentVolume > node.capacity) {
          const excess = node.currentVolume - node.capacity;
          const targetOverflowMode = node.overflowMode || this.defaultOverflowMode;
          const alertMsg = targetOverflowMode === 'overfill'
            ? `Day ${day}: [OVERFILL] Node ${node.name} exceeded capacity by ${Math.round(excess).toLocaleString()} m³!`
            : `Day ${day}: Node ${node.name} reached capacity!`;
          if (!alerts.includes(alertMsg)) {
            alerts.push(alertMsg);
          }
        }
      });

      // Step 4: Classify Link and Node visual flow statuses according to exact color key:
      // Blue: Day 0 (frozen) + any time a container cannot deliver due to lack of material
      // Green: flowing at full rate
      // Amber: flowing at restricted rate (throttleback, partial source material < daily rate, or calendar restriction)
      // Red: blocked from sending/receiving due to capacity issues or calendar restriction
      const linkStatuses: Record<string, FlowStatus> = {};
      const nodeStatuses: Record<string, FlowStatus> = {};

      if (day === 0) {
        this.links.forEach(l => { linkStatuses[l.id] = 'frozen'; });
        this.nodes.forEach(n => { nodeStatuses[n.id] = 'frozen'; });
      } else {
        // Link status classification
        this.links.forEach(link => {
          const source = this.nodes.get(link.sourceId);
          const target = this.nodes.get(link.targetId);
          const linkRate = activeLinkRates.get(link.id) ?? link.dailyRate;
          const actualFlow = linkFlows[link.id] ?? 0;
          const startVol = startOfDayVolumes[link.sourceId] ?? 0;

          if (!source || !target) {
            linkStatuses[link.id] = 'frozen';
          } else if (startVol <= 0) {
            // Container cannot deliver due to lack of material (blue)
            linkStatuses[link.id] = 'starved';
          } else if (actualFlow === 0) {
            // Blocked from sending/receiving due to capacity issues, headroom hold, or maintenance (red)
            linkStatuses[link.id] = 'blocked';
          } else if (actualFlow < linkRate) {
            // Flowing at restricted rate (amber)
            linkStatuses[link.id] = 'restricted';
          } else {
            // Flowing at full rate (green)
            linkStatuses[link.id] = 'full';
          }
        });

        // Node status classification
        this.nodes.forEach(node => {
          const inbound = Array.from(this.links.values()).filter(l => l.targetId === node.id);
          const outbound = Array.from(this.links.values()).filter(l => l.sourceId === node.id);
          const connected = [...inbound, ...outbound];

          if (connected.length === 0) {
            nodeStatuses[node.id] = 'frozen';
            return;
          }

          const nodeOverflow = node.overflowMode || this.defaultOverflowMode;
          const isHalted = this.headroomHoldStates.get(node.id) || false;
          const isAtCapacity = nodeOverflow !== 'overfill' && node.currentVolume >= node.capacity;

          const hasBlocked = connected.some(l => linkStatuses[l.id] === 'blocked');
          const hasRestricted = connected.some(l => linkStatuses[l.id] === 'restricted');
          const hasFull = connected.some(l => linkStatuses[l.id] === 'full');
          const isStarvedSource = outbound.length > 0 && node.currentVolume <= 0;

          if (isAtCapacity || isHalted || node.status === 'blocked' || hasBlocked) {
            // Blocked from sending/receiving due to capacity issues (red)
            nodeStatuses[node.id] = 'blocked';
          } else if (hasRestricted) {
            // Flowing at restricted rate (amber)
            nodeStatuses[node.id] = 'restricted';
          } else if (hasFull) {
            // Flowing at full rate (green)
            nodeStatuses[node.id] = 'full';
          } else if (isStarvedSource) {
            // Cannot deliver due to lack of material (blue)
            nodeStatuses[node.id] = 'starved';
          } else {
            // Day 0 / idle / frozen (blue)
            nodeStatuses[node.id] = 'frozen';
          }
        });
      }

      frames.push({ day, nodeVolumes, linkFlows, linkStatuses, nodeStatuses, alerts });
    }

    return frames;
  }
}