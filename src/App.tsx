import React, { useState } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';

const vm = new CanvasViewModel();

export default function App() {
    const [currentDay, setCurrentDay] = useState(0);
    const frames = vm.getFrames();
    const nodes = vm.getNodes();
    const links = vm.getLinks();

    const currentFrame = frames[currentDay] || frames[0];

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: '#f8fafc' }}>
            {/* Header Toolbar */}
            <header style={{ padding: '16px 24px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>MaterialTransferSim Workspace (Phase 2)</h1>
                <span style={{ fontSize: '0.875rem', padding: '4px 12px', borderRadius: '9999px', backgroundColor: '#0284c7', color: '#ffffff' }}>Active Mode: Simulation Playback</span>
            </header>

            {/* Main Interactive 2:1 Split Canvas */}
            <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <svg style={{ width: '100%', height: '100%', cursor: 'grab' }}>
                    {/* Render Transfer Links */}
                    {links.map(link => {
                        const source = nodes.find(n => n.id === link.sourceNodeId);
                        const target = nodes.find(n => n.id === link.targetNodeId);
                        if (!source || !target) return null;

                        return (
                            <g key={link.id}>
                                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#38bdf8" strokeWidth="4" strokeDasharray="6 6" />
                            </g>
                        );
                    })}

                    {/* Render Container Nodes */}
                    {nodes.map(node => {
                        const currentVol = currentFrame?.nodeVolumes[node.id] ?? node.currentVolume;
                        const fillPercent = Math.min(100, (currentVol / node.capacity) * 100);

                        return (
                            <g key={node.id} transform={`translate(${node.x - 60}, ${node.y - 40})`}>
                                <rect width="120" height="80" rx="8" fill="#1e293b" stroke="#0284c7" strokeWidth="2" />
                                <rect x="5" y={75 - (60 * fillPercent / 100)} width="110" height={60 * fillPercent / 100} fill="#38bdf8" opacity="0.4" rx="4" />
                                <text x="60" y="25" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="bold">{node.label}</text>
                                <text x="60" y="50" textAnchor="middle" fill="#94a3b8" fontSize="10">{Math.round(currentVol)} / {node.capacity} m³</text>
                            </g>
                        );
                    })}
                </svg>
            </main>

            {/* Bottom Playback Timeslider */}
            <footer style={{ padding: '20px 32px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#94a3b8' }}>
                    <span>Simulation Playback Timeline</span>
                    <span>Day {currentDay} of {frames.length - 1}</span>
                </div>
                <input 
                    type="range" 
                    min={0} 
                    max={frames.length - 1} 
                    value={currentDay} 
                    onChange={(e) => setCurrentDay(Number(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                />
            </footer>
        </div>
    );
}
