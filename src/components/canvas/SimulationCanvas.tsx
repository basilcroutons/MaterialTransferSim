import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ContainerNode, TransferLink, SimFrame, FlowStatus, GRAPH_LINE_COLORS } from '../../models/types';
import { CanvasViewModel } from '../../viewmodel/CanvasViewModel';

interface Point { x: number; y: number; }

export const getFlowColor = (status: FlowStatus = 'frozen'): string => {
  switch (status) {
    case 'full':
      return '#22c55e'; // Green: flowing at full rate
    case 'restricted':
      return '#f59e0b'; // Amber: flowing at restricted rate
    case 'blocked':
      return '#ef4444'; // Red: blocked from sending/receiving due to capacity issues
    case 'starved':
    case 'frozen':
    default:
      return '#38bdf8'; // Blue: day 0 (frozen) + any time a container cannot deliver due to lack of material
  }
};

interface SimulationCanvasProps {
  vm: CanvasViewModel;
  nodes: ContainerNode[];
  links: TransferLink[];
  selectedNodeIds: string[];
  selectedLinkId: string | null;
  setSelectedNodeIds: (ids: string[]) => void;
  setSelectedLinkId: (id: string | null) => void;
  isPlayback: boolean;
  highlightedNodeIds?: string[];
  setHighlightedNodeIds?: (ids: string[]) => void;
  currentFrame: SimFrame;
  onNodesUpdated: () => void;
  onAddNode: () => void;
  onAddLink: () => void;
  onDeleteSelected: () => void;
  canLink: boolean;
  hasSelection: boolean;
  isGraphExpanded?: boolean;
}

