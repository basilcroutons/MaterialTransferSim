import React, { useState, useRef, useEffect } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { ContainerNode, TransferLink } from './models/types';

export default function App() {
  const [vm] = useState(() => new CanvasViewModel());
  const [selectedEntity, setSelectedEntity] = useState<{ type: 'node' | 'link'; id: string } | null>({ type: 'node', id: 'node-1' });
  const [isPlayback, setIsPlayback] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [, setForceTick] = useState(0);
  const triggerRender = () => setForceTick(t => t + 1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const nodes = vm.getNodes();
  const links = vm.getLinks();
  const currentFrame = vm.getCurrentFrame();

  const selectedNode = selectedEntity?.type === 'node' ? nodes.find(n => n.id === selectedEntity.id) : null;
  const selectedLink = selectedEntity?.type === 'link' ? links.find(l => l.id === selectedEntity.id) : null;

  // Handle Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Links
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (!source || !target) return;

      const isSelected = selectedEntity?.type === 'link' && selectedEntity.id === link.id;
      const linkFlow = isPlayback ? (currentFrame?.linkFlows[link.id] || 0) : link.dailyRate;
      const isActive = isPlayback && linkFlow > 0;

      ctx.beginPath();
      ctx.moveTo(source.x + 60, source.y + 40);
      const midX = (source.x + target.x) / 2 + 60;
      ctx.lineTo(midX, source.y + 40);
      ctx.lineTo(midX, target.y + 40);
      ctx.lineTo(target.x + 60, target.y + 40);

      ctx.strokeStyle = isSelected ? '#38bdf8' : isActive ? '#22c55e' : '#0284c7';
      ctx.lineWidth = isSelected ? 5 : isActive ? 4 : 3;
      if (isActive) {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      // Rate Badge
      const badgeX = midX;
      const badgeY = (source.y + target.y) / 2 + 35;
      ctx.fillStyle = isSelected ? '#0369a1' : '#1e293b';
      ctx.fillRect(badgeX - 50, badgeY - 10, 100, 22);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX - 50, badgeY - 10, 100, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isPlayback ? `${linkFlow} m³/day` : `${link.dailyRate} m³/day`, badgeX, badgeY + 4);
    });

    // Nodes
    nodes.forEach(node => {
      const isSelected = selectedEntity?.type === 'node' && selectedEntity.id === node.id;
      const width = 120;
      const height = 80;
      const liveVol = isPlayback && currentFrame ? (currentFrame.nodeVolumes[node.id] ?? node.currentVolume) : node.currentVolume;
      const fillPct = Math.min(1, Math.max(0, liveVol / node.capacity));

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(node.x - 4, node.y - 4, width + 8, height + 8);
      }

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(node.x, node.y, width, height);
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(node.x, node.y, width, height);

      // Fill Bar
      ctx.fillStyle = node.type === 'excavation' ? '#0d9488' : node.type === 'stockpile' ? '#b45309' : '#475569';
      ctx.fillRect(node.x + 8, node.y + 55, (width - 16) * fillPct, 12);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(node.x + 8, node.y + 55, width - 16, 12);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(node.name, node.x + 10, node.y + 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(`Type: ${node.type}`, node.x + 10, node.y + 38);
      ctx.fillText(`Vol: ${Math.round(liveVol).toLocaleString()} m³`, node.x + 10, node.y + 50);
    });
  }, [nodes, links, selectedEntity, isPlayback, currentFrame]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlayback) return; // Lock editing during playback

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedNode = nodes.slice().reverse().find(n => 
      mouseX >= n.x && mouseX <= n.x + 120 && mouseY >= n.y && mouseY <= n.y + 80
    );

    if (clickedNode) {
      setSelectedEntity({ type: 'node', id: clickedNode.id });
      setIsDraggingNode(clickedNode.id);
      setDragOffset({ x: mouseX - clickedNode.x, y: mouseY - clickedNode.y });
      return;
    }

    const clickedLink = links.find(link => {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (!source || !target) return false;
      const midX = (source.x + target.x) / 2 + 60;
      const badgeY = (source.y + target.y) / 2 + 35;
      return mouseX >= midX - 50 && mouseX <= midX + 50 && mouseY >= badgeY - 10 && mouseY <= badgeY + 12;
    });

    if (clickedLink) {
      setSelectedEntity({ type: 'link', id: clickedLink.id });
      return;
    }

    setSelectedEntity(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingNode || isPlayback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    nodes.forEach(n => {
      if (n.id === isDraggingNode) {
        n.x = Math.round((mouseX - dragOffset.x) / 20) * 20;
        n.y = Math.round((mouseY - dragOffset.y) / 20) * 20;
      }
    });
    triggerRender();
  };

  const handleMouseUp = () => setIsDraggingNode(null);

  const togglePlayback = () => {
    const nextState = !isPlayback;
    setIsPlayback(nextState);
    vm.setPlayback(nextState);
    if (nextState) {
      setCurrentDay(0);
      vm.setFrameIndex(0);
      setSelectedEntity(null);
    }
    triggerRender();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setCurrentDay(day);
    vm.setFrameIndex(day);
    triggerRender();
  };

  const updateNode = (field: keyof ContainerNode, val: any) => {
    if (!selectedNode || isPlayback) return;
    (selectedNode as any)[field] = val;
    vm.recalculateSimulation();
    triggerRender();
  };

  const updateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink || isPlayback) return;
    (selectedLink as any)[field] = val;
    vm.recalculateSimulation();
    triggerRender();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ height: '52px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: '#22c55e' }}>E4D</span>
          <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>Material Transfer Sim — 3:1 Split & Simulation Playback</span>
        </div>
        <div>
          <button
            onClick={togglePlayback}
            style={{
              backgroundColor: isPlayback ? '#ef4444' : '#22c55e',
              color: isPlayback ? '#ffffff' : '#0f172a',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {isPlayback ? 'Exit Playback Mode' : 'Run Simulation & Play'}
          </button>
        </div>
      </header>

      {/* Main Workspace (3:1 Split) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT: 3/4 Canvas Area */}
        <div style={{ flex: 3, position: 'relative', height: '100%' }}>
          <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: isPlayback ? '#eab308' : '#64748b', textTransform: 'uppercase' }}>
              {isPlayback ? `[PLAYBACK ACTIVE — DAY ${currentDay} / 30 — EDITING LOCKED]` : 'Canvas Active (Interactive Editor)'}
            </span>
          </div>

          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: 'block', width: '100%', height: '100%', cursor: isPlayback ? 'default' : (isDraggingNode ? 'grabbing' : 'default') }}
          />
        </div>

        {/* RIGHT: 1/4 Property Inspector & Alerts Sidebar */}
        <div style={{ flex: 1, backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', minWidth: '300px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            {isPlayback ? `Simulation Telemetry (Day ${currentDay})` : 'Property Inspector'}
          </div>

          {isPlayback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>TIMELINE STATUS</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>Day {currentDay} of 30</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#eab308', marginBottom: '8px' }}>Active Alerts & Triggers</div>
                {currentFrame && currentFrame.alerts.length > 0 ? (
                  currentFrame.alerts.map((alert, idx) => (
                    <div key={idx} style={{ backgroundColor: '#451a03', border: '1px solid #f59e0b', color: '#fde047', padding: '8px 10px', borderRadius: '4px', marginBottom: '6px', fontSize: '11px' }}>
                      {alert}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#64748b', fontSize: '12px', backgroundColor: '#0f172a', padding: '10px', borderRadius: '4px' }}>
                    No triggers or capacity warnings on Day {currentDay}.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {selectedNode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                    Selected: <strong style={{ color: '#38bdf8' }}>Container Node</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Node Name</label>
                    <input type="text" value={selectedNode.name} onChange={e => updateNode('name', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Container Type</label>
                    <select value={selectedNode.type} onChange={e => updateNode('type', e.target.value as any)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}>
                      <option value="excavation">Excavation (Cut)</option>
                      <option value="stockpile">Stockpile (Fill)</option>
                      <option value="null">Null Junction</option>
                      <option value="external">External Boundary</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Capacity (m³)</label>
                    <input type="number" value={selectedNode.capacity} onChange={e => updateNode('capacity', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Current Volume (m³)</label>
                    <input type="number" value={selectedNode.currentVolume} onChange={e => updateNode('currentVolume', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Assigned Material</label>
                    <input type="text" value={selectedNode.materialType} onChange={e => updateNode('materialType', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Plant / Fleet Count</label>
                    <input type="number" value={selectedNode.plantCount} onChange={e => updateNode('plantCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                </div>
              )}

              {selectedLink && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                    Selected: <strong style={{ color: '#38bdf8' }}>Transfer Link</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Source / Target</label>
                    <input type="text" disabled value={`${selectedLink.sourceId} ➔ ${selectedLink.targetId}`} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Daily Rate (m³/day)</label>
                    <input type="number" value={selectedLink.dailyRate} onChange={e => updateLink('dailyRate', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Fleet Count</label>
                    <input type="number" value={selectedLink.fleetCount} onChange={e => updateLink('fleetCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                </div>
              )}

              {!selectedNode && !selectedLink && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#64748b', textAlign: 'center', fontSize: '12px', gap: '8px' }}>
                  <div>No entity selected</div>
                  <div style={{ fontSize: '11px' }}>Click any container node or transfer link badge on the canvas to inspect and edit its properties.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Timeslider Footer (Visible in Playback Mode) */}
      {isPlayback && (
        <footer style={{ height: '64px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '20px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: '100px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>TIMELINE SCRUBBER</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>Day {currentDay} / 30</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            value={currentDay}
            onChange={handleSliderChange}
            style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer', height: '6px' }}
          />
        </footer>
      )}
    </div>
  );
}