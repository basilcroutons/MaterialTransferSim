import { ContainerNode, TransferLink, SimFrame } from '../models/types';
import { SimEngine } from '../simulation/SimEngine';

export class CanvasViewModel {
  private nodes: ContainerNode[];
  private links: TransferLink[];
  private frames: SimFrame[] = [];
  private currentFrameIndex: number = 0;
  private isPlayback: boolean = false;

  constructor() {
    this.nodes = [
      { id: 'node-1', name: 'Source Cut A', type: 'excavation', x: 140, y: 160, capacity: 50000, currentVolume: 42000, materialType: 'Type 1 Fill', plantCount: 4 },
      { id: 'node-2', name: 'Buffer Stockpile B', type: 'stockpile', x: 440, y: 160, capacity: 30000, currentVolume: 12500, materialType: 'Type 1 Fill', plantCount: 2 },
      { id: 'node-3', name: 'Processing Plant C', type: 'external', x: 740, y: 280, capacity: 100000, currentVolume: 55000, materialType: 'Crushed Aggregate', plantCount: 6 },
    ];

    this.links = [
      { id: 'link-1', sourceId: 'node-1', targetId: 'node-2', dailyRate: 1500, fleetCount: 5 },
      { id: 'link-2', sourceId: 'node-2', targetId: 'node-3', dailyRate: 1200, fleetCount: 4 },
    ];

    this.recalculateSimulation();
  }

  public recalculateSimulation(): void {
    const engine = new SimEngine(this.nodes, this.links, 30);
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
}