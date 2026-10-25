import React from 'react';
import { OverflowMode, StrictSubRule } from '../../models/types';

interface BatchPresetBarProps {
  onApplyPreset: (mode: OverflowMode, subRule?: StrictSubRule) => void;
}

export const BatchPresetBar: React.FC<BatchPresetBarProps> = ({ onApplyPreset }) => {
  return (
    <div style={{ height: '46px', minHeight: '46px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>⚙️ Quick Batch Presets:</span>
        <span>Apply rule defaults across all container nodes simultaneously.</span>
      </div>
      
      <div style={{ display: 'flex', gap: '6px', backgroundColor: '#1e293b', padding: '4px', borderRadius: '6px', border: '1px solid #334155' }}>
        <button
          onClick={() => onApplyPreset('strict', 'throttleback')}
          style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🔒 All Strict (Throttleback)
        </button>
        <button
          onClick={() => onApplyPreset('strict', 'headroom_hold')}
          style={{ backgroundColor: '#0d9488', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ⏱️ All Strict (Headroom Hold)
        </button>
        <button
          onClick={() => onApplyPreset('overfill')}
          style={{ backgroundColor: '#b45309', color: '#fde047', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ⚠️ All Overfill
        </button>
      </div>
    </div>
  );
};