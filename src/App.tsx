import React, { useState, useMemo } from 'react';

// ==========================================
// 1. DATA MODELS & TYPES
// ==========================================
export type ContainerType = 'excavation' | 'stockpile' | 'null' | 'external';

export interface ContainerNode {
  id: string;
  name: string;
  type: ContainerType;
  position: { x: number; y: number };
  capacity: number; // m3 max
  currentVolume: number; // m3 active
  materialId: string;
  plantCount: number;
}

export interface TransferLink {
  id: string;
  sourceId: string;
  targetId: string;
  transferRatePerDay: number; // m3/day
  points: Array<{ x: number; y: number }>;
  activeVehicles: number;
}

export interface SimFrame {
  day: number;
  containers: Record<string, { currentVolume: number }>;
  transfers: Record<string, { movedVolumeToday: number; active: boolean }>;
  triggers: string[];
}

export interface SimDataRecord {
  totalDays: number;
  frames: SimFrame[];
}

// ==========================================
// 2. SIMULATION ENGINE
// ==========================================
class SimEngine {
  public static runSimulation(
    containers: ContainerNode[],
    transfers: TransferLink[],
    durationDays: number = 30
  ): SimDataRecord {
    const frames: SimFrame[] = [];
    const containerState = new Map<string, { currentVolume: number; capacity: number }>();
    
    containers.forEach(c => {
      containerState.set(c.id, { currentVolume: c.currentVolume, capacity: c.capacity });
    });

    for (let day = 0; day <= durationDays; day++) {
      const frameTransfers: Record<string, { movedVolumeToday: number; active: boolean }> = {};
      const triggers: string[] = [];

      if (day > 0) {
        transfers.forEach(link => {
          const source = containerState.get(link.sourceId);
          const target = containerState.get(link.targetId);

          if (source && target) {
            const maxFromSource = source.currentVolume;
            const maxToTarget = target.capacity - target.currentVolume;
            const targetRate = link.transferRatePerDay;

            const actualMoved = Math.max(0, Math.min(targetRate, maxFromSource, maxToTarget));

            source.currentVolume -= actualMoved;
            target.currentVolume += actualMoved;

            frameTransfers[link.id] = {
              movedVolumeToday: actualMoved,
              active: actualMoved > 0
            };

            if (source.currentVolume <= 0 && maxFromSource > 0) {
              triggers.push(`Day ${day}: Source '${link.sourceId}' depleted.`);
            }
            if (target.currentVolume >= target.capacity) {
              triggers.push(`Day ${day}: Target '${link.targetId}' reached capacity.`);
            }
          }
        });
      } else {
        transfers.forEach(link => {
          frameTransfers[link.id] = { movedVolumeToday: 0, active: false };
        });
      }

      const frameContainers: Record<string, { currentVolume: number }> = {};
      containerState.forEach((state, id) => {
        frameContainers[id] = { currentVolume: state.currentVolume };
      });

      frames.push({
        day,
        containers: frameContainers,
        transfers: frameTransfers,
        triggers
      });
    }

    return { totalDays: durationDays, frames };
  }
}

// ==========================================
// 3. VIEWMODEL / STATE BUFFER
// ==========================================
class CanvasViewModel {
  private containers: ContainerNode[] = [];
  private transfers: TransferLink[] = [];
  private simRecord: SimDataRecord | null = null;
  private currentFrameIndex: number = 0;
  private isPlaybackMode: boolean = false;

  constructor() {
    this.containers = [
      { id: 'c1', name: 'Cut Area Alpha', type: 'excavation', position: { x: 80, y: 120 }, capacity: 10000, currentVolume: 8000, materialId: 'Clay', plantCount: 3 },
      { id: 'c2', name: 'Stockpile 01', type: 'stockpile', position: { x: 420, y: 120 }, capacity: 12000, currentVolume: 1500, materialId: 'Clay', plantCount: 2 },
      { id: 'c3', name: 'Quarry Import', type: 'external', position: { x: 80, y: 320 }, capacity: 50000, currentVolume: 50000, materialId: 'Gravel', plantCount: 1 }
    ];

    this.transfers = [
      { id: 't1', sourceId: 'c1', targetId: 'c2', transferRatePerDay: 400, points: [{ x: 220, y: 155 }, { x: 420, y: 155 }], activeVehicles: 5 },
      { id: 't2', sourceId: 'c3', targetId: 'c2', transferRatePerDay: 250, points: [{ x: 220, y: 355 }, { x: 320, y: 355 }, { x: 420, y: 190 }], activeVehicles: 3 }
    ];
  }

  public getContainers() { return this.containers; }
  public getTransfers() { return this.transfers; }

  public runSimulation() {
    this.simRecord = SimEngine.runSimulation(this.containers, this.transfers, 30);
    this.isPlaybackMode = true;
    this.currentFrameIndex = 0;
    return this.simRecord;
  }

  public exitPlaybackMode() {
    this.isPlaybackMode = false;
    this.simRecord = null;
    this.currentFrameIndex = 0;
  }

  public setFrame(index: number) {
    if (this.simRecord && index >= 0 && index < this.simRecord.frames.length) {
      this.currentFrameIndex = index;
    }
  }

  public getCurrentFrame() {
    return this.simRecord ? this.simRecord.frames[this.currentFrameIndex] : null;
  }

  public getIsPlaybackMode() { return this.isPlaybackMode; }
}

