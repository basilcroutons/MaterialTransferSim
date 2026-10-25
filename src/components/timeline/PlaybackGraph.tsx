import React from 'react';
import { ContainerNode, SimFrame } from '../../models/types';

interface PlaybackGraphProps {
  isPlayback: boolean;
  isGraphExpanded: boolean;
  setIsGraphExpanded: (expanded: boolean) => void;
  currentDay: number;
  onSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  nodes: ContainerNode[];
  frames: SimFrame[];
  currentFrame: SimFrame;
}

export const PlaybackGraph: React.FC<PlaybackGraphProps> = ({
  isPlayback,
  isGraphExpanded,
  setIsGraphExpanded,
  currentDay,
  onSliderChange,
  nodes,
  frames,
  currentFrame
}) => {
  if (!isPlayback) return null;

  return (
    <div style={{ backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {isGraphExpanded ? (
        <div style={{ height: '220px', maxHeight: '220px', padding: '12px 20px', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Container Volume Telemetry & Timeline Alignment (Days 0 - 30)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setIsGraphExpanded(false)}
                style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                ▼ Collapse Graph
              </button>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Active Day: <strong style={{ color: '#f8fafc' }}>Day {currentDay}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '16px' }}>
            <div style={{ width: '220px', minWidth: '220px', backgroundColor: '#0f172a', borderRadius: '4px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', border: '1px solid #334155', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                Series Legend & Volumes
              </div>
              {nodes.map((node, idx) => {
                const colors = ['#0d9488', '#b45309', '#38bdf8', '#a855f7', '#22c55e', '#ec4899'];
                const color = colors[idx % colors.length];
                const liveVol = currentFrame ? Math.round(currentFrame.nodeVolumes[node.id] ?? node.currentVolume) : node.currentVolume;
                return (
                  <div key={node.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      <span style={{ width: '8px', height: '8px', backgroundColor: color, borderRadius: '2px', flexShrink: 0 }} />
                      <span style={{ color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={node.name}>{node.name}</span>
                    </div>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace' }}>{liveVol.toLocaleString()} m³</span>
                  </div>
                );
              })}
            </div>

            <div style={{ flex: 1, minHeight: 0, position: 'relative', backgroundColor: '#0f172a', borderRadius: '4px', padding: '8px 0', boxSizing: 'border-box', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minHeight: 0, position: 'relative', width: '100%', padding: '0 20px', boxSizing: 'border-box' }}>
                <svg width="100%" height="100%" viewBox="0 0 500 95" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 20, width: 'calc(100% - 40px)', height: '100%', display: 'block' }}>
                  <line x1="0" y1="23" x2="500" y2="23" stroke="#1e293b" strokeWidth="1" />
                  <line x1="0" y1="47" x2="500" y2="47" stroke="#1e293b" strokeWidth="1" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="#1e293b" strokeWidth="1" />

                  {nodes.map((node, idx) => {
                    const colors = ['#0d9488', '#b45309', '#38bdf8', '#a855f7', '#22c55e', '#ec4899'];
                    const color = colors[idx % colors.length];
                    const maxCap = Math.max(...nodes.map(n => n.capacity), 50000);
                    const points = frames.map((frame, fIdx) => {
                      const x = (fIdx / 30) * 500;
                      const y = 90 - (Math.min(node.capacity, frame.nodeVolumes[node.id] || 0) / maxCap) * 85;
                      return `${x},${y}`;
                    }).join(' ');

                    return <polyline key={node.id} fill="none" stroke={color} strokeWidth="2.5" points={points} />;
                  })}

                  <line x1={(currentDay / 30) * 500} y1="0" x2={(currentDay / 30) * 500} y2="95" stroke="#22c55e" strokeWidth="1" />
                </svg>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', padding: '0 12px', boxSizing: 'border-box' }}>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={currentDay}
                  onChange={onSliderChange}
                  style={{ width: '100%', accentColor: '#22c55e', cursor: 'pointer', height: '6px', margin: 0, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', padding: '0 8px', boxSizing: 'border-box' }}>
                  <span style={{ marginLeft: '-6px' }}>Day 0</span>
                  <span>Day 15</span>
                  <span style={{ marginRight: '-6px' }}>Day 30</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 20px', boxSizing: 'border-box' }}>
          <button
            onClick={() => setIsGraphExpanded(true)}
            style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
          >
            ▲ Pull Up Graph
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', minWidth: '60px' }}>Day {currentDay}</span>
          <input
            type="range"
            min="0"
            max="30"
            value={currentDay}
            onChange={onSliderChange}
            style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer', height: '6px' }}
          />
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Day 30</span>
        </div>
      )}
    </div>
  );
};