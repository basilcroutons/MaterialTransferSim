import React from 'react';
import { ContainerNode, SimFrame, GRAPH_LINE_COLORS } from '../../models/types';
import { CanvasViewModel } from '../../viewmodel/CanvasViewModel';

interface PlaybackGraphProps {
  nodes: ContainerNode[];
  frames: SimFrame[];
  currentDay: number;
  isGraphExpanded: boolean;
  setIsGraphExpanded: (val: boolean) => void;
  setCurrentDay: (day: number) => void;
  vm: CanvasViewModel;
  highlightedNodeIds?: string[];
  setHighlightedNodeIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export const PlaybackGraph: React.FC<PlaybackGraphProps> = ({
  nodes,
  frames,
  currentDay,
  isGraphExpanded,
  setIsGraphExpanded,
  setCurrentDay,
  vm,
  highlightedNodeIds = [],
  setHighlightedNodeIds,
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setCurrentDay(day);
    vm.setFrameIndex(day);
  };

  const currentFrame = frames[currentDay] || frames[0];
  const totalDays = Math.max(1, frames.length - 1);
  const colors = GRAPH_LINE_COLORS;

  // Dynamic plot container width tracking to perfectly align SVG coordinates with DOM slider thumb
  const plotContainerRef = React.useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = React.useState<number>(800);
  const [hiddenNodeIds, setHiddenNodeIds] = React.useState<Set<string>>(new Set());

  const toggleNodeVisibility = (nodeId: string) => {
    setHiddenNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleLineClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isCtrl = e.ctrlKey || e.metaKey;
    if (!setHighlightedNodeIds) return;

    setHighlightedNodeIds(prev => {
      if (isCtrl) {
        if (prev.includes(nodeId)) {
          return prev.filter(id => id !== nodeId);
        } else {
          return [...prev, nodeId];
        }
      } else {
        if (prev.length === 1 && prev[0] === nodeId) {
          return [];
        }
        return [nodeId];
      }
    });
  };

  React.useLayoutEffect(() => {
    if (!plotContainerRef.current) return;
    const updateWidth = () => {
      if (plotContainerRef.current) {
        const clientW = plotContainerRef.current.clientWidth;
        if (clientW > 0) {
          setPlotWidth(clientW);
        }
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(plotContainerRef.current);
    return () => ro.disconnect();
  }, [isGraphExpanded]);

  // Compute exact X coordinate for currentDay to match slider drag button center (8.5px inset)
  const THUMB_INSET = 8.5;
  const currentX = THUMB_INSET + (totalDays > 0 ? (currentDay / totalDays) * Math.max(0, plotWidth - THUMB_INSET * 2) : 0);

  // Dynamic Volume Grid Scaling Calculation
  // 1. Gather all recorded volumes across all frames and nodes to find actual peak
  const recordedVolumes: number[] = [];
  frames.forEach(frame => {
    nodes.forEach(node => {
      const vol = frame.nodeVolumes?.[node.id];
      if (typeof vol === 'number' && !isNaN(vol)) {
        recordedVolumes.push(vol);
      }
    });
  });
  const maxRecorded = recordedVolumes.length > 0 ? Math.max(...recordedVolumes) : 0;
  const peakVolume = maxRecorded > 0 ? maxRecorded : Math.max(...nodes.map(n => n.currentVolume), 50000);

  // 2. Calibrated rounded step sequence (5k, 10k, 20k, 25k, 50k, etc.)
  const CANDIDATE_STEPS = [
    1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 
    100000, 200000, 250000, 500000, 1000000
  ];

  const safePeak = Math.max(1000, peakVolume);
  let bestStep = CANDIDATE_STEPS[0];
  let bestDiff = Infinity;

  // Pick step that yields around 4 intervals (Math.ceil(safePeak / step) closest to 4)
  for (const step of CANDIDATE_STEPS) {
    const count = Math.ceil(safePeak / step);
    const diff = Math.abs(count - 4);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestStep = step;
    }
  }

  const stepCount = Math.max(2, Math.ceil(safePeak / bestStep));
  const dynamicCeiling = stepCount * bestStep;

  // Generate tick values from 0 up to dynamicCeiling
  const ticks: number[] = [];
  for (let i = 0; i <= stepCount; i++) {
    ticks.push(i * bestStep);
  }

  // Format volume labels with 'k' suffix (e.g. 0k, 10k, 25k, 50k)
  const formatVolumeLabel = (val: number): string => {
    if (val === 0) return '0k';
    const kVal = val / 1000;
    return `${Number(kVal.toFixed(1))}k`;
  };

  if (!isGraphExpanded) {
    return (
      <div
        onClick={() => setIsGraphExpanded(true)}
        style={{
          height: '46px',
          minHeight: '46px',
          backgroundColor: '#1e293b',
          borderTop: '2px solid #38bdf8',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
          boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '0 20px',
          boxSizing: 'border-box',
          flexShrink: 0,
          zIndex: 30,
          cursor: 'pointer',
          userSelect: 'none'
        }}
        title="Click header to expand telemetry graph"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsGraphExpanded(true);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#f8fafc',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1
          }}
          title="Open telemetry graph"
        >
          ▲
        </button>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', minWidth: '60px' }}>Day {currentDay}</span>
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'default' }}
        >
          <input
            type="range"
            min="0"
            max={totalDays}
            value={currentDay}
            onChange={handleSliderChange}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{ flex: 1, accentColor: '#22c55e', cursor: 'pointer', height: '6px' }}
          />
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Day {totalDays}</span>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderTop: '2px solid #38bdf8',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px',
      boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '260px',
      maxHeight: '260px',
      padding: '0 20px 12px 20px',
      boxSizing: 'border-box',
      zIndex: 30
    }}>
      <div
        onClick={() => setIsGraphExpanded(false)}
        style={{
          height: '44px',
          minHeight: '44px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        title="Click header to collapse telemetry graph"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsGraphExpanded(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#f8fafc',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1
            }}
            title="Collapse telemetry graph"
          >
            ▼
          </button>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            CONTAINER VOLUME TELEMETRY
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Active Day: <strong style={{ color: '#f8fafc' }}>Day {currentDay}</strong></span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '16px' }}>
        {/* Left Legend / Series Info */}
        <div style={{ width: '220px', minWidth: '220px', backgroundColor: '#0f172a', borderRadius: '4px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', border: '1px solid #334155', boxSizing: 'border-box' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
            Series Legend & Volumes
          </div>
          {nodes.map((node, idx) => {
            const color = colors[idx % colors.length];
            const liveVol = currentFrame ? Math.round(currentFrame.nodeVolumes[node.id] ?? node.currentVolume) : node.currentVolume;
            const isVisible = !hiddenNodeIds.has(node.id);
            const isHighlighted = highlightedNodeIds.includes(node.id);
            return (
              <div
                key={node.id}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleLineClick(node.id, e);
                  } else {
                    toggleNodeVisibility(node.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  transition: 'background-color 0.15s ease, opacity 0.15s ease',
                  backgroundColor: isHighlighted ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  border: isHighlighted ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isHighlighted) e.currentTarget.style.backgroundColor = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  if (!isHighlighted) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={`Click to toggle ${node.name} on graph, Ctrl+Click to highlight`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: isVisible ? color : '#475569',
                      borderRadius: '2px',
                      flexShrink: 0,
                      boxShadow: isHighlighted ? `0 0 0 2px ${color}` : 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                  />
                  <span
                    style={{
                      color: isVisible ? (isHighlighted ? '#38bdf8' : '#f8fafc') : '#64748b',
                      fontWeight: isHighlighted ? 700 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100px',
                      transition: 'color 0.15s ease'
                    }}
                    title={node.name}
                  >
                    {node.name}
                  </span>
                </div>
                <span
                  style={{
                    color: isVisible ? (isHighlighted ? '#38bdf8' : '#38bdf8') : '#475569',
                    fontWeight: isHighlighted ? 800 : 'bold',
                    fontFamily: 'monospace',
                    transition: 'color 0.15s ease'
                  }}
                >
                  {liveVol.toLocaleString()} m³
                </span>
              </div>
            );
          })}
        </div>

        {/* Right Graph Area: Moved timeline & graph right to fit volume labels, with rounded tracelines */}
        <div style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          backgroundColor: '#0f172a',
          borderRadius: '4px',
          padding: '8px 12px 6px 4px',
          boxSizing: 'border-box',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Top Plot Area with Left Volume Labels Gutter */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', width: '100%', position: 'relative' }}>
            {/* Left Volume Labels Column (48px wide) */}
            <div style={{ width: '48px', minWidth: '48px', maxWidth: '48px', flexShrink: 0, position: 'relative', height: '100%', userSelect: 'none' }}>
              {ticks.map(tickVal => {
                // In SVG: total viewBox height = 160. Plot runs from y = 10 (top ceiling) to y = 150 (baseline 0)
                const yFrac = (dynamicCeiling - tickVal) / dynamicCeiling;
                const svgY = 10 + yFrac * 140;
                const topPct = (svgY / 160) * 100;
                return (
                  <div
                    key={tickVal}
                    style={{
                      position: 'absolute',
                      top: `${topPct}%`,
                      right: '8px',
                      transform: 'translateY(-50%)',
                      fontSize: '10px',
                      color: tickVal === 0 ? '#64748b' : '#94a3b8',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {formatVolumeLabel(tickVal)}
                  </div>
                );
              })}
            </div>

            {/* SVG Plot with Horizontal Tracelines, Polylines, and Synchronized Scrubber Line */}
            <div ref={plotContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative', height: '100%', overflow: 'hidden' }}>
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${plotWidth} 160`}
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
                onClick={() => {
                  if (setHighlightedNodeIds) {
                    setHighlightedNodeIds([]);
                  }
                }}
              >
                {/* Horizontal Tracelines for rounded volume amounts */}
                {ticks.map(tickVal => {
                  const yFrac = (dynamicCeiling - tickVal) / dynamicCeiling;
                  const svgY = 10 + yFrac * 140;
                  return (
                    <line
                      key={tickVal}
                      x1="0"
                      y1={svgY}
                      x2={plotWidth}
                      y2={svgY}
                      stroke={tickVal === 0 ? '#475569' : '#334155'}
                      strokeWidth={tickVal === 0 ? '1.2' : '1'}
                      strokeOpacity={tickVal === 0 ? '0.9' : '0.7'}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}

                {/* Node Volume Trend Polylines (spanning matching thumb center bounds) */}
                {nodes.map((node, idx) => {
                  if (hiddenNodeIds.has(node.id)) return null;
                  const color = colors[idx % colors.length];
                  const isHighlighted = highlightedNodeIds.includes(node.id);

                  const points = frames.map((frame, fIdx) => {
                    const x = THUMB_INSET + (totalDays > 0 ? (fIdx / totalDays) * Math.max(0, plotWidth - THUMB_INSET * 2) : 0);
                    const vol = frame.nodeVolumes?.[node.id] ?? 0;
                    const clampedVol = Math.max(0, vol);
                    const y = 150 - (clampedVol / dynamicCeiling) * 140;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');

                  return (
                    <g key={node.id}>
                      {/* Faint, wide halo underlay for selected graphline */}
                      {isHighlighted && (
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth="13"
                          strokeOpacity="0.42"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          points={points}
                        />
                      )}

                      {/* Visible Polyline: Solid line, not dotted */}
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth={isHighlighted ? "3" : "2.5"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={points}
                        style={{ transition: 'stroke-width 0.15s ease' }}
                      />

                      {/* Expanded Invisible Click/Touch Target (18px wide) */}
                      <polyline
                        fill="none"
                        stroke="transparent"
                        strokeWidth="18"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={points}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => handleLineClick(node.id, e)}
                      >
                        <title>{`${node.name} (Click to highlight, Ctrl+Click to toggle multiple)`}</title>
                      </polyline>
                    </g>
                  );
                })}

                {/* Synchronized Vertical Day Cursor Line - exact 1px thickness matching horizontal tracelines */}
                <line
                  x1={currentX}
                  y1="0"
                  x2={currentX}
                  y2="160"
                  stroke="#22c55e"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Timeline Range Scrubber (Moved to right by 48px to align exactly with SVG plot) */}
          <div style={{ display: 'flex', width: '100%', marginTop: '6px', alignItems: 'center' }}>
            {/* Left 48px spacer corresponding to volume labels gutter */}
            <div style={{ width: '48px', minWidth: '48px', maxWidth: '48px', flexShrink: 0 }} />

            {/* Slider and Day Labels container */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <input
                type="range"
                min="0"
                max={totalDays}
                value={currentDay}
                onChange={handleSliderChange}
                style={{
                  width: '100%',
                  accentColor: '#22c55e',
                  cursor: 'pointer',
                  height: '6px',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#94a3b8', padding: '0 4px', boxSizing: 'border-box' }}>
                <span>Day 0</span>
                <span>Day {Math.round(totalDays / 2)}</span>
                <span>Day {totalDays}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};