// ==========================================
// 4. REACT UI SHELL
// ==========================================
export default function App() {
  const vm = useMemo(() => new CanvasViewModel(), []);
  const [, setTick] = useState(0);
  const rerender = () => setTick(t => t + 1);

  const [currentDay, setCurrentDay] = useState(0);

  const isPlayback = vm.getIsPlaybackMode();
  const currentFrame = vm.getCurrentFrame();

  const handleRunSim = () => {
    vm.runSimulation();
    setCurrentDay(0);
    rerender();
  };

  const handleExitPlayback = () => {
    vm.exitPlaybackMode();
    setCurrentDay(0);
    rerender();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setCurrentDay(day);
    vm.setFrame(day);
    rerender();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Bar */}
      <header style={{ height: '48px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#22c55e', letterSpacing: '1px' }}>E4D</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', borderLeft: '1px solid #475569', paddingLeft: '12px' }}>Material Transfer Sim — Phase 2 Sandbox</span>
        </div>
        <div>
          {!isPlayback ? (
            <button onClick={handleRunSim} style={{ backgroundColor: '#22c55e', color: '#0f172a', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Run Simulation
            </button>
          ) : (
            <button onClick={handleExitPlayback} style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              Exit Playback
            </button>
          )}
        </div>
      </header>

      {/* Main 2:1 Split Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas Area (2/3 width) */}
        <div style={{ flex: 2, position: 'relative', borderRight: '1px solid #334155', backgroundColor: '#0b1329', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 12, left: 16, fontSize: '11px', color: '#475569', pointerEvents: 'none' }}>
            CANVAS VIEWPORT {isPlayback && <span style={{ color: '#eab308', marginLeft: '8px' }}>[LOCKED - PLAYBACK MODE]</span>}
          </div>

          <svg style={{ width: '100%', height: '100%' }}>
            {/* Draw Polyline Transfers */}
            {vm.getTransfers().map(link => {
              const activeInfo = currentFrame?.transfers[link.id];
              const isMoving = activeInfo?.active;
              return (
                <g key={link.id}>
                  <polyline
                    points={link.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={isMoving ? '#22c55e' : '#475569'}
                    strokeWidth={isMoving ? '4' : '2'}
                    strokeDasharray={isMoving ? '6,6' : 'none'}
                  />
                  <text
                    x={(link.points[0].x + link.points[link.points.length - 1].x) / 2}
                    y={(link.points[0].y + link.points[link.points.length - 1].y) / 2 - 8}
                    fill={isMoving ? '#4ade80' : '#94a3b8'}
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {isPlayback ? `${activeInfo?.movedVolumeToday ?? 0} m³/day` : `${link.transferRatePerDay} m³/day`}
                  </text>
                </g>
              );
            })}

            {/* Draw Container Nodes */}
            {vm.getContainers().map(node => {
              const liveVol = currentFrame?.containers[node.id]?.currentVolume ?? node.currentVolume;
              const volPct = Math.min(100, Math.round((liveVol / node.capacity) * 100));

              return (
                <g key={node.id} transform={`translate(${node.position.x}, ${node.position.y})`}>
                  <rect
                    width="140"
                    height="70"
                    rx="8"
                    fill="#1e293b"
                    stroke={node.type === 'excavation' ? '#38bdf8' : node.type === 'stockpile' ? '#f97316' : '#a855f7'}
                    strokeWidth="2"
                  />
                  <text x="10" y="20" fill="#f8fafc" fontSize="12" fontWeight="bold">{node.name}</text>
                  <text x="10" y="35" fill="#94a3b8" fontSize="10">{node.type.toUpperCase()}</text>

                  <rect x="10" y="45" width="120" height="8" rx="4" fill="#0f172a" />
                  <rect x="10" y="45" width={(120 * volPct) / 100} height="8" rx="4" fill="#22c55e" />
                  <text x="10" y="64" fill="#cbd5e1" fontSize="9">{liveVol.toLocaleString()} / {node.capacity.toLocaleString()} m³ ({volPct}%)</text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar Data Area (1/3 width) */}
        <div style={{ flex: 1, backgroundColor: '#0f172a', padding: '16px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px', textTransform: 'uppercase' }}>Data & Properties</h3>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '12px', color: '#22c55e', marginBottom: '8px' }}>Active Entities</h4>
            {vm.getContainers().map(c => (
              <div key={c.id} style={{ backgroundColor: '#1e293b', padding: '8px', borderRadius: '4px', marginBottom: '6px', fontSize: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                <div style={{ color: '#94a3b8' }}>Type: {c.type} | Fleet: {c.plantCount} units</div>
              </div>
            ))}
          </div>

          {isPlayback && currentFrame && (
            <div>
              <h4 style={{ fontSize: '12px', color: '#eab308', marginBottom: '8px' }}>Day {currentFrame.day} Simulation Events</h4>
              {currentFrame.triggers.length > 0 ? (
                currentFrame.triggers.map((trig, idx) => (
                  <div key={idx} style={{ backgroundColor: '#451a03', color: '#fde047', padding: '8px', borderRadius: '4px', marginBottom: '6px', fontSize: '11px' }}>
                    {trig}
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontSize: '12px' }}>Normal material flow operational.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timeline Timeslider Footer */}
      {isPlayback && (
        <footer style={{ height: '60px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#22c55e', minWidth: '80px' }}>Day {currentDay} / 30</span>
          <input
            type="range"
            min="0"
            max="30"
            value={currentDay}
            onChange={handleSliderChange}
            style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer' }}
          />
        </footer>
      )}
    </div>
  );
}