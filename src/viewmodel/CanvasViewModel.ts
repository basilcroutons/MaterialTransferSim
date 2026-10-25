import { ContainerNode, TransferLink, SimFrame } from '../models/types';
import { SimEngine, OverflowMode, StrictSubRule } from '../simulation/SimEngine';

export class CanvasViewModel {
  private nodes: ContainerNode[];
  private links: TransferLink[];
  private frames: SimFrame[] = [];
  private currentFrameIndex: number = 0;
  private isPlayback: boolean = false;
  private overflowMode: OverflowMode = 'strict';

  constructor() {
    this.nodes = [
      { id: 'node-1', name: 'Source Cut A', type: 'excavation', x: 140, y: 160, capacity: 50000, currentVolume: 42000, materialType: 'Type 1 Fill', plantCount: 4, overflowMode: 'strict', strictSubRule: 'throttleback' },
      { id: 'node-2', name: 'Buffer Stockpile B', type: 'stockpile', x: 440, y: 160, capacity: 30000, currentVolume: 12500, materialType: 'Type 1 Fill', plantCount: 2, overflowMode: 'strict', strictSubRule: 'throttleback', headroomThreshold: 500 },
      { id: 'node-3', name: 'Processing Plant C', type: 'external', x: 740, y: 280, capacity: 100000, currentVolume: 55000, materialType: 'Crushed Aggregate', plantCount: 6, overflowMode: 'strict' },
    ];

    this.links = [
      { id: 'link-1', sourceId: 'node-1', targetId: 'node-2', dailyRate: 1500, fleetCount: 5 },
      { id: 'link-2', sourceId: 'node-2', targetId: 'node-3', dailyRate: 1200, fleetCount: 4 },
    ];

    this.recalculateSimulation();
  }

  public setOverflowMode(mode: OverflowMode): void {
    this.overflowMode = mode;
    this.recalculateSimulation();
  }

  public getOverflowMode(): OverflowMode {
    return this.overflowMode;
  }

  public applyGlobalPreset(mode: OverflowMode, subRule: StrictSubRule = 'throttleback'): void {
    this.nodes.forEach(node => {
      node.overflowMode = mode;
      node.strictSubRule = subRule;
    });
    this.recalculateSimulation();
  }

  public loadModel(nodes: ContainerNode[], links: TransferLink[]): void {
    this.nodes = nodes;
    this.links = links;
    this.currentFrameIndex = 0;
    this.recalculateSimulation();
  }

  public recalculateSimulation(): void {
    const engine = new SimEngine(this.nodes, this.links, 30, this.overflowMode);
    this.frames = engine.runSimulation();
  }

  public getNodes(): ContainerNode[] { return this.nodes; }
  public getLinks(): TransferLink[] { return this.links; }
  public getFrames(): SimFrame[] { return this.frames; }
  public getCurrentFrame(): SimFrame { return this.frames[this.currentFrameIndex] || this.frames[0]; }
  
  public setFrameIndex(index: number): void {
    if (index >= 0 && index < this.frames.length) {
      this.currentFrameIndex = index;
    }
  }

  public setPlayback(val: boolean): void {
    this.isPlayback = val;
    if (val) {
      this.recalculateSimulation();
    }
  }

  public getPlayback(): boolean { return this.isPlayback; }

  public addNode(node: ContainerNode): void {
    this.nodes.push(node);
    this.recalculateSimulation();
  }

  public removeNode(id: string): void {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.links = this.links.filter(l => l.sourceId !== id && l.targetId !== id);
    this.recalculateSimulation();
  }

  public addLink(link: TransferLink): void {
    this.links.push(link);
    this.recalculateSimulation();
  }

  public removeLink(id: string): void {
    this.links = this.links.filter(l => l.id !== id);
    this.recalculateSimulation();
  }

  public updateNodePosition(id: string, x: number, y: number): void {
    const node = this.nodes.find(n => n.id === id);
    if (node) {
      node.x = x;
      node.y = y;
    }
  }
}