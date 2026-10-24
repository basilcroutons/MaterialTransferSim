import React, { useState, useRef, useEffect } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { ContainerNode, TransferLink } from './models/types';

interface Point { x: number; y: number; }

export default function App() {
  const [vm] = useState(() => new CanvasViewModel());
  const [nodes, setNodes] = useState<ContainerNode[]>(vm.getNodes());
  const [links, setLinks] = useState<TransferLink[]>(vm.getLinks());
  
  // Selection state
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['node-1']);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const [isPlayback, setIsPlayback] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(0);
  
  // Group drag refs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nodeInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentFrame = vm.getCurrentFrame();

  const selectedLink = selectedLinkId ? links.find(l => l.id === selectedLinkId) : null;
  const singleSelectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

  // Helper to draw clean directional arrowhead rotated according to segment angle
  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) => {
    const headLength = 14;
    const headWidth = 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headWidth / 2);
    ctx.lineTo(-headLength + 3, 0);
    ctx.lineTo(-headLength, headWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Helper: compute edge intersection on container bounding box
  const getContainerPort = (node: ContainerNode, targetPt: Point): Point => {
    const w = 120;
    const h = 80;
    const cx = node.x + w / 2;
    const cy = node.y + h / 2;
    const dx = targetPt.x - cx;
    const dy = targetPt.y - cy;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    const scaleX = (w / 2) / Math.abs(dx || 0.0001);
    const scaleY = (h / 2) / Math.abs(dy || 0.0001);
    const scale = Math.min(scaleX, scaleY);

    return {
      x: cx + dx * scale,
      y: cy + dy * scale
    };
  };

  // Helper: compute distance from point to line segment
  const distToSegment = (p: Point, v: Point, w: Point): number => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  // Calculate 3-segment orthogonal routing points for a link
  const getLinkRoute = (source: ContainerNode, target: ContainerNode): { points: Point[]; startPort: Point; endPort: Point } => {
    const w = 120;
    const h = 80;
    const srcCenter = { x: source.x + w / 2, y: source.y + h / 2 };
    const tgtCenter = { x: target.x + w / 2, y: target.y + h / 2 };

    const dx = Math.abs(tgtCenter.x - srcCenter.x);
    const dy = Math.abs(tgtCenter.y - srcCenter.y);

    let points: Point[] = [];
    let startPort: Point;
    let endPort: Point;

    if (dx >= dy) {
      // Predominantly horizontal orientation
      const midX = (srcCenter.x + tgtCenter.x) / 2;
      startPort = getContainerPort(source, { x: midX, y: srcCenter.y });
      endPort = getContainerPort(target, { x: midX, y: tgtCenter.y });
      points = [
        startPort,
        { x: midX, y: startPort.y },
        { x: midX, y: endPort.y },
        endPort
      ];
    } else {
      // Predominantly vertical orientation
      const midY = (srcCenter.y + tgtCenter.y) / 2;
      startPort = getContainerPort(source, { x: srcCenter.x, y: midY });
      endPort = getContainerPort(target, { x: tgtCenter.x, y: midY });
      points = [
        startPort,
        { x: startPort.x, y: midY },
        { x: endPort.x, y: midY },
        endPort
      ];
    }

    return { points, startPort, endPort };
  };

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

    // Render Links
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (!source || !target) return;

      const isSelected = selectedLinkId === link.id;
      const linkFlow = isPlayback ? (currentFrame?.linkFlows[link.id] || 0) : link.dailyRate;
      const isActive = isPlayback && linkFlow > 0;

      const { points } = getLinkRoute(source, target);
      if (points.length < 2) return;

      const linkColor = isSelected ? '#38bdf8' : isActive ? '#22c55e' : '#38bdf8';
      ctx.strokeStyle = linkColor;
      ctx.lineWidth = isSelected ? 4 : isActive ? 3.5 : 3;

      if (isActive) {
        ctx.setLineDash([6, 6]);
      } else {
        ctx.setLineDash([]);
      }

      // Draw wire route
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw direction arrows along first and last segments
      const arrowOffset = 20;

      // First segment (leaving source)
      const p0 = points[0];
      const p1 = points[1];
      const angle0 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const seg0Len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (seg0Len > 5) {
        const dist = Math.min(arrowOffset, seg0Len / 2);
        const ax0 = p0.x + Math.cos(angle0) * dist;
        const ay0 = p0.y + Math.sin(angle0) * dist;
        drawArrowHead(ctx, ax0, ay0, angle0, linkColor);
      }

      // Last segment (entering target)
      const pEndPrev = points[points.length - 2];
      const pEnd = points[points.length - 1];
      const angleEnd = Math.atan2(pEnd.y - pEndPrev.y, pEnd.x - pEndPrev.x);
      const segEndLen = Math.hypot(pEnd.x - pEndPrev.x, pEnd.y - pEndPrev.y);
      if (segEndLen > 5) {
        const dist = Math.min(arrowOffset, segEndLen / 2);
        const axEnd = pEnd.x - Math.cos(angleEnd) * dist;
        const ayEnd = pEnd.y - Math.sin(angleEnd) * dist;
        drawArrowHead(ctx, axEnd, ayEnd, angleEnd, linkColor);
      }

      // Rate Badge at midpoint segment
      const midIdx = Math.floor(points.length / 2);
      const badgePt = {
        x: (points[midIdx - 1].x + points[midIdx].x) / 2,
        y: (points[midIdx - 1].y + points[midIdx].y) / 2
      };

      ctx.fillStyle = isSelected ? '#0369a1' : '#1e293b';
      ctx.fillRect(badgePt.x - 55, badgePt.y - 11, 110, 22);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(badgePt.x - 55, badgePt.y - 11, 110, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const sourceName = source.name.length > 8 ? source.name.substring(0, 6) + '..' : source.name;
      const targetName = target.name.length > 8 ? target.name.substring(0, 6) + '..' : target.name;
      ctx.fillText(`${link.dailyRate} m³/d (${sourceName}➔${targetName})`, badgePt.x, badgePt.y + 3);
    });

    // Render Nodes (drawn on top of link exit ports)
    nodes.forEach(node => {
      const isSelected = selectedNodeIds.includes(node.id);
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
  }, [nodes, links, selectedNodeIds, selectedLinkId, isPlayback, currentFrame]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlayback) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedNode = nodes.slice().reverse().find(n => 
      mouseX >= n.x && mouseX <= n.x + 120 && mouseY >= n.y && mouseY <= n.y + 80
    );

    if (clickedNode) {
      const isCtrl = e.ctrlKey || e.metaKey;
      let newSelectedNodeIds = [...selectedNodeIds];

      if (isCtrl) {
        if (newSelectedNodeIds.includes(clickedNode.id)) {
          newSelectedNodeIds = newSelectedNodeIds.filter(id => id !== clickedNode.id);
        } else {
          newSelectedNodeIds.push(clickedNode.id);
        }
      } else {
        if (!newSelectedNodeIds.includes(clickedNode.id)) {
          newSelectedNodeIds = [clickedNode.id];
        }
      }

      setSelectedNodeIds(newSelectedNodeIds);
      setSelectedLinkId(null);

      setIsDragging(true);
      dragStartRef.current = { x: mouseX, y: mouseY };
      const initialMap = new Map<string, { x: number; y: number }>();
      nodes.forEach(n => initialMap.set(n.id, { x: n.x, y: n.y }));
      nodeInitialPositionsRef.current = initialMap;
      return;
    }

    const clickedLink = links.find(link => {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (!source || !target) return false;

      const { points } = getLinkRoute(source, target);

      // Check distance to rate badge
      const midIdx = Math.floor(points.length / 2);
      const badgePt = {
        x: (points[midIdx - 1].x + points[midIdx].x) / 2,
        y: (points[midIdx - 1].y + points[midIdx].y) / 2
      };
      if (mouseX >= badgePt.x - 55 && mouseX <= badgePt.x + 55 && mouseY >= badgePt.y - 11 && mouseY <= badgePt.y + 11) {
        return true;
      }

      // Check proximity to any segment
      for (let i = 0; i < points.length - 1; i++) {
        if (distToSegment({ x: mouseX, y: mouseY }, points[i], points[i + 1]) < 8) {
          return true;
        }
      }
      return false;
    });

    if (clickedLink) {
      setSelectedLinkId(clickedLink.id);
      setSelectedNodeIds([]);
      return;
    }

    if (!e.ctrlKey && !e.metaKey) {
      setSelectedNodeIds([]);
      setSelectedLinkId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || isPlayback) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStartRef.current.x;
    const dy = mouseY - dragStartRef.current.y;

    nodes.forEach(n => {
      if (selectedNodeIds.includes(n.id)) {
        const initial = nodeInitialPositionsRef.current.get(n.id);
        if (initial) {
          const newX = Math.round((initial.x + dx) / 20) * 20;
          const newY = Math.round((initial.y + dy) / 20) * 20;
          vm.updateNodePosition(n.id, newX, newY);
        }
      }
    });

    setNodes([...vm.getNodes()]);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleAddNode = () => {
    if (isPlayback) return;
    const newId = `node-${Date.now()}`;
    const newNode: ContainerNode = {
      id: newId,
      name: `Container ${nodes.length + 1}`,
      type: 'stockpile',
      x: 300,
      y: 200,
      capacity: 40000,
      currentVolume: 10000,
      materialType: 'Type 1 Fill',
      plantCount: 3,
    };
    vm.addNode(newNode);
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([newId]);
    setSelectedLinkId(null);
  };

  const handleAddLinkBetweenSelected = () => {
    if (isPlayback || selectedNodeIds.length !== 2) return;
    const sourceId = selectedNodeIds[0];
    const targetId = selectedNodeIds[1];

    const newLink: TransferLink = {
      id: `link-${Date.now()}`,
      sourceId,
      targetId,
      dailyRate: 1000,
      fleetCount: 3,
    };
    vm.addLink(newLink);
    setLinks([...vm.getLinks()]);
    setSelectedLinkId(newLink.id);
    setSelectedNodeIds([]);
  };

  const handleDeleteSelected = () => {
    if (isPlayback) return;
    if (selectedLinkId) {
      vm.removeLink(selectedLinkId);
      setSelectedLinkId(null);
    } else if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(id => vm.removeNode(id));
      setSelectedNodeIds([]);
    }
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
  };

  const togglePlayback = () => {
    const nextState = !isPlayback;
    setIsPlayback(nextState);
    vm.setPlayback(nextState);
    if (nextState) {
      setCurrentDay(0);
      vm.setFrameIndex(0);
      setSelectedNodeIds([]);
      setSelectedLinkId(null);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setCurrentDay(day);
    vm.setFrameIndex(day);
  };

  const updateSingleNode = (field: keyof ContainerNode, val: any) => {
    if (!singleSelectedNode || isPlayback) return;
    (singleSelectedNode as any)[field] = val;
    vm.recalculateSimulation();
    setNodes([...vm.getNodes()]);
  };

  const updateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink || isPlayback) return;
    (selectedLink as any)[field] = val;
    vm.recalculateSimulation();
    setLinks([...vm.getLinks()]);
  };

  const canLink = selectedNodeIds.length === 2 && !isPlayback;
  const hasSelection = selectedNodeIds.length > 0 || selectedLinkId !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      
      <header style={{ height: '52px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: '#22c55e' }}>E4D</span>
          <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>Material Transfer Sim — Adaptive Dynamic Orthogonal Routing</span>
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{ flex: 3, position: 'relative', height: '100%' }}>
          <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: isPlayback ? '#eab308' : '#64748b', textTransform: 'uppercase' }}>
              {isPlayback ? `[PLAYBACK ACTIVE — DAY ${currentDay} / 30 — EDITING LOCKED]` : 'Canvas Active (Adaptive Vertical & Horizontal Routing)'}
            </span>
          </div>

          {!isPlayback && (
            <div style={{ position: 'absolute', top: '16px', right: '20px', display: 'flex', gap: '8px', zIndex: 20, backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
              <button onClick={handleAddNode} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                + Add Node
              </button>
              <button
                onClick={handleAddLinkBetweenSelected}
                disabled={!canLink}
                style={{
                  backgroundColor: canLink ? '#0d9488' : '#334155',
                  color: canLink ? '#fff' : '#94a3b8',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: canLink ? 'pointer' : 'not-allowed'
                }}
                title={selectedNodeIds.length === 2 ? "Create link from Node 1 to Node 2" : "Select exactly 2 containers to enable linking"}
              >
                🔗 +Link (2 Selected)
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={!hasSelection}
                style={{
                  backgroundColor: hasSelection ? '#b91c1c' : '#334155',
                  color: hasSelection ? '#fff' : '#94a3b8',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: hasSelection ? 'pointer' : 'not-allowed'
                }}
              >
                🗑️ Delete
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: 'block', width: '100%', height: '100%', cursor: isPlayback ? 'default' : (isDragging ? 'grabbing' : 'default') }}
          />
        </div>

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
              {selectedNodeIds.length === 1 && singleSelectedNode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                    Selected: <strong style={{ color: '#38bdf8' }}>Container Node</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Node Name</label>
                    <input type="text" value={singleSelectedNode.name} onChange={e => updateSingleNode('name', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Container Type</label>
                    <select value={singleSelectedNode.type} onChange={e => updateSingleNode('type', e.target.value as any)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}>
                      <option value="excavation">Excavation (Cut)</option>
                      <option value="stockpile">Stockpile (Fill)</option>
                      <option value="null">Null Junction</option>
                      <option value="external">External Boundary</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Capacity (m³)</label>
                    <input type="number" value={singleSelectedNode.capacity} onChange={e => updateSingleNode('capacity', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Current Volume (m³)</label>
                    <input type="number" value={singleSelectedNode.currentVolume} onChange={e => updateSingleNode('currentVolume', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Assigned Material</label>
                    <input type="text" value={singleSelectedNode.materialType} onChange={e => updateSingleNode('materialType', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Plant / Fleet Count</label>
                    <input type="number" value={singleSelectedNode.plantCount} onChange={e => updateSingleNode('plantCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
                  </div>
                </div>
              )}

              {selectedNodeIds.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>
                    {selectedNodeIds.length} Containers Selected
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                    Multi-selection active. Properties are blanked out when multiple records are selected. You can drag them together as a group or click <strong>🔗 +Link</strong> when exactly 2 are selected.
                  </div>
                </div>
              )}

              {selectedLink && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                    Selected: <strong style={{ color: '#38bdf8' }}>Transfer Link</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Source Container</label>
                    <select
                      value={selectedLink.sourceId}
                      onChange={e => updateLink('sourceId', e.target.value)}
                      style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Target Container</label>
                    <select
                      value={selectedLink.targetId}
                      onChange={e => updateLink('targetId', e.target.value)}
                      style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}
                    >
                      {nodes.map(n => (
                        <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                      ))}
                    </select>
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

              {!hasSelection && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#64748b', textAlign: 'center', fontSize: '12px', gap: '8px' }}>
                  <div>No entity selected</div>
                  <div style={{ fontSize: '11px' }}>Click container nodes (Ctrl+click for multi-select) or transfer link badges to inspect and edit properties.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
