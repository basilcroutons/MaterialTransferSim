import React from 'react';
import { OverflowMode, StrictSubRule } from '../../models/types';

interface BatchPresetBarProps {
  onApplyPreset: (mode: OverflowMode, subRule?: StrictSubRule) => void;
  selectedCount?: number;
}

export const BatchPresetBar: React.FC<BatchPresetBarProps> = ({ onApplyPreset, selectedCount = 0 }) => {
  return (
    <div style={{ height: '46px', minHeight: '46px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>Quick Presets:</span>
        <span>
          {selectedCount > 0
            ? `Apply rule to ${selectedCount} selected container${selectedCount > 1 ? 's' : ''}.`
            : 'Apply rule defaults to selected or all containers.'}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={() => onApplyPreset('strict', 'throttleback')}
          style={{
            width: '170px',
            height: '30px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxSizing: 'border-box'
          }}
          title="Strict Capacity (Proportional Throttleback)"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" style={{ display: 'inline-block', flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5.25" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
          </svg>
          <span>Throttleback</span>
        </button>

        <button
          onClick={() => onApplyPreset('strict', 'headroom_hold')}
          style={{
            width: '170px',
            height: '30px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxSizing: 'border-box'
          }}
          title="Strict Capacity (Headroom Hold)"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" style={{ display: 'inline-block', flexShrink: 0 }}>
            <polygon points="6.5,0.5 12.5,6.5 6.5,12.5 0.5,6.5" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
          </svg>
          <span>Headroom Hold</span>
        </button>

        <button
          onClick={() => onApplyPreset('overfill')}
          style={{
            width: '170px',
            height: '30px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxSizing: 'border-box'
          }}
          title="Uncapped Capacity (Allow Overfill)"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" style={{ display: 'inline-block', flexShrink: 0 }}>
            <rect x="2" y="2" width="9" height="9" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.2" />
          </svg>
          <span>Overfill</span>
        </button>
      </div>
    </div>
  );
};