// Multi-tier dynamic grid configuration: 1 major gridline for every 4 minor gridlines
const getAdaptiveGrid = (z: number) => {
  if (z >= 1.8) {
    return { minorStep: 10, majorStep: 40, snap: 5 }; // 40 = 4 * 10
  } else if (z >= 0.75) {
    return { minorStep: 20, majorStep: 80, snap: 20 }; // 80 = 4 * 20
  } else if (z >= 0.4) {
    return { minorStep: 40, majorStep: 160, snap: 40 }; // 160 = 4 * 40
  } else {
    return { minorStep: 80, majorStep: 320, snap: 80 }; // 320 = 4 * 80
  }
};

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  vm,
  nodes,
  links,
  selectedNodeIds,
  selectedLinkId,
  setSelectedNodeIds,
  setSelectedLinkId,
  isPlayback,
  highlightedNodeIds = [],
  setHighlightedNodeIds,
  currentFrame,
  onNodesUpdated,
  onAddNode,
  onAddLink,
  onDeleteSelected,
  canLink,
  hasSelection
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera Viewport State: Pan (offset in screen pixels) and Zoom (scale factor)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Refs for current transformation during continuous mouse/wheel events
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomRef = useRef<number>(1.0);
  panRef.current = pan;
  zoomRef.current = zoom;

  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // In world coordinates
  const nodeInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Coordinate Conversion Helpers
  const screenToWorld = useCallback((screenX: number, screenY: number, p = panRef.current, z = zoomRef.current): Point => {
    return {
      x: (screenX - p.x) / z,
      y: (screenY - p.y) / z
    };
  }, []);

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

  const distToSegment = (p: Point, v: Point, w: Point): number => {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  };

  // Cardinal port directions and options on 120x80 container cards
  type CardinalDirection = 'N' | 'S' | 'E' | 'W';

  interface PortOption {
    point: Point;
    dir: CardinalDirection;
  }

  const getCardinalPorts = (node: ContainerNode): PortOption[] => {
    const w = 120;
    const h = 80;
    return [
      { point: { x: node.x + w / 2, y: node.y }, dir: 'N' },
      { point: { x: node.x + w / 2, y: node.y + h }, dir: 'S' },
      { point: { x: node.x + w, y: node.y + h / 2 }, dir: 'E' },
      { point: { x: node.x, y: node.y + h / 2 }, dir: 'W' }
    ];
  };

  const isPointInsideNode = (pt: Point, node: ContainerNode, margin = 4): boolean => {
    return (
      pt.x > node.x + margin &&
      pt.x < node.x + 120 - margin &&
      pt.y > node.y + margin &&
      pt.y < node.y + 80 - margin
    );
  };

  const simplifyCollinear = (pts: Point[]): Point[] => {
    if (pts.length <= 2) return pts;
    const result: Point[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = pts[i];
      const next = pts[i + 1];

      const isH = Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
      const isV = Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;

      if (!isH && !isV) {
        result.push(curr);
      }
    }
    result.push(pts[pts.length - 1]);
    return result;
  };

  // Fallback intersection helper to find boundary port point on card border
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

  interface ComputedRoute {
    linkId: string;
    source: ContainerNode;
    target: ContainerNode;
    points: Point[];
    startPort: Point;
    endPort: Point;
    badgePt: Point;
  }

  // Helper to determine best cardinal faces for a link between source and target
  const selectBestCardinalFaces = (
    source: ContainerNode,
    target: ContainerNode
  ): { sDir: CardinalDirection; tDir: CardinalDirection } => {
    const srcPorts = getCardinalPorts(source);
    const tgtPorts = getCardinalPorts(target);

    const srcCenter = { x: source.x + 60, y: source.y + 40 };
    const tgtCenter = { x: target.x + 60, y: target.y + 40 };
    const dx = Math.abs(tgtCenter.x - srcCenter.x);
    const dy = Math.abs(tgtCenter.y - srcCenter.y);

    let bestScore = -Infinity;
    let bestFaces: { sDir: CardinalDirection; tDir: CardinalDirection } = {
      sDir: (dx >= dy ? (tgtCenter.x >= srcCenter.x ? 'E' : 'W') : (tgtCenter.y >= srcCenter.y ? 'S' : 'N')) as CardinalDirection,
      tDir: (dx >= dy ? (tgtCenter.x >= srcCenter.x ? 'W' : 'E') : (tgtCenter.y >= srcCenter.y ? 'N' : 'S')) as CardinalDirection
    };

    srcPorts.forEach(s => {
      tgtPorts.forEach(t => {
        const sValid =
          (s.dir === 'E' && t.point.x > s.point.x + 6) ||
          (s.dir === 'W' && t.point.x < s.point.x - 6) ||
          (s.dir === 'S' && t.point.y > s.point.y + 6) ||
          (s.dir === 'N' && t.point.y < s.point.y - 6);

        const tValid =
          (t.dir === 'W' && s.point.x < t.point.x - 6) ||
          (t.dir === 'E' && s.point.x > t.point.x + 6) ||
          (t.dir === 'N' && s.point.y < t.point.y - 6) ||
          (t.dir === 'S' && s.point.y > t.point.y + 6);

        if (!sValid || !tValid) return;

        const sIsVert = s.dir === 'N' || s.dir === 'S';
        const tIsVert = t.dir === 'N' || t.dir === 'S';

        let score = 0;
        if (sIsVert !== tIsVert) {
          const bend: Point = sIsVert
            ? { x: s.point.x, y: t.point.y }
            : { x: t.point.x, y: s.point.y };

          if (!isPointInsideNode(bend, source) && !isPointInsideNode(bend, target)) {
            const primaryMatch = sIsVert ? dy >= dx : dx >= dy;
            const manhattanDist =
              Math.abs(bend.x - s.point.x) +
              Math.abs(bend.y - s.point.y) +
              Math.abs(t.point.x - bend.x) +
              Math.abs(t.point.y - bend.y);
            score = 200 + (primaryMatch ? 30 : 0) - manhattanDist * 0.05;
          }
        } else if (!sIsVert && !tIsVert) {
          if ((s.dir === 'E' && s.point.x < t.point.x) || (s.dir === 'W' && s.point.x > t.point.x)) {
            const manhattanDist = Math.abs(t.point.x - s.point.x) + Math.abs(t.point.y - s.point.y);
            score = 100 + (dx >= dy ? 20 : 0) - manhattanDist * 0.05;
          }
        } else {
          if ((s.dir === 'S' && s.point.y < t.point.y) || (s.dir === 'N' && s.point.y > t.point.y)) {
            const manhattanDist = Math.abs(t.point.x - s.point.x) + Math.abs(t.point.y - s.point.y);
            score = 100 + (dy >= dx ? 20 : 0) - manhattanDist * 0.05;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestFaces = { sDir: s.dir, tDir: t.dir };
        }
      });
    });

    return bestFaces;
  };

  // Helper to get offset port position along container card border
  const getPortWithLaneOffset = (node: ContainerNode, dir: CardinalDirection, offset: number): Point => {
    const w = 120;
    const h = 80;
    if (dir === 'N') {
      return { x: Math.max(node.x + 16, Math.min(node.x + w - 16, node.x + w / 2 + offset)), y: node.y };
    } else if (dir === 'S') {
      return { x: Math.max(node.x + 16, Math.min(node.x + w - 16, node.x + w / 2 + offset)), y: node.y + h };
    } else if (dir === 'E') {
      return { x: node.x + w, y: Math.max(node.y + 16, Math.min(node.y + h - 16, node.y + h / 2 + offset)) };
    } else {
      return { x: node.x, y: Math.max(node.y + 16, Math.min(node.y + h - 16, node.y + h / 2 + offset)) };
    }
  };

  // Helper to check if a segment shares a parallel corridor with any other route (within 24px clearance)
  const isSegmentSharedInCorridor = (
    segA: { p1: Point; p2: Point },
    currentLinkId: string,
    allRoutes: { linkId: string; points: Point[] }[]
  ): boolean => {
    const isVertA = Math.abs(segA.p1.x - segA.p2.x) < 0.5;
    const isHorizA = Math.abs(segA.p1.y - segA.p2.y) < 0.5;
    const lenA = Math.hypot(segA.p2.x - segA.p1.x, segA.p2.y - segA.p1.y);
    if (lenA < 5) return false;

    for (const other of allRoutes) {
      if (other.linkId === currentLinkId) continue;
      for (let j = 0; j < other.points.length - 1; j++) {
        const segB = { p1: other.points[j], p2: other.points[j + 1] };
        const isVertB = Math.abs(segB.p1.x - segB.p2.x) < 0.5;
        const isHorizB = Math.abs(segB.p1.y - segB.p2.y) < 0.5;

        if (isVertA && isVertB) {
          const dx = Math.abs(segA.p1.x - segB.p1.x);
          if (dx <= 24) {
            const minY1 = Math.min(segA.p1.y, segA.p2.y);
            const maxY1 = Math.max(segA.p1.y, segA.p2.y);
            const minY2 = Math.min(segB.p1.y, segB.p2.y);
            const maxY2 = Math.max(segB.p1.y, segB.p2.y);
            const overlap = Math.min(maxY1, maxY2) - Math.max(minY1, minY2);
            if (overlap >= 25) return true;
          }
        } else if (isHorizA && isHorizB) {
          const dy = Math.abs(segA.p1.y - segB.p1.y);
          if (dy <= 24) {
            const minX1 = Math.min(segA.p1.x, segA.p2.x);
            const maxX1 = Math.max(segA.p1.x, segA.p2.x);
            const minX2 = Math.min(segB.p1.x, segB.p2.x);
            const maxX2 = Math.max(segB.p1.x, segB.p2.x);
            const overlap = Math.min(maxX1, maxX2) - Math.max(minX1, minX2);
            if (overlap >= 25) return true;
          }
        }
      }
    }
    return false;
  };

  // Comprehensive batch route and badge calculator
  const computeAllLinkRoutes = (nodesList: ContainerNode[], linksList: TransferLink[]): Map<string, ComputedRoute> => {
    const resultMap = new Map<string, ComputedRoute>();

    interface LinkWithFaces {
      link: TransferLink;
      source: ContainerNode;
      target: ContainerNode;
      sDir: CardinalDirection;
      tDir: CardinalDirection;
    }

    const validLinks: LinkWithFaces[] = [];
    linksList.forEach(link => {
      const source = nodesList.find(n => n.id === link.sourceId);
      const target = nodesList.find(n => n.id === link.targetId);
      if (!source || !target) return;
      const { sDir, tDir } = selectBestCardinalFaces(source, target);
      validLinks.push({ link, source, target, sDir, tDir });
    });

    // 1. Calculate departure lane offsets for links sharing the same source face
    const srcLaneOffsets = new Map<string, number>();
    const srcGroups = new Map<string, LinkWithFaces[]>();
    validLinks.forEach(item => {
      const key = `${item.source.id}_${item.sDir}`;
      if (!srcGroups.has(key)) srcGroups.set(key, []);
      srcGroups.get(key)!.push(item);
    });

    srcGroups.forEach(group => {
      if (group.length === 1) {
        srcLaneOffsets.set(group[0].link.id, 0);
        return;
      }
      const sDir = group[0].sDir;
      // Sort links by destination location to avoid crossing lines
      if (sDir === 'N' || sDir === 'S') {
        group.sort((a, b) => (a.target.x + 60) - (b.target.x + 60) || (a.target.y - b.target.y));
      } else {
        group.sort((a, b) => (a.target.y + 40) - (b.target.y + 40) || (a.target.x - b.target.x));
      }
      group.forEach((item, idx) => {
        // 12px lane separation
        const offset = (idx - (group.length - 1) / 2) * 12;
        srcLaneOffsets.set(item.link.id, offset);
      });
    });

    // 2. Calculate arrival lane offsets for links sharing the same target face
    const tgtLaneOffsets = new Map<string, number>();
    const tgtGroups = new Map<string, LinkWithFaces[]>();
    validLinks.forEach(item => {
      const key = `${item.target.id}_${item.tDir}`;
      if (!tgtGroups.has(key)) tgtGroups.set(key, []);
      tgtGroups.get(key)!.push(item);
    });

    tgtGroups.forEach(group => {
      if (group.length === 1) {
        tgtLaneOffsets.set(group[0].link.id, 0);
        return;
      }
      const tDir = group[0].tDir;
      if (tDir === 'N' || tDir === 'S') {
        group.sort((a, b) => (a.source.x + 60) - (b.source.x + 60) || (a.source.y - b.source.y));
      } else {
        group.sort((a, b) => (a.source.y + 40) - (b.source.y + 40) || (a.source.x - b.source.x));
      }
      group.forEach((item, idx) => {
        const offset = (idx - (group.length - 1) / 2) * 12;
        tgtLaneOffsets.set(item.link.id, offset);
      });
    });

    // 3. Generate initial right-angle points for each link
    interface TempRoute {
      link: TransferLink;
      source: ContainerNode;
      target: ContainerNode;
      points: Point[];
      startPort: Point;
      endPort: Point;
    }

    const tempRoutes: TempRoute[] = [];
    validLinks.forEach(item => {
      const srcOffset = srcLaneOffsets.get(item.link.id) || 0;
      const tgtOffset = tgtLaneOffsets.get(item.link.id) || 0;
      const startPort = getPortWithLaneOffset(item.source, item.sDir, srcOffset);
      const endPort = getPortWithLaneOffset(item.target, item.tDir, tgtOffset);

      const sIsVert = item.sDir === 'N' || item.sDir === 'S';
      const tIsVert = item.tDir === 'N' || item.tDir === 'S';

      let rawPoints: Point[] = [];
      if (sIsVert !== tIsVert) {
        const bend = sIsVert
          ? { x: startPort.x, y: endPort.y }
          : { x: endPort.x, y: startPort.y };
        rawPoints = [startPort, bend, endPort];
      } else if (!sIsVert && !tIsVert) {
        const midX = (startPort.x + endPort.x) / 2;
        rawPoints = [startPort, { x: midX, y: startPort.y }, { x: midX, y: endPort.y }, endPort];
      } else {
        const midY = (startPort.y + endPort.y) / 2;
        rawPoints = [startPort, { x: startPort.x, y: midY }, { x: endPort.x, y: midY }, endPort];
      }

      const points = simplifyCollinear(rawPoints);
      tempRoutes.push({
        link: item.link,
        source: item.source,
        target: item.target,
        points,
        startPort,
        endPort
      });
    });

    // 4. Calculate badge positions for each link away from shared corridors
    const allRouteSummaries = tempRoutes.map(r => ({ linkId: r.link.id, points: r.points }));

    tempRoutes.forEach((route, linkIdx) => {
      const points = route.points;
      let badgePt: Point;

      if (points.length <= 1) {
        badgePt = points[0] || { x: 0, y: 0 };
      } else if (points.length === 2) {
        badgePt = {
          x: (points[0].x + points[1].x) / 2,
          y: (points[0].y + points[1].y) / 2
        };
      } else {
        interface SegCandidate {
          index: number;
          p1: Point;
          p2: Point;
          length: number;
          isShared: boolean;
        }

        const segments: SegCandidate[] = [];
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const length = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const isShared = isSegmentSharedInCorridor({ p1, p2 }, route.link.id, allRouteSummaries);
          segments.push({ index: i, p1, p2, length, isShared });
        }

        // Primary user choice: Midpoint of the unshared branch segment entering the destination container
        const destSeg = segments[segments.length - 1];
        if (!destSeg.isShared && destSeg.length >= 35) {
          badgePt = {
            x: (destSeg.p1.x + destSeg.p2.x) / 2,
            y: (destSeg.p1.y + destSeg.p2.y) / 2
          };
        } else {
          // Secondary fallback: Longest unshared segment of the route
          const unshared = segments
            .filter(s => !s.isShared && s.length >= 35)
            .sort((a, b) => b.length - a.length)[0];

          if (unshared) {
            badgePt = {
              x: (unshared.p1.x + unshared.p2.x) / 2,
              y: (unshared.p1.y + unshared.p2.y) / 2
            };
          } else {
            // Tertiary fallback: If all segments share corridors, pick longest segment with staggered ratio
            const longest = segments.slice().sort((a, b) => b.length - a.length)[0];
            if (longest) {
              const t = linkIdx % 2 === 0 ? 0.35 : 0.65;
              badgePt = {
                x: longest.p1.x + (longest.p2.x - longest.p1.x) * t,
                y: longest.p1.y + (longest.p2.y - longest.p1.y) * t
              };
            } else {
              badgePt = { x: points[0].x, y: points[0].y };
            }
          }
        }
      }

      resultMap.set(route.link.id, {
        linkId: route.link.id,
        source: route.source,
        target: route.target,
        points: route.points,
        startPort: route.startPort,
        endPort: route.endPort,
        badgePt
      });
    });

    return resultMap;
  };

  // 1. Mousewheel Zoom Event Handler (attached natively with passive: false to prevent document scroll)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      // Exponential zoom curve for consistent smooth sensitivity
      const zoomFactor = Math.pow(1.0015, -e.deltaY);
      const newZoom = Math.min(3.0, Math.max(0.25, currentZoom * zoomFactor));

      if (newZoom === currentZoom) return;

      // Invariant: the world coordinate under the cursor remains at (mouseX, mouseY)
      const worldX = (mouseX - currentPan.x) / currentZoom;
      const worldY = (mouseY - currentPan.y) / currentZoom;

      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 2. Global Keyboard Listener for Spacebar Pan Affordance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 3. Global Window Listeners for Active Panning & Node Dragging (prevents cursor sticking when moving fast)
  useEffect(() => {
    if (!isPanning && !isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panOriginRef.current.x + dx,
          y: panOriginRef.current.y + dy
        });
      } else if (isDragging) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentZ = zoomRef.current;
        const currentP = panRef.current;
        const worldX = (mouseX - currentP.x) / currentZ;
        const worldY = (mouseY - currentP.y) / currentZ;

        const dWorldX = worldX - dragStartRef.current.x;
        const dWorldY = worldY - dragStartRef.current.y;

        const snap = getAdaptiveGrid(currentZ).snap;

        // Container side-snapping configuration (hardcoded defaults, ready for Settings integration)
        const CONTAINER_SNAP_RANGE = 24; // Snap distance threshold in world pixels
        const CONTAINER_GAP_MARGIN = 12; // Gap margin between facing sides in world pixels
        const CARD_W = 120;
        const CARD_H = 80;

        const otherNodes = nodes.filter(n => !selectedNodeIds.includes(n.id));

        let bestDeltaX: number | null = null;
        let minDiffX = CONTAINER_SNAP_RANGE + 1;

        let bestDeltaY: number | null = null;
        let minDiffY = CONTAINER_SNAP_RANGE + 1;

        // Check each dragged node against stationary nodes for snapping opportunities
        for (const n of nodes) {
          if (!selectedNodeIds.includes(n.id)) continue;
          const initial = nodeInitialPositionsRef.current.get(n.id);
          if (!initial) continue;

          const rawX = initial.x + dWorldX;
          const rawY = initial.y + dWorldY;

          for (const other of otherNodes) {
            // Check Y-axis snap candidates (top/bottom edges)
            // Relevant when horizontally overlapping or close
            const horizontalOverlap =
              rawX + CARD_W >= other.x - CONTAINER_SNAP_RANGE &&
              rawX <= other.x + CARD_W + CONTAINER_SNAP_RANGE;
            const horizontalNear =
              rawX + CARD_W >= other.x - CARD_W - CONTAINER_GAP_MARGIN - CONTAINER_SNAP_RANGE &&
              rawX <= other.x + CARD_W + CARD_W + CONTAINER_GAP_MARGIN + CONTAINER_SNAP_RANGE;

            if (horizontalOverlap) {
              // 1. Moving DOWN towards other: top of other with 12px gap margin
              const targetYTop = other.y - CARD_H - CONTAINER_GAP_MARGIN;
              const diffYTop = Math.abs(rawY - targetYTop);
              if (diffYTop <= CONTAINER_SNAP_RANGE && diffYTop < minDiffY) {
                minDiffY = diffYTop;
                bestDeltaY = targetYTop - initial.y;
              }

              // 2. Moving UP towards other: bottom of other with 12px gap margin
              const targetYBottom = other.y + CARD_H + CONTAINER_GAP_MARGIN;
              const diffYBottom = Math.abs(rawY - targetYBottom);
              if (diffYBottom <= CONTAINER_SNAP_RANGE && diffYBottom < minDiffY) {
                minDiffY = diffYBottom;
                bestDeltaY = targetYBottom - initial.y;
              }
            }

            if (horizontalNear) {
              // 3. Side-by-side alignment: top-to-top (and bottom-to-bottom) flush alignment
              const targetYAlign = other.y;
              const diffYAlign = Math.abs(rawY - targetYAlign);
              if (diffYAlign <= CONTAINER_SNAP_RANGE && diffYAlign < minDiffY) {
                minDiffY = diffYAlign;
                bestDeltaY = targetYAlign - initial.y;
              }
            }

            // Check X-axis snap candidates (left/right edges)
            // Relevant when vertically overlapping or close
            const verticalOverlap =
              rawY + CARD_H >= other.y - CONTAINER_SNAP_RANGE &&
              rawY <= other.y + CARD_H + CONTAINER_SNAP_RANGE;
            const verticalNear =
              rawY + CARD_H >= other.y - CARD_H - CONTAINER_GAP_MARGIN - CONTAINER_SNAP_RANGE &&
              rawY <= other.y + CARD_H + CARD_H + CONTAINER_GAP_MARGIN + CONTAINER_SNAP_RANGE;

            if (verticalOverlap) {
              // 1. Moving RIGHT towards other: left of other with 12px gap margin
              const targetXLeft = other.x - CARD_W - CONTAINER_GAP_MARGIN;
              const diffXLeft = Math.abs(rawX - targetXLeft);
              if (diffXLeft <= CONTAINER_SNAP_RANGE && diffXLeft < minDiffX) {
                minDiffX = diffXLeft;
                bestDeltaX = targetXLeft - initial.x;
              }

              // 2. Moving LEFT towards other: right of other with 12px gap margin
              const targetXRight = other.x + CARD_W + CONTAINER_GAP_MARGIN;
              const diffXRight = Math.abs(rawX - targetXRight);
              if (diffXRight <= CONTAINER_SNAP_RANGE && diffXRight < minDiffX) {
                minDiffX = diffXRight;
                bestDeltaX = targetXRight - initial.x;
              }
            }

            if (verticalNear) {
              // 3. Stacked alignment: left-to-left (and right-to-right) flush alignment
              const targetXAlign = other.x;
              const diffXAlign = Math.abs(rawX - targetXAlign);
              if (diffXAlign <= CONTAINER_SNAP_RANGE && diffXAlign < minDiffX) {
                minDiffX = diffXAlign;
                bestDeltaX = targetXAlign - initial.x;
              }
            }
          }
        }

        // Apply container side-snapping if in range, otherwise fall back to adaptive grid snapping
        const finalDeltaX = bestDeltaX !== null ? bestDeltaX : Math.round(dWorldX / snap) * snap;
        const finalDeltaY = bestDeltaY !== null ? bestDeltaY : Math.round(dWorldY / snap) * snap;

        nodes.forEach(n => {
          if (selectedNodeIds.includes(n.id)) {
            const initial = nodeInitialPositionsRef.current.get(n.id);
            if (initial) {
              vm.updateNodePosition(n.id, initial.x + finalDeltaX, initial.y + finalDeltaY);
            }
          }
        });
        onNodesUpdated();
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (isPanning && (e.button === 1 || e.button === 0)) {
        setIsPanning(false);
      }
      if (isDragging && e.button === 0) {
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isPanning, isDragging, selectedNodeIds, nodes, onNodesUpdated, vm]);

  // 4. Main Canvas Render Pipeline with Proportional Viewport Transform & Dynamic Grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const render = () => {
      // Recalculate canvas buffer dimensions from parent container instantly
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // 1. Clear background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Compute visible world coordinate bounds
      const minWorldX = -pan.x / zoom;
      const maxWorldX = (canvas.width - pan.x) / zoom;
      const minWorldY = -pan.y / zoom;
      const maxWorldY = (canvas.height - pan.y) / zoom;

      const gridConfig = getAdaptiveGrid(zoom);

      // 2. Apply Camera Viewport Matrix: all nodes, links, badges, texts & grid scale proportionately
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Minor Dynamic Grid Lines (constant screen-space thickness, does not scale with zoom)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1 / zoom;
      const startX = Math.floor(minWorldX / gridConfig.minorStep) * gridConfig.minorStep;
      const endX = Math.ceil(maxWorldX / gridConfig.minorStep) * gridConfig.minorStep;
      const startY = Math.floor(minWorldY / gridConfig.minorStep) * gridConfig.minorStep;
      const endY = Math.ceil(maxWorldY / gridConfig.minorStep) * gridConfig.minorStep;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridConfig.minorStep) {
        if (x % gridConfig.majorStep !== 0) {
          ctx.moveTo(x, minWorldY);
          ctx.lineTo(x, maxWorldY);
        }
      }
      for (let y = startY; y <= endY; y += gridConfig.minorStep) {
        if (y % gridConfig.majorStep !== 0) {
          ctx.moveTo(minWorldX, y);
          ctx.lineTo(maxWorldX, y);
        }
      }
      ctx.stroke();

      // Major Dynamic Grid Lines (1 major for every 4 minor grids; constant 1.2px screen thickness)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.2 / zoom;
      ctx.beginPath();
      const majorStartX = Math.floor(minWorldX / gridConfig.majorStep) * gridConfig.majorStep;
      const majorEndX = Math.ceil(maxWorldX / gridConfig.majorStep) * gridConfig.majorStep;
      const majorStartY = Math.floor(minWorldY / gridConfig.majorStep) * gridConfig.majorStep;
      const majorEndY = Math.ceil(maxWorldY / gridConfig.majorStep) * gridConfig.majorStep;

      for (let x = majorStartX; x <= majorEndX; x += gridConfig.majorStep) {
        ctx.moveTo(x, minWorldY);
        ctx.lineTo(x, maxWorldY);
      }
      for (let y = majorStartY; y <= majorEndY; y += gridConfig.majorStep) {
        ctx.moveTo(minWorldX, y);
        ctx.lineTo(maxWorldX, y);
      }
      ctx.stroke();

      // Subtle Origin Crosshair at (0, 0) (constant screen size and thickness)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.moveTo(-12 / zoom, 0); ctx.lineTo(12 / zoom, 0);
      ctx.moveTo(0, -12 / zoom); ctx.lineTo(0, 12 / zoom);
      ctx.stroke();

      // 3. Draw Links & Flow Animation Badges
      const computedRoutes = computeAllLinkRoutes(nodes, links);

      links.forEach(link => {
        const route = computedRoutes.get(link.id);
        if (!route || route.points.length < 2) return;

        const points = route.points;
        const isSelected = selectedLinkId === link.id;
        const linkFlow = isPlayback ? (currentFrame?.linkFlows[link.id] ?? 0) : link.dailyRate;
        const linkStatus: FlowStatus = isPlayback ? (currentFrame?.linkStatuses?.[link.id] ?? 'frozen') : 'frozen';

        const linkColor = isPlayback ? getFlowColor(linkStatus) : (isSelected ? '#38bdf8' : '#64748b');
        ctx.strokeStyle = linkColor;
        ctx.lineWidth = isSelected ? (isPlayback ? 5 : 4) : (isPlayback ? 3.5 : 2.5);
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        const startArrowOffset = 36;
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

        // Draw Rate Badge at computed unshared branch position
        const badgePt = route.badgePt;

        const displayRateText = (linkFlow / 1000).toFixed(2);
        const badgeW = 50;
        const badgeH = 20;
        ctx.fillStyle = isSelected ? '#0369a1' : '#0f172a';
        ctx.fillRect(badgePt.x - badgeW / 2, badgePt.y - badgeH / 2, badgeW, badgeH);
        ctx.strokeStyle = linkColor;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.strokeRect(badgePt.x - badgeW / 2, badgePt.y - badgeH / 2, badgeW, badgeH);

        ctx.fillStyle = isPlayback ? linkColor : '#f8fafc';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayRateText, badgePt.x, badgePt.y + 1.5);
      });

      // 4. Draw Container Nodes
      nodes.forEach((node, nodeIdx) => {
        const isSelected = selectedNodeIds.includes(node.id);
        const isHighlighted = isPlayback && highlightedNodeIds.includes(node.id);
        const liveVol = isPlayback && currentFrame ? (currentFrame.nodeVolumes[node.id] ?? node.currentVolume) : node.currentVolume;
        const nodeStatus: FlowStatus = isPlayback ? (currentFrame?.nodeStatuses?.[node.id] ?? 'frozen') : 'frozen';
        const nodeBorderColor = isPlayback 
          ? getFlowColor(nodeStatus)
          : (isSelected ? '#38bdf8' : '#334155');

        // Standard 120x80 Container Card
        const width = 120;
        const height = 80;
        const fillPct = Math.min(1, Math.max(0, liveVol / node.capacity));
        const isOverfilled = liveVol > node.capacity;

        if (isSelected) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.strokeRect(node.x - 4, node.y - 4, width + 8, height + 8);
        }

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(node.x, node.y, width, height);

        // When highlighted in playback: vibrant, wide halo outside of the container box
        if (isHighlighted) {
          const graphColor = GRAPH_LINE_COLORS[nodeIdx % GRAPH_LINE_COLORS.length];
          ctx.save();
          ctx.strokeStyle = graphColor;
          ctx.lineWidth = 10;
          ctx.globalAlpha = 0.52;
          ctx.strokeRect(node.x - 5, node.y - 5, width + 10, height + 10);
          ctx.restore();
        }

        // Inner sim-engine colored border (always solid, crisp and unaffected)
        ctx.strokeStyle = nodeBorderColor;
        ctx.lineWidth = isPlayback ? 3 : 2;
        ctx.strokeRect(node.x, node.y, width, height);

        ctx.fillStyle = isOverfilled ? '#ef4444' : (node.type === 'excavation' ? '#0d9488' : node.type === 'stockpile' ? '#b45309' : '#475569');
        ctx.fillRect(node.x + 8, node.y + 55, (width - 16) * Math.min(1, fillPct), 12);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(node.x + 8, node.y + 55, width - 16, 12);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(node.name, node.x + 10, node.y + 22);

        ctx.fillStyle = isOverfilled ? '#fca5a5' : '#94a3b8';
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillText(`Mat: ${node.materialType}`, node.x + 10, node.y + 38);
        ctx.fillText(`Vol: ${Math.round(liveVol).toLocaleString()} m³`, node.x + 10, node.y + 50);

        // Draw corner rule badge
        const badgeX = node.x + width;
        const badgeY = node.y;
        ctx.save();
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;

        if (node.overflowMode === 'overfill') {
          const size = 12;
          ctx.beginPath();
          ctx.rect(badgeX - size / 2, badgeY - size / 2, size, size);
          ctx.fill();
          ctx.stroke();
        } else if (node.strictSubRule === 'headroom_hold') {
          const r = 7;
          ctx.beginPath();
          ctx.moveTo(badgeX, badgeY - r);
          ctx.lineTo(badgeX + r, badgeY);
          ctx.lineTo(badgeX, badgeY + r);
          ctx.lineTo(badgeX - r, badgeY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          const r = 6.5;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      });

      ctx.restore();
    };

    render();

    const resizeObserver = new ResizeObserver(() => {
      render();
    });
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [nodes, links, selectedNodeIds, selectedLinkId, isPlayback, highlightedNodeIds, currentFrame, pan, zoom]);

  // 5. Canvas Mouse Down Handler: Distinguishes Middle Mouse Pan, Space Pan, Node Drag, and Link Selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const isMiddleClick = e.button === 1;
    const isSpacePan = e.button === 0 && isSpacePressed;

    // Viewport Panning Activation (Middle Click or Space + Left Click)
    if (isMiddleClick || isSpacePan) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panOriginRef.current = { ...panRef.current };
      return;
    }

    if (e.button !== 0) return; // Only proceed with left-clicks for selection/drag

    if (isPlayback) {
      // In playback mode containers cannot be selected.
      // Left-clicking empty space clears graph line highlights if Ctrl is not pressed
      if (!e.ctrlKey && !e.metaKey && setHighlightedNodeIds) {
        setHighlightedNodeIds([]);
      }
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldMouse = screenToWorld(mouseX, mouseY);

    // 1. Hit-test nodes
    const clickedNode = nodes.slice().reverse().find(n => 
      worldMouse.x >= n.x && worldMouse.x <= n.x + 120 && worldMouse.y >= n.y && worldMouse.y <= n.y + 80
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
      dragStartRef.current = { x: worldMouse.x, y: worldMouse.y };
      const initialMap = new Map<string, { x: number; y: number }>();
      nodes.forEach(n => initialMap.set(n.id, { x: n.x, y: n.y }));
      nodeInitialPositionsRef.current = initialMap;
      return;
    }

    // 2. Hit-test links & rate badges
    const hitTolerance = Math.max(6, 10 / zoomRef.current);
    const computedRoutes = computeAllLinkRoutes(nodes, links);
    const clickedLink = links.slice().reverse().find(link => {
      const route = computedRoutes.get(link.id);
      if (!route || route.points.length < 2) return false;

      const badgePt = route.badgePt;
      const badgeW = 50;
      const badgeH = 20;
      if (worldMouse.x >= badgePt.x - badgeW / 2 && worldMouse.x <= badgePt.x + badgeW / 2 && worldMouse.y >= badgePt.y - badgeH / 2 && worldMouse.y <= badgePt.y + badgeH / 2) {
        return true;
      }

      for (let i = 0; i < route.points.length - 1; i++) {
        if (distToSegment(worldMouse, route.points[i], route.points[i + 1]) < hitTolerance) return true;
      }
      return false;
    });

    if (clickedLink) {
      setSelectedLinkId(clickedLink.id);
      setSelectedNodeIds([]);
      return;
    }

    // Clicked empty canvas space
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedNodeIds([]);
      setSelectedLinkId(null);
    }
  };

  // 6. Step Zoom & Reset Handlers for HUD
  const handleStepZoom = (direction: 1 | -1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;

    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;

    const factor = direction > 0 ? 1.25 : 0.8;
    const newZoom = Math.min(3.0, Math.max(0.25, Number((currentZoom * factor).toFixed(2))));

    const worldX = (centerX - currentPan.x) / currentZoom;
    const worldY = (centerY - currentPan.y) / currentZoom;

    const newPanX = centerX - worldX * newZoom;
    const newPanY = centerY - worldY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const getCanvasCursor = () => {
    if (isPanning) return 'grabbing';
    if (isSpacePressed) return 'grab';
    if (isDragging) return 'grabbing';
    return isPlayback ? 'default' : 'default';
  };

  return (
    <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
      {/* Top Action Toolbar */}
      {!isPlayback && (
        <div style={{ position: 'absolute', top: '16px', right: '20px', display: 'flex', gap: '8px', zIndex: 20, backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
          <button
            onClick={onAddNode}
            title={selectedNodeIds.length === 1 ? 'Add new container (copying properties from selected container)' : 'Add new container'}
            style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Add Node
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
            Add Link (2 Selected)
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
            Delete
          </button>
        </div>
      )}

      {/* Floating Zoom HUD Controls in bottom-left */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 20,
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        padding: '4px 8px',
        borderRadius: '8px',
        border: '1px solid #334155',
        backdropFilter: 'blur(4px)',
        fontSize: '11px',
        color: '#94a3b8',
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <button
          type="button"
          onClick={() => handleStepZoom(-1)}
          title="Zoom Out (Mousewheel down)"
          style={{
            background: 'none',
            border: 'none',
            color: '#f8fafc',
            width: '24px',
            height: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}
        >
          −
        </button>
        <button
          type="button"
          onClick={handleResetView}
          title="Current Zoom Level (Click to reset to 100%)"
          style={{
            background: 'none',
            border: 'none',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '11px',
            padding: '2px 6px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => handleStepZoom(1)}
          title="Zoom In (Mousewheel up)"
          style={{
            background: 'none',
            border: 'none',
            color: '#f8fafc',
            width: '24px',
            height: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}
        >
          +
        </button>
        <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Camera to Center (0, 0) and 100% Zoom"
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '11px',
            padding: '2px 6px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Reset
        </button>
      </div>

      {/* Main Interactive Simulation Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: getCanvasCursor()
        }}
      />
    </div>
  );
};