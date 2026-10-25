import React, { RefObject } from 'react';

interface TopHeaderProps {
  isPlayback: boolean;
  onTogglePlayback: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ isPlayback, onTogglePlayback, fileInputRef }) => {
  return (
    <header style={{ height: '52px', minHeight: '52px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', color: '#22c55e' }}>E4D</span>
        <span style={{ height: '14px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
        <span style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>Material Transfer Sim — Modular Phase 3a Refactor</span>
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
          onClick={onTogglePlayback}
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
  );
};