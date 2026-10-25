import React, { useState, useRef, useEffect } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { ContainerNode, TransferLink, OverflowMode, StrictSubRule } from './models/types';

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
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);
  
  // CSV Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFileName, setExportFileName] = useState<string>('material_transfer_simulation_complete.csv');

  // Hidden file input ref for import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group drag refs
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nodeInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentFrame = vm.getCurrentFrame();
  const frames = vm.getFrames();

  const selectedLink = selectedLinkId ? links.find(l => l.id === selectedLinkId) : null;
  const singleSelectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

  const drawArrowHead = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) => {
    const headLength = 21;
    const headWidth = 15;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-headLength / 2, 0);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.75;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headWidth / 2);
    ctx.lineTo(-headLength + 5, 0);
    ctx.lineTo(-headLength, headWidth / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

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

  const distToSegment = (p: Point, v: Point, w: Point): number => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

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

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    links.forEach(link => {
      const source = nodes.find(n => n.id === link.sourceId);
      const target = nodes.find(n => n.id === link.targetId);
      if (!source || !target) return;

      const isSelected = selectedLinkId === link.id;
      const linkFlow = isPlayback ? (currentFrame?.linkFlows[link.id] ?? 0) : link.dailyRate;
      const isActive = isPlayback && linkFlow > 0;

      const { points } = getLinkRoute(source, target);
      if (points.length < 2) return;

      const linkColor = isSelected ? '#38bdf8' : isActive ? '#22c55e' : '#38bdf8';
      ctx.strokeStyle = linkColor;
      ctx.lineWidth = isSelected ? 4 : isActive ? 3.5 : 3;

      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      const startArrowOffset = 40;
      const p0 = points[0];
      const p1 = points[1];
      const angle0 = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const seg0Len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      if (seg0Len > 5) {
        const dist = Math.min(startArrowOffset, seg0Len / 2);
        const ax0 = p0.x + Math.cos(angle0) * dist;
        const ay0 = p0.y + Math.sin(angle0) * dist;
        drawArrowHead(ctx, ax0, ay0, angle0, linkColor);
      }

      const endArrowOffset = 16;
      const pEndPrev = points[points.length - 2];
      const pEnd = points[points.length - 1];
      const angleEnd = Math.atan2(pEnd.y - pEndPrev.y, pEnd.x - pEndPrev.x);
      const segEndLen = Math.hypot(pEnd.x - pEndPrev.x, pEnd.y - pEndPrev.x);
      if (segEndLen > 5) {
        const dist = Math.min(endArrowOffset, segEndLen / 2);
        const axEnd = pEnd.x - Math.cos(angleEnd) * dist;
        const ayEnd = pEnd.y - Math.sin(angleEnd) * dist;
        drawArrowHead(ctx, axEnd, ayEnd, angleEnd, linkColor);
      }

      const midIdx = Math.floor(points.length / 2);
      const badgePt = {
        x: (points[midIdx - 1].x + points[midIdx].x) / 2,
        y: (points[midIdx - 1].y + points[midIdx].y) / 2
      };

      const displayRateText = `${Math.round(linkFlow).toLocaleString()} m³/d`;

      ctx.fillStyle = isSelected ? '#0369a1' : '#1e293b';
      ctx.fillRect(badgePt.x - 45, badgePt.y - 11, 90, 22);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(badgePt.x - 45, badgePt.y - 11, 90, 22);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(displayRateText, badgePt.x, badgePt.y + 4);
    });

    nodes.forEach(node => {
      const isSelected = selectedNodeIds.includes(node.id);
      const width = 120;
      const height = 80;
      const liveVol = isPlayback && currentFrame ? (currentFrame.nodeVolumes[node.id] ?? node.currentVolume) : node.currentVolume;
      const fillPct = Math.min(1, Math.max(0, liveVol / node.capacity));
      const isOverfilled = liveVol > node.capacity;

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(node.x - 4, node.y - 4, width + 8, height + 8);
      }

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(node.x, node.y, width, height);
      ctx.strokeStyle = isOverfilled ? '#ef4444' : (isSelected ? '#38bdf8' : '#334155');
      ctx.lineWidth = isOverfilled ? 2.5 : 2;
      ctx.strokeRect(node.x, node.y, width, height);

      ctx.fillStyle = isOverfilled ? '#ef4444' : (node.type === 'excavation' ? '#0d9488' : node.type === 'stockpile' ? '#b45309' : '#475569');
      ctx.fillRect(node.x + 8, node.y + 55, (width - 16) * Math.min(1, fillPct), 12);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(node.x + 8, node.y + 55, width - 16, 12);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(node.name, node.x + 10, node.y + 22);

      ctx.fillStyle = isOverfilled ? '#fca5a5' : '#94a3b8';
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

      const midIdx = Math.floor(points.length / 2);
      const badgePt = {
        x: (points[midIdx - 1].x + points[midIdx].x) / 2,
        y: (points[midIdx - 1].y + points[midIdx].y) / 2
      };
      if (mouseX >= badgePt.x - 45 && mouseX <= badgePt.x + 45 && mouseY >= badgePt.y - 11 && mouseY <= badgePt.y + 11) {
        return true;
      }

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
      overflowMode: 'strict',
      strictSubRule: 'throttleback'
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
      setIsGraphExpanded(true);
    } else {
      setIsGraphExpanded(false);
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

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, ''));
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/);
      let section = '';
      const importedNodes: ContainerNode[] = [];
      const importedLinks: TransferLink[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# SECTION: INITIAL MODEL NODES')) {
          section = 'NODES';
          continue;
        } else if (trimmed.startsWith('# SECTION: INITIAL MODEL LINKS')) {
          section = 'LINKS';
          continue;
        } else if (trimmed.startsWith('# SECTION:') || trimmed.startsWith('#')) {
          section = 'OTHER';
          continue;
        }

        if (!trimmed || trimmed.startsWith('NodeID') || trimmed.startsWith('LinkId')) continue;

        if (section === 'NODES') {
          const parts = parseCSVLine(trimmed);
          if (parts.length >= 9) {
            importedNodes.push({
              id: parts[0],
              name: parts[1],
              type: parts[2] as any,
              x: Number(parts[3]),
              y: Number(parts[4]),
              capacity: Number(parts[5]),
              currentVolume: Number(parts[6]),
              materialType: parts[7],
              plantCount: Number(parts[8]),
              overflowMode: 'strict',
              strictSubRule: 'throttleback'
            });
          }
        } else if (section === 'LINKS') {
          const parts = parseCSVLine(trimmed);
          if (parts.length >= 5) {
            importedLinks.push({
              id: parts[0],
              sourceId: parts[1],
              targetId: parts[2],
              dailyRate: Number(parts[3]),
              fleetCount: Number(parts[4])
            });
          }
        }
      }

      if (importedNodes.length > 0) {
        vm.loadModel(importedNodes, importedLinks);
        setNodes([...vm.getNodes()]);
        setLinks([...vm.getLinks()]);
        setSelectedNodeIds([]);
        setSelectedLinkId(null);
        alert(`Successfully imported model: ${importedNodes.length} nodes and ${importedLinks.length} links loaded into the live canvas!`);
      } else {
        alert('Could not find valid node data sections in the uploaded CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmExportCSV = () => {
    const frames = vm.getFrames();
    const nodesList = vm.getNodes();
    const linksList = vm.getLinks();

    let csvRows: string[] = [];

    csvRows.push('# SECTION: INITIAL MODEL NODES');
    csvRows.push('NodeID,Name,Type,X,Y,Capacity,InitialVolume,MaterialType,PlantCount');
    nodesList.forEach(n => {
      csvRows.push(`${n.id},"${n.name}",${n.type},${n.x},${n.y},${n.capacity},${n.currentVolume},"${n.materialType}",${n.plantCount}`);
    });

    csvRows.push('');
    csvRows.push('# SECTION: INITIAL MODEL LINKS');
    csvRows.push('LinkId,SourceId,TargetId,DailyRate,FleetCount');
    linksList.forEach(l => {
      csvRows.push(`${l.id},${l.sourceId},${l.targetId},${l.dailyRate},${l.fleetCount}`);
    });

    csvRows.push('');
    csvRows.push('# SECTION: SIMULATION TIMELINE TELEMETRY');
    csvRows.push('Day,EntityType,EntityId,EntityName,Value,CapacityOrDailyRate,Alerts');
    frames.forEach(frame => {
      const alertStr = `"${(frame.alerts || []).join(' | ')}"`;
      nodesList.forEach(node => {
        const vol = Math.round(frame.nodeVolumes[node.id] ?? node.currentVolume);
        csvRows.push(`${frame.day},Node,${node.id},"${node.name}",${vol},${node.capacity},${alertStr}`);
      });
      linksList.forEach(link => {
        const flow = Math.round(frame.linkFlows[link.id] ?? 0);
        csvRows.push(`${frame.day},Link,${link.id},"${link.sourceId}->${link.targetId}",${flow},${link.dailyRate},${alertStr}`);
      });
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFileName.endsWith('.csv') ? exportFileName : `${exportFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const canLink = selectedNodeIds.length === 2 && !isPlayback;
  const hasSelection = selectedNodeIds.length > 0 || selectedLinkId !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', maxHeight: '100vh', overflow: 'hidden', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCSVFile}
        accept=".csv"
        style={{ display: 'none' }}
      />

      {/* Top Header */}
      <header style={{ height: '52px', minHeight: '52px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: '#22c55e' }}>E4D</span>
          <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>Material Transfer Sim — Thumb-Center Aligned Graph & Scrubber</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#334155',
              color: '#38bdf8',
              border: '1px solid #475569',
              padding: '7px 14px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Import Model CSV to repopulate the canvas and links"
          >
            <span>📂 Import Model CSV</span>
          </button>

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

      {/* Batch Preset Control Bar */}
      <div style={{ height: '46px', minHeight: '46px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>⚙️ Quick Batch Presets:</span>
          <span>Apply rule defaults across all container nodes simultaneously.</span>
        </div>
        
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#1e293b', padding: '4px', borderRadius: '6px', border: '1px solid #334155' }}>
          <button
            onClick={() => {
              vm.applyGlobalPreset('strict', 'throttleback');
              setNodes([...vm.getNodes()]);
            }}
            style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            🔒 All Strict (Throttleback)
          </button>
          <button
            onClick={() => {
              vm.applyGlobalPreset('strict', 'headroom_hold');
              setNodes([...vm.getNodes()]);
            }}
            style={{ backgroundColor: '#0d9488', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ⏱️ All Strict (Headroom Hold)
          </button>
          <button
            onClick={() => {
              vm.applyGlobalPreset('overfill');
              setNodes([...vm.getNodes()]);
            }}
            style={{ backgroundColor: '#b45309', color: '#fde047', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ⚠️ All Overfill
          </button>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Left Area: Canvas + Graph Drawer */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          
          <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '16px', left: '20px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', color: isPlayback ? '#eab308' : '#64748b', textTransform: 'uppercase' }}>
                {isPlayback ? `[PLAYBACK ACTIVE — DAY ${currentDay} / 30]` : 'Canvas Active'}
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

          {/* PLAYBACK GRAPH DRAWER (Side-by-Side: Legend on Left, Thumb-Center Aligned Graph on Right) */}
          {isPlayback && (
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
                    
                    {/* Left Side: Legend & Volumes */}
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

                    {/* Right Side: Graph + Integrated Scrubber (Aligned exactly to Slider Thumb Centers & Extents) */}
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

                            return (
                              <g key={node.id}>
                                <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
                              </g>
                            );
                          })}

                          {/* Solid Thin Green Timeline Indicator Cursor aligned with currentDay */}
                          <line
                            x1={(currentDay / 30) * 500}
                            y1="0"
                            x2={(currentDay / 30) * 500}
                            y2="95"
                            stroke="#22c55e"
                            strokeWidth="1"
                          />
                        </svg>
                      </div>

                      {/* Scrubber Range Input & Extent Axis Labels */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', padding: '0 12px', boxSizing: 'border-box' }}>
                        <input
                          type="range"
                          min="0"
                          max="30"
                          value={currentDay}
                          onChange={handleSliderChange}
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
                /* Collapsed Footer Bar */
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
                    onChange={handleSliderChange}
                    style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer', height: '6px' }}
                  />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Day 30</span>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right 1/4: RHS Property Inspector / Telemetry Pane */}
        <div style={{ flex: 1, backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', minWidth: '300px', height: '100%', minHeight: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
            {isPlayback ? `Simulation Telemetry (Day ${currentDay})` : 'Property Inspector'}
          </div>

          {isPlayback ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>TIMELINE STATUS</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>Day {currentDay} of 30</div>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '14px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>SYSTEM DATA & MODEL EXPORT</div>
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📊 Export Model + Sim CSV...
                </button>
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

                  {/* Strict Mode Sub-Rules Panel */}
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', marginTop: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>Strict Rules Controls</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Node Overflow Mode</label>
                      <select
                        value={singleSelectedNode.overflowMode || 'strict'}
                        onChange={e => updateSingleNode('overflowMode', e.target.value as OverflowMode)}
                        style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '6px', fontSize: '11px' }}
                      >
                        <option value="strict">Strict Capacity (Enforced)</option>
                        <option value="overfill">Allow Overfill (Uncapped)</option>
                      </select>
                    </div>

                    {singleSelectedNode.overflowMode !== 'overfill' && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Strict Sub-Rule</label>
                          <select
                            value={singleSelectedNode.strictSubRule || 'throttleback'}
                            onChange={e => updateSingleNode('strictSubRule', e.target.value as StrictSubRule)}
                            style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '6px', fontSize: '11px' }}
                          >
                            <option value="throttleback">Proportional Throttleback</option>
                            <option value="headroom_hold">Headroom Hold (X Spare Space)</option>
                          </select>
                        </div>

                        {singleSelectedNode.strictSubRule === 'headroom_hold' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Required Spare Space (m³)</label>
                            <input
                              type="number"
                              value={singleSelectedNode.headroomThreshold ?? 500}
                              onChange={e => updateSingleNode('headroomThreshold', Number(e.target.value))}
                              style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '6px', fontSize: '11px' }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedNodeIds.length > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8' }}>
                    {selectedNodeIds.length} Containers Selected
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                    Multi-selection active. Properties are blanked out when multiple records are selected.
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
                  <div style={{ fontSize: '11px' }}>Click container nodes or transfer link badges to inspect and edit properties.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Save As / Export CSV Dialog Modal */}
      {isExportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '460px', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>📥 Export Complete Model + Sim CSV</div>
              <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
              <div>
                Exports a robust, clean CSV containing both the <strong>Initial Model Configuration</strong> and the <strong>30-Day Simulation Timeline Telemetry</strong>.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600, color: '#94a3b8' }}>Save As Filename</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={e => setExportFileName(e.target.value)}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', padding: '10px', fontSize: '12px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmExportCSV}
                style={{ backgroundColor: '#22c55e', color: '#0f172a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}