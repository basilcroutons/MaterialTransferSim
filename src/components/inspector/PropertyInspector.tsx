import React from 'react';
import { ContainerNode, TransferLink, SimFrame, MaterialDefinition, OverflowMode, StrictSubRule } from '../../models/types';
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
  onUpdateSingleNode: (field: keyof ContainerNode, val: any) => void;
  onUpdateLink: (field: keyof TransferLink, val: any) => void;
  onMaterialsUpdated: () => void;
  onOpenExportModal: () => void;
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
  onUpdateSingleNode,
  onUpdateLink,
  onMaterialsUpdated,
  onOpenExportModal
}) => {
  return (
    <div style={{ flex: 1, backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', minWidth: '320px', height: '100%', position: 'relative' }}>
      
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
              onClick={onOpenExportModal}
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