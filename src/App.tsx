import React, { useState, useRef, useEffect } from 'react';
import { ContainerNode, TransferLink, ContainerType } from './models/types';

export default function App() {
  const [nodes, setNodes] = useState<ContainerNode[]>([
    { id: 'node-1', name: 'Source Cut A', type: 'excavation', x: 140, y: 160, capacity: 50000, currentVolume: 42000, materialType: 'Type 1 Fill', plantCount: 4 },
    { id: 'node-2', name: 'Buffer Stockpile B', type: 'stockpile', x: 440, y: 160, capacity: 30000, currentVolume: 12500, materialType: 'Type 1 Fill', plantCount: 2 },
    { id: 'node-3', name: 'Processing Plant C', type: 'external', x: 740, y: 280, capacity: 100000, currentVolume: 55000, materialType: 'Crushed Aggregate', plantCount: 6 },
  ]);

  const [links, setLinks] = useState<TransferLink[]>([
    { id: 'link-1', sourceId: 'node-1', targetId: 'node-2', dailyRate: 1500, fleetCount: 5 },
    { id: 'link-2', sourceId: 'node-2', targetId: 'node-3', dailyRate: 1200, fleetCount: 4 },
  ]);

  const [selectedEntity, setSelectedEntity] = useState<{ type: 'node' | 'link'; id: string } | null>({ type: 'node', id: 'node-1' });
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedNode = selectedEntity?.type === 'node' ? nodes.find(n => n.id === selectedEntity.id) : null;
  const selectedLink = selectedEntity?.type === 'link' ? links.find(l => l.id === selectedEntity.id) : null;

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

      ctx.beginPath();
      ctx.moveTo(source.x + 60, source.y + 40);
      const midX = (source.x + target.x) / 2 + 60;
      ctx.lineTo(midX, source.y + 40);
      ctx.lineTo(midX, target.y + 40);
      ctx.lineTo(target.x + 60, target.y + 40);

      ctx.strokeStyle = isSelected ? '#38bdf8' : '#0284c7';
      ctx.lineWidth = isSelected ? 5 : 3;
      ctx.stroke();

      // Badge
      const badgeX = midX;
      const badgeY = (source.y + target.y) / 2 + 35;
      ctx.fillStyle = isSelected ? '#0369a1' : '#1e293b';
      ctx.fillRect(badgeX - 45, badgeY - 10, 90, 22);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX - 45, badgeY - 10, 90, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${link.dailyRate} m³/day`, badgeX, badgeY + 4);
    });

    // Nodes
    nodes.forEach(node => {
      const isSelected = selectedEntity?.type === 'node' && selectedEntity.id === node.id;
      const width = 120;
      const height = 80;

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

      const fillPct = Math.min(1, Math.max(0, node.currentVolume / node.capacity));
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
      ctx.fillText(`Vol: ${node.currentVolume.toLocaleString()} m³`, node.x + 10, node.y + 50);
    });
  }, [nodes, links, selectedEntity]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      return mouseX >= midX - 45 && mouseX <= midX + 45 && mouseY >= badgeY - 10 && mouseY <= badgeY + 12;
    });

    if (clickedLink) {
      setSelectedEntity({ type: 'link', id: clickedLink.id });
      return;
    }

    setSelectedEntity(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingNode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setNodes(prev => prev.map(n => {
      if (n.id === isDraggingNode) {
        return {
          ...n,
          x: Math.round((mouseX - dragOffset.x) / 20) * 20,
          y: Math.round((mouseY - dragOffset.y) / 20) * 20,
        };
      }
      return n;
    }));
  };

  const handleMouseUp = () => setIsDraggingNode(null);

  const updateNode = (field: keyof ContainerNode, val: any) => {
    if (!selectedNode) return;
    setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, [field]: val } : n));
  };

  const updateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink) return;
    setLinks(prev => prev.map(l => l.id === selectedLink.id ? { ...l, [field]: val } : l));
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* LEFT: 3/4 Canvas */}
      <div style={{ flex: 3, position: 'relative', height: '100%' }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: '#38bdf8' }}>E4D</span>
          <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>Canvas Active (3:1 Split)</span>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ display: 'block', width: '100%', height: '100%', cursor: isDraggingNode ? 'grabbing' : 'default' }}
        />
      </div>

      {/* RIGHT: 1/4 Property Inspector Sidebar */}
      <div style={{ flex: 1, backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', minWidth: '280px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          Property Inspector
        </div>

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
              <select value={selectedNode.type} onChange={e => updateNode('type', e.target.value as ContainerType)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}>
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
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Assigned Plant / Fleet Count</label>
              <input type="number" value={selectedNode.plantCount} onChange={e => updateNode('plantCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
            </div>
          </div>
        )}

        {selectedLink && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
              Selected: <strong style={{ color: '#38bdf8' }}>Transfer Link (Polyline)</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Source Node ID</label>
              <input type="text" disabled value={selectedLink.sourceId} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', padding: '8px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Target Node ID</label>
              <input type="text" disabled value={selectedLink.targetId} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', padding: '8px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Target Daily Rate (m³/day)</label>
              <input type="number" value={selectedLink.dailyRate} onChange={e => updateLink('dailyRate', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Active Fleet / Plant Count</label>
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
      </div>
    </div>
  );
}