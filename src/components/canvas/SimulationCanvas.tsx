import React, { useRef, useEffect, useState } from 'react';
import { ContainerNode, TransferLink, SimFrame } from '../../models/types';
import { CanvasViewModel } from '../../viewmodel/CanvasViewModel';

interface Point { x: number; y: number; }

interface SimulationCanvasProps {
  vm: CanvasViewModel;
  nodes: ContainerNode[];
  links: TransferLink[];
  selectedNodeIds: string[];
  selectedLinkId: string | null;
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedLinkId: (id: string | null) => void;
  isPlayback: boolean;
  currentFrame: SimFrame;
  onNodesUpdated: () => void;
  onAddNode: () => void;
  onAddLink: () => void;
  onDeleteSelected: () => void;
  canLink: boolean;
  hasSelection: boolean;
  isGraphExpanded: boolean;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  vm,
  nodes,
  links,
  selectedNodeIds,
  selectedLinkId,
  setSelectedNodeIds,
  setSelectedLinkId,
  isPlayback,
  currentFrame,
  onNodesUpdated,
  onAddNode,
  onAddLink,
  onDeleteSelected,
  canLink,
  hasSelection
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nodeInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const drawArrowHead = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string) => {
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

    return { x: cx + dx * scale, y: cy + dy * scale };
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
      points = [startPort, { x: midX, y: startPort.y }, { x: midX, y: endPort.y }, endPort];
    } else {
      const midY = (srcCenter.y + tgtCenter.y) / 2;
      startPort = getContainerPort(source, { x: srcCenter.x, y: midY });
      endPort = getContainerPort(target, { x: tgtCenter.x, y: midY });
      points = [startPort, { x: startPort.x, y: midY }, { x: endPort.x, y: midY }, endPort];
    }

    return { points, startPort, endPort };
  };

useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const render = () => {
      // 1. Recalculate canvas buffer dimensions from parent container instantly
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // 2. Draw background grid
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

      // 3. Draw Links
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
          drawArrowHead(ctx, p0.x + Math.cos(angle0) * dist, p0.y + Math.sin(angle0) * dist, angle0, linkColor);
        }

        const endArrowOffset = 16;
        const pEndPrev = points[points.length - 2];
        const pEnd = points[points.length - 1];
        const angleEnd = Math.atan2(pEnd.y - pEndPrev.y, pEnd.x - pEndPrev.x);
        const segEndLen = Math.hypot(pEnd.x - pEndPrev.x, pEnd.y - pEndPrev.y);
        if (segEndLen > 5) {
          const dist = Math.min(endArrowOffset, segEndLen / 2);
          drawArrowHead(ctx, pEnd.x - Math.cos(angleEnd) * dist, pEnd.y - Math.sin(angleEnd) * dist, angleEnd, linkColor);
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

      // 4. Draw Nodes
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
        ctx.fillText(`Mat: ${node.materialType}`, node.x + 10, node.y + 38);
        ctx.fillText(`Vol: ${Math.round(liveVol).toLocaleString()} m³`, node.x + 10, node.y + 50);
      });
    };

    render();

    // ResizeObserver watches parent container dimensions (e.g. graph drawer toggle)
    const resizeObserver = new ResizeObserver(() => {
      render();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
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
        if (distToSegment({ x: mouseX, y: mouseY }, points[i], points[i + 1]) < 8) return true;
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

    onNodesUpdated();
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
      {!isPlayback && (
        <div style={{ position: 'absolute', top: '16px', right: '20px', display: 'flex', gap: '8px', zIndex: 20, backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
          <button onClick={onAddNode} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Add Node
          </button>
          <button
            onClick={onAddLink}
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
            onClick={onDeleteSelected}
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
  );
};