import React from 'react';
import { ContainerNode, TransferLink, SimFrame, MaterialDefinition, OverflowMode, StrictSubRule, ClipboardData } from '../../models/types';
import { CanvasViewModel } from '../../viewmodel/CanvasViewModel';
import { MaterialDrawer } from './MaterialDrawer';

interface PropertyInspectorProps {
  vm: CanvasViewModel;
  isPlayback: boolean;
  currentDay: number;
  currentFrame: SimFrame;
  selectedNodeIds: string[];
  singleSelectedNode: ContainerNode | undefined;
  selectedLink: TransferLink | undefined;
  hasSelection: boolean;
  materials: MaterialDefinition[];
  clipboard: ClipboardData | null;
  onCopy: () => void;
  onPaste: () => void;
  onClearClipboard: () => void;
  onUpdateSingleNode: (field: keyof ContainerNode, val: any) => void;
  onUpdateLink: (field: keyof TransferLink, val: any) => void;
  onMaterialsUpdated: () => void;
  onOpenExportModal?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  vm,
  isPlayback,
  currentDay,
  currentFrame,
  selectedNodeIds,
  singleSelectedNode,
  selectedLink,
  hasSelection,
  materials,
  clipboard,
  onCopy,
  onPaste,
  onClearClipboard,
  onUpdateSingleNode,
  onUpdateLink,
  onMaterialsUpdated,
}) => {
  const selectedKind: 'container' | 'link' | 'none' = 
    selectedNodeIds.length > 0 ? 'container' :
    selectedLink ? 'link' :
    'none';

  const isClipboardInUse = clipboard !== null;
  const isWrongKind = isClipboardInUse && selectedKind !== 'none' && selectedKind !== clipboard.type;

  const canCopy = !isPlayback && selectedKind !== 'none' && (!isClipboardInUse || !isWrongKind);
  const canPaste = !isPlayback && isClipboardInUse && selectedKind === clipboard.type;

  const copyTooltip = isPlayback
    ? 'Copy is disabled during playback'
    : selectedKind === 'none'
    ? 'Select a container or transfer link to copy properties (Ctrl+C)'
    : isClipboardInUse && isWrongKind
    ? `Copy disabled: Clipboard contains ${clipboard.type === 'container' ? 'Container' : 'Transfer Link'} properties. Clear clipboard or select a matching element.`
    : `Copy properties of selected ${selectedKind === 'container' ? 'container' : 'transfer link'} (Ctrl+C)`;

  const pasteTooltip = isPlayback
    ? 'Paste is disabled during playback'
    : !isClipboardInUse
    ? 'Clipboard is empty. Copy properties first (Ctrl+C)'
    : selectedKind === 'none'
    ? `Select target ${clipboard.type === 'container' ? 'container(s)' : 'transfer link'} to paste properties (Ctrl+V)`
    : isWrongKind
    ? `Paste disabled: Clipboard contains ${clipboard.type === 'container' ? 'Container' : 'Transfer Link'} properties, but selected element is a ${selectedKind === 'container' ? 'Container' : 'Transfer Link'}.`
    : `Paste copied ${clipboard.type === 'container' ? 'container' : 'transfer link'} properties into selected element(s) (Ctrl+V)`;

  return (
    <div style={{ flex: 1, backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', minWidth: '320px', height: '100%', position: 'relative' }}>
      
      {/* Header with Title and Copy/Paste Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid #334155',
        paddingBottom: '12px',
        minHeight: '36px'
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          color: '#38bdf8',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {isPlayback ? `Telemetry (Day ${currentDay})` : 'Property Inspector'}
        </div>

        {!isPlayback && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* Clipboard Status Indicator */}
            {clipboard && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  fontSize: '10px',
                  color: '#94a3b8'
                }}
                title={`Clipboard: ${clipboard.type === 'container' ? 'Container' : 'Link'} properties from "${clipboard.sourceName}"`}
              >
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                  {clipboard.type === 'container' ? 'Container' : 'Link'}
                </span>
                <button
                  type="button"
                  onClick={onClearClipboard}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: '11px',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear clipboard"
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Copy Button */}
            <button
              type="button"
              onClick={onCopy}
              disabled={!canCopy}
              title={copyTooltip}
              style={{
                height: '28px',
                padding: '0 8px',
                backgroundColor: canCopy ? '#334155' : 'rgba(15, 23, 42, 0.6)',
                border: canCopy ? '1px solid #475569' : '1px solid rgba(51, 65, 85, 0.4)',
                borderRadius: '5px',
                color: canCopy ? '#f8fafc' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: canCopy ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
                opacity: canCopy ? 1 : 0.45
              }}
              onMouseEnter={e => {
                if (canCopy) {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.color = '#38bdf8';
                  e.currentTarget.style.backgroundColor = '#1e293b';
                }
              }}
              onMouseLeave={e => {
                if (canCopy) {
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.backgroundColor = '#334155';
                }
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
              <span style={{ fontSize: '9px', opacity: 0.7, padding: '1px 3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>^C</span>
            </button>

            {/* Paste Button */}
            <button
              type="button"
              onClick={onPaste}
              disabled={!canPaste}
              title={pasteTooltip}
              style={{
                height: '28px',
                padding: '0 8px',
                backgroundColor: canPaste ? '#334155' : 'rgba(15, 23, 42, 0.6)',
                border: canPaste ? '1px solid #475569' : '1px solid rgba(51, 65, 85, 0.4)',
                borderRadius: '5px',
                color: canPaste ? '#f8fafc' : '#64748b',
                fontSize: '11px',
                fontWeight: 600,
                cursor: canPaste ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
                opacity: canPaste ? 1 : 0.45
              }}
              onMouseEnter={e => {
                if (canPaste) {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.color = '#22c55e';
                  e.currentTarget.style.backgroundColor = '#1e293b';
                }
              }}
              onMouseLeave={e => {
                if (canPaste) {
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.color = '#f8fafc';
                  e.currentTarget.style.backgroundColor = '#334155';
                }
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </svg>
              <span>Paste</span>
              <span style={{ fontSize: '9px', opacity: 0.7, padding: '1px 3px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>^V</span>
            </button>
          </div>
        )}
      </div>

      {isPlayback ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>TIMELINE STATUS</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#22c55e' }}>Day {currentDay} of 30</div>
          </div>

          {/* Selected Container Live Telemetry */}
          {selectedNodeIds.length === 1 && singleSelectedNode && (() => {
            const liveVol = currentFrame ? (currentFrame.nodeVolumes[singleSelectedNode.id] ?? singleSelectedNode.currentVolume) : singleSelectedNode.currentVolume;
            const nodeStatus = currentFrame?.nodeStatuses?.[singleSelectedNode.id] ?? 'frozen';
            const statusConfig = {
              full: { label: 'Flowing at Full Rate', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e' },
              restricted: { label: 'Flowing at Restricted Rate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
              blocked: { label: 'Blocked (Capacity Constraint)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' },
              starved: { label: 'Cannot Deliver (Lack of Material)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' },
              frozen: { label: currentDay === 0 ? 'Day 0 (Frozen)' : 'Inactive / Idle', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' },
              idle: { label: 'Idle', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' }
            }[nodeStatus] || { label: 'Frozen', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' };

            const fillPct = Math.min(100, Math.round((liveVol / singleSelectedNode.capacity) * 100));

            return (
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>CONTAINER TELEMETRY</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f8fafc' }}>{singleSelectedNode.name}</div>
                
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', backgroundColor: statusConfig.bg, border: `1px solid ${statusConfig.border}`, color: statusConfig.color, fontSize: '11px', fontWeight: 600, width: 'fit-content' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusConfig.color }} />
                  {statusConfig.label}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>Live Volume:</span>
                  <span style={{ fontWeight: 600 }}>{Math.round(liveVol).toLocaleString()} / {Math.round(singleSelectedNode.capacity).toLocaleString()} m³ ({fillPct}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, fillPct)}%`, height: '100%', backgroundColor: liveVol > singleSelectedNode.capacity ? '#ef4444' : (singleSelectedNode.type === 'excavation' ? '#0d9488' : singleSelectedNode.type === 'stockpile' ? '#b45309' : '#475569') }} />
                </div>
                {singleSelectedNode.notes && (
                  <div style={{ marginTop: '2px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>NOTES</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{singleSelectedNode.notes}</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Selected Transfer Link Live Telemetry */}
          {selectedLink && (() => {
            const linkFlow = currentFrame ? (currentFrame.linkFlows[selectedLink.id] ?? 0) : 0;
            const linkStatus = currentFrame?.linkStatuses?.[selectedLink.id] ?? 'frozen';
            const source = vm.getNodes().find(n => n.id === selectedLink.sourceId);
            const target = vm.getNodes().find(n => n.id === selectedLink.targetId);

            const statusConfig = {
              full: { label: 'Flowing at Full Rate', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e' },
              restricted: { label: 'Flowing at Restricted Rate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b' },
              blocked: { label: 'Blocked (Capacity Constraint)', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' },
              starved: { label: 'Cannot Deliver (Lack of Material)', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' },
              frozen: { label: currentDay === 0 ? 'Day 0 (Frozen)' : 'Inactive / Idle', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' },
              idle: { label: 'Idle', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' }
            }[linkStatus] || { label: 'Frozen', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' };

            return (
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>TRANSFER LINK TELEMETRY</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>{source?.name ?? 'Source'} → {target?.name ?? 'Target'}</div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', backgroundColor: statusConfig.bg, border: `1px solid ${statusConfig.border}`, color: statusConfig.color, fontSize: '11px', fontWeight: 600, width: 'fit-content' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusConfig.color }} />
                  {statusConfig.label}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbd5e1' }}>
                  <span>Transfer Rate:</span>
                  <span style={{ fontWeight: 600 }}>{Math.round(linkFlow).toLocaleString()} / {Math.round(selectedLink.dailyRate).toLocaleString()} m³/d</span>
                </div>
                {selectedLink.notes && (
                  <div style={{ marginTop: '2px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid #334155', fontSize: '11px', color: '#cbd5e1' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '2px' }}>NOTES</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{selectedLink.notes}</div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Color Key Reference */}
          <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '8px' }}>SIMULATION COLOR KEY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#38bdf8', display: 'inline-block' }} />
                <span><strong>Blue:</strong> Day 0 (Frozen) / Lack of Material</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#22c55e', display: 'inline-block' }} />
                <span><strong>Green:</strong> Flowing at full rate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                <span><strong>Amber:</strong> Flowing at restricted rate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444', display: 'inline-block' }} />
                <span><strong>Red:</strong> Blocked due to capacity issues</span>
              </div>
            </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '150px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                Selected: <strong style={{ color: '#38bdf8' }}>Container Node</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Node Name</label>
                <input type="text" value={singleSelectedNode.name} onChange={e => onUpdateSingleNode('name', e.target.value)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Container Type</label>
                <select value={singleSelectedNode.type} onChange={e => onUpdateSingleNode('type', e.target.value as any)} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }}>
                  <option value="excavation">Excavation (Cut)</option>
                  <option value="stockpile">Stockpile (Fill)</option>
                  <option value="null">Null Junction</option>
                  <option value="external">External Boundary</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Capacity (m³)</label>
                <input type="number" value={singleSelectedNode.capacity} onChange={e => onUpdateSingleNode('capacity', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Current Volume (m³)</label>
                <input type="number" value={singleSelectedNode.currentVolume} onChange={e => onUpdateSingleNode('currentVolume', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Assigned Material</label>
                <select
                  value={singleSelectedNode.materialType}
                  onChange={e => onUpdateSingleNode('materialType', e.target.value)}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px', fontWeight: 'bold' }}
                >
                  {materials.map(mat => (
                    <option key={mat.code} value={mat.code}>
                      {mat.code} — {mat.name} (IN: {mat.bulkIN}, OUT: {mat.bulkOUT})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Plant / Fleet Count</label>
                <input type="number" value={singleSelectedNode.plantCount} onChange={e => onUpdateSingleNode('plantCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155', marginTop: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>Strict Rules Controls</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Node Overflow Mode</label>
                  <select
                    value={singleSelectedNode.overflowMode || 'strict'}
                    onChange={e => onUpdateSingleNode('overflowMode', e.target.value as OverflowMode)}
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
                        onChange={e => onUpdateSingleNode('strictSubRule', e.target.value as StrictSubRule)}
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
                          onChange={e => onUpdateSingleNode('headroomThreshold', Number(e.target.value))}
                          style={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '6px', fontSize: '11px' }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Container Notes Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Notes</label>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Included in CSV export</span>
                </div>
                <textarea
                  value={singleSelectedNode.notes || ''}
                  onChange={e => onUpdateSingleNode('notes', e.target.value)}
                  placeholder="Operational notes, geotechnical constraints, equipment assignments..."
                  rows={3}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    padding: '8px',
                    fontSize: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.4
                  }}
                />
              </div>
            </div>
          )}

          {selectedNodeIds.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Selected: <strong style={{ color: '#38bdf8' }}>{selectedNodeIds.length} Container Nodes</strong>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                Multi-Container Selection
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                Click <strong>Paste</strong> (<kbd style={{ padding: '2px 5px', backgroundColor: '#1e293b', borderRadius: '3px', border: '1px solid #475569', color: '#f8fafc', fontSize: '11px' }}>Ctrl+V</kbd>) above to paste copied container properties across all {selectedNodeIds.length} selected containers simultaneously, or use the top preset bar.
              </div>
            </div>
          )}

          {selectedLink && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '4px' }}>
                Selected: <strong style={{ color: '#38bdf8' }}>Transfer Link</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Daily Rate (m³/day)</label>
                <input type="number" value={selectedLink.dailyRate} onChange={e => onUpdateLink('dailyRate', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Fleet Count</label>
                <input type="number" value={selectedLink.fleetCount} onChange={e => onUpdateLink('fleetCount', Number(e.target.value))} style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '4px', color: '#f8fafc', padding: '8px', fontSize: '12px' }} />
              </div>


              {/* Transfer Link Notes Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Notes</label>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Included in CSV export</span>
                </div>
                <textarea
                  value={selectedLink.notes || ''}
                  onChange={e => onUpdateLink('notes', e.target.value)}
                  placeholder="Haul route notes, road conditions, speed restrictions..."
                  rows={3}
                  style={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    padding: '8px',
                    fontSize: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.4
                  }}
                />
              </div>
            </div>
          )}

          {!hasSelection && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#64748b', textAlign: 'center', fontSize: '12px', gap: '8px' }}>
              <div>No entity selected</div>
              <div style={{ fontSize: '11px' }}>Click container nodes or link badges to inspect and edit properties.</div>
            </div>
          )}
        </>
      )}

      {!isPlayback && (
        <MaterialDrawer vm={vm} materials={materials} onMaterialsUpdated={onMaterialsUpdated} />
      )}
    </div>
  );
};