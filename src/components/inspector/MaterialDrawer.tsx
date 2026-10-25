import React, { useState } from 'react';
import { MaterialDefinition } from '../../models/types';
import { CanvasViewModel } from '../../viewmodel/CanvasViewModel';

interface MaterialDrawerProps {
  vm: CanvasViewModel;
  materials: MaterialDefinition[];
  onMaterialsUpdated: () => void;
}

export const MaterialDrawer: React.FC<MaterialDrawerProps> = ({ vm, materials, onMaterialsUpdated }) => {
  const [isMaterialDrawerOpen, setIsMaterialDrawerOpen] = useState<boolean>(false);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#0f172a',
      borderTop: '2px solid #38bdf8',
      borderTopLeftRadius: '12px',
      borderTopRightRadius: '12px',
      boxShadow: '0 -8px 20px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      zIndex: 50
    }}>
      <div
        onClick={() => setIsMaterialDrawerOpen(!isMaterialDrawerOpen)}
        style={{
          height: '38px',
          backgroundColor: '#1e293b',
          borderTopLeftRadius: '10px',
          borderTopRightRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>▲</span>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Material Definitions & Bulking Library ({materials.length})
          </span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{isMaterialDrawerOpen ? 'Click to Close' : 'Click to Open'}</span>
      </div>

      {isMaterialDrawerOpen && (
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Define swell (`bulkIN`) & shrinkage (`bulkOUT`) factors.</span>
            <button
              onClick={() => {
                const newCode = `MAT${materials.length + 1}`;
                vm.addMaterial({ code: newCode, name: 'New Material', bulkIN: 1.20, bulkOUT: 0.90 });
                onMaterialsUpdated();
              }}
              style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              + Add Material
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '6px' }}>Code</th>
                <th style={{ padding: '6px' }}>Name</th>
                <th style={{ padding: '6px' }}>bulkIN</th>
                <th style={{ padding: '6px' }}>bulkOUT</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat, idx) => (
                <tr key={mat.code} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="text"
                      value={mat.code}
                      onChange={e => {
                        vm.updateMaterial(idx, 'code', e.target.value.toUpperCase());
                        onMaterialsUpdated();
                      }}
                      style={{ width: '45px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '3px', borderRadius: '3px', fontSize: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="text"
                      value={mat.name}
                      onChange={e => {
                        vm.updateMaterial(idx, 'name', e.target.value);
                        onMaterialsUpdated();
                      }}
                      style={{ width: '85px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '3px', borderRadius: '3px', fontSize: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      step="0.05"
                      value={mat.bulkIN}
                      onChange={e => {
                        vm.updateMaterial(idx, 'bulkIN', Number(e.target.value));
                        onMaterialsUpdated();
                      }}
                      style={{ width: '45px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '3px', borderRadius: '3px', fontSize: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input
                      type="number"
                      step="0.05"
                      value={mat.bulkOUT}
                      onChange={e => {
                        vm.updateMaterial(idx, 'bulkOUT', Number(e.target.value));
                        onMaterialsUpdated();
                      }}
                      style={{ width: '45px', backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f8fafc', padding: '3px', borderRadius: '3px', fontSize: '10px' }}
                    />
                  </td>
                  <td style={{ padding: '4px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        vm.removeMaterial(mat.code);
                        onMaterialsUpdated();
                      }}
                      style={{ backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '2px 6px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};