import React from 'react';

interface RuleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  ruleName: string;
  ruleShape: 'circle' | 'diamond' | 'square';
  containerCount: number;
}

export const RuleConfirmModal: React.FC<RuleConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  ruleName,
  ruleShape,
  containerCount
}) => {
  if (!isOpen) return null;

  const renderShapeIcon = () => {
    if (ruleShape === 'circle') {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <circle cx="7" cy="7" r="5.75" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    } else if (ruleShape === 'diamond') {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <polygon points="7,0.5 13.5,7 7,13.5 0.5,7" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    } else {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
          <rect x="2" y="2" width="10" height="10" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #475569',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0f172a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {renderShapeIcon()}
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
              Apply Rule to All Containers?
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 4px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
            No individual containers are currently selected.
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
            Do you want to apply the <strong style={{ color: '#f8fafc' }}>{ruleName}</strong> rule to all <strong style={{ color: '#38bdf8' }}>{containerCount}</strong> containers in the model?
          </p>
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Apply to All
          </button>
        </div>
      </div>
    </div>
  );
};
