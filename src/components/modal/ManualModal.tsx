import React, { useState } from 'react';
import { downloadFileBlob } from '../../utils/fileDownloader';

interface ManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('sec-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<'pdf' | 'odt' | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (type: 'pdf' | 'odt') => {
    setIsDownloading(type);
    setDownloadSuccess(null);
    const filename = type === 'pdf' 
      ? 'Material_Transfer_Simulation_User_Manual.pdf' 
      : 'Material_Transfer_Simulation_User_Manual.odt';
    const mime = type === 'pdf' ? 'application/pdf' : 'application/vnd.oasis.opendocument.text';
    
    const success = await downloadFileBlob(`/${filename}`, filename, mime);
    setIsDownloading(null);
    if (success) {
      setDownloadSuccess(
        type === 'pdf'
          ? 'Downloaded PDF! You can now open it in PDF-XChange Editor.'
          : 'Downloaded .ODT file for OpenOffice / Word.'
      );
      setTimeout(() => setDownloadSuccess(null), 4500);
    }
  };

  const sections = [
    { id: 'sec-1', number: '1', title: 'System Architecture & Node Topology' },
    { id: 'sec-2', number: '2', title: 'Graphical User Interface Overview' },
    { id: 'sec-3', number: '3', title: 'Container Management & Halo Highlights' },
    { id: 'sec-4', number: '4', title: 'Intelligent Proximity Snapping (12px / 24px)' },
    { id: 'sec-5', number: '5', title: 'Transfer Link Routing, Corridors & Badges' },
    { id: 'sec-6', number: '6', title: 'Volumetric Simulation & Overflow Rules' },
    { id: 'sec-7', number: '7', title: 'Simulation Playback & Visual Telemetry' },
    { id: 'sec-8', number: '8', title: 'Batch Preset Ribbon' },
    { id: 'sec-9', number: '9', title: 'CSV Data Model & Export Specifications' },
    { id: 'sec-10', number: '10', title: 'Keyboard & Mouse Interaction Cheat Sheet' },
  ];

  const filteredSections = searchQuery.trim() === ''
    ? sections
    : sections.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '94vw',
          maxWidth: '1280px',
          height: '92vh',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f1f5f9',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            height: '60px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '20px' }}>📖</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>MATERIAL TRANSFER SIMULATOR — USER MANUAL</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#0369a1', color: '#bae6fd', fontWeight: 600 }}>v2.4</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Discrete Volumetric Simulation, Corridor Routing & Telemetry Guide
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {downloadSuccess && (
              <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, animation: 'fadeIn 0.2s' }}>
                ✓ {downloadSuccess}
              </span>
            )}

            <button
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading === 'pdf'}
              style={{
                height: '34px',
                padding: '0 14px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: '1px solid #38bdf8',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
              title="Download PDF to open in your default viewer (PDF-XChange Editor)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isDownloading === 'pdf' ? 'Downloading...' : 'Download PDF (PDF-XChange)'}
            </button>

            <button
              onClick={() => handleDownload('odt')}
              disabled={isDownloading === 'odt'}
              style={{
                height: '34px',
                padding: '0 12px',
                backgroundColor: '#334155',
                color: '#e2e8f0',
                border: '1px solid #475569',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Download editable OpenOffice / LibreOffice Word document (.odt)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              {isDownloading === 'odt' ? 'Downloading...' : 'Download .ODT'}
            </button>

            <button
              onClick={() => window.print()}
              style={{
                height: '34px',
                width: '34px',
                backgroundColor: '#1e293b',
                color: '#94a3b8',
                border: '1px solid #475569',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Print Manual"
            >
              🖨️
            </button>

            <button
              onClick={onClose}
              style={{
                height: '34px',
                width: '34px',
                backgroundColor: '#334155',
                color: '#f8fafc',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
              title="Close Manual (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left Navigation Sidebar */}
          <div
            style={{
              width: '280px',
              backgroundColor: '#1e293b',
              borderRight: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Search Input */}
            <div style={{ padding: '14px', borderBottom: '1px solid #334155' }}>
              <input
                type="text"
                placeholder="Search manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Section Links */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '1px' }}>
                Table of Contents
              </div>
              {filteredSections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: isActive ? '#0369a1' : 'transparent',
                      color: isActive ? '#ffffff' : '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 400,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '2px',
                      lineHeight: '1.4',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <span style={{ color: isActive ? '#bae6fd' : '#94a3b8', fontWeight: 700, minWidth: '18px' }}>
                      {sec.number}.
                    </span>
                    <span>{sec.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick tips footer */}
            <div style={{ padding: '12px', borderTop: '1px solid #334155', fontSize: '11px', color: '#94a3b8', backgroundColor: '#0f172a' }}>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>💡 Pro-Tip</div>
              Clicking <b>Download PDF</b> saves the file directly to your drive, allowing full markup and measurement in <b>PDF-XChange Editor</b>.
            </div>
          </div>

          {/* Right Scrollable Content Pane */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '36px 48px',
              backgroundColor: '#0b1120',
              lineHeight: 1.65,
              fontSize: '13.5px',
              color: '#cbd5e1',
            }}
          >
            {/* Document Header Banner */}
            <div style={{ paddingBottom: '24px', borderBottom: '2px solid #0284c7', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', color: '#22c55e', textTransform: 'uppercase' }}>
                  E4D Planner Operational Documentation
                </span>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Engineering Reference Release 2.4</span>
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
                Material Transfer Simulation System
              </h1>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, maxWidth: '850px' }}>
                A discrete volumetric modeling environment for bulk earthmoving, stockpile buffer management, corridor routing, and haul fleet throughput projections.
              </p>
            </div>

            {/* Executive Purpose Callout */}
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: 'rgba(2, 132, 199, 0.1)',
                borderLeft: '4px solid #0284c7',
                borderRadius: '0 8px 8px 0',
                marginBottom: '36px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px', fontSize: '13px' }}>
                SYSTEM OVERVIEW & DESIGN PRINCIPLE
              </div>
              <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px' }}>
                The E4D Planner enables civil estimators, site superintendents, and logistics engineers to lay out project nodes (excavation pits, processing pads, surge stockpiles, and offsite dumps), configure directed haul corridors with swell/reclamation factors, and project a rigorous 30-day discrete simulation with automatic overflow throttleback rules.
              </p>
            </div>

            {/* SECTION 1 */}
            <section id="sec-1" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>1.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>System Architecture & Node Topology</h2>
              </div>
              <p>The simulation topology comprises three primary node archetypes connected by directed haulage routes:</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', margin: '20px 0' }}>
                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>
                    <span>⛏️</span> Excavation Nodes (Sources)
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0 }}>
                    Active quarry faces, borrow pits, or deep foundation cuts. Material is excavated in in-situ bulk bank cubic meters (BCM) and transferred downline. Excavations steadily deplete over the 30-day projection envelope.
                  </p>
                </div>

                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700, marginBottom: '8px' }}>
                    <span>📦</span> Stockpile Nodes (Buffers)
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0 }}>
                    Intermediate surge pads (e.g., Stockpile A, Stockpile B) with defined starting volumes and maximum capacities. They receive inbound loose receipts and handle outbound re-handling with distinct swell and compaction ratios.
                  </p>
                </div>

                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontWeight: 700, marginBottom: '8px' }}>
                    <span>🏭</span> External Destination Nodes (Sinks)
                  </div>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: 0 }}>
                    Final placement destinations including offsite crushers, structural embankments, or customer delivery hubs. External nodes possess infinite or unbounded capacity thresholds.
                  </p>
                </div>
              </div>

              {/* Embedded Screenshot */}
              <div style={{ margin: '24px 0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <img
                  src="/assets/aistudio/image_24defcc3.png"
                  alt="Stockpile Container Card"
                  style={{ maxHeight: '220px', borderRadius: '6px', border: '1px solid #475569', display: 'inline-block' }}
                />
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                  Figure 1.1: Stockpile Container Node Card displaying current volume, capacity bar, and active bulk factors.
                </div>
              </div>
            </section>

            {/* SECTION 2 */}
            <section id="sec-2" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>2.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Graphical User Interface Overview</h2>
              </div>
              <p>The workspace layout is structured into five intuitive operational zones:</p>

              <div style={{ margin: '20px 0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <img
                  src="/assets/aistudio/image_32906e00.png"
                  alt="Top Control Bar"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', border: '1px solid #475569', display: 'inline-block' }}
                />
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                  Figure 2.1: Top Global Control Bar featuring Import Model, Export Model, PDF Manual, and Playback Toggle.
                </div>
              </div>

              <ul style={{ paddingLeft: '22px', margin: '14px 0' }}>
                <li style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#f8fafc' }}>Top Header Bar:</b> Hosts primary global commands (CSV Model Import, Comprehensive Export modal, User Manual downloads, and the simulation Playback toggle).
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#f8fafc' }}>Batch Preset Bar:</b> Positioned directly below the header. Enables 1-click application of standardized material swell presets (1.15x gravel/clay, 1.25x rock) and capacity adjustments across multiple nodes.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#f8fafc' }}>Central Canvas Viewport:</b> The interactive layout space supporting smooth infinite panning, zooming, magnetic node alignment, and visual route authoring.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#f8fafc' }}>Right Inspector Panel:</b> Contextual editor displaying volumetric properties and bulk factors for selected containers, or fleet allocations for transfer routes.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b style={{ color: '#f8fafc' }}>Bottom Telemetry & Scrubber Tray:</b> Active during Playback Mode with a 30-day timeline scrubber, speed controls, and a real-time multi-series trend graph.
                </li>
              </ul>
            </section>

            {/* SECTION 3 */}
            <section id="sec-3" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>3.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Container Management & Halo Highlights</h2>
              </div>
              <p>Containers can be created, dragged, and configured directly on the canvas:</p>

              <div
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid #0284c7',
                  borderRadius: '8px',
                  padding: '16px',
                  margin: '16px 0',
                }}
              >
                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                  ✨ Luminous Selection Halo Engine (0.52 Opacity & 14px Radius)
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#e2e8f0' }}>
                  Selected containers receive a wide, luminous outer halo. To ensure the halo does not interfere with or obscure the simulation engine’s status borders (Green full flow, Amber throttled, Red overflow halt), the halo is drawn as an outer ambient back-glow rather than an overlapping border stroke.
                </p>
              </div>

              <div style={{ margin: '20px 0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <img
                  src="/assets/aistudio/image_040f2a72.png"
                  alt="Excavation Container Card"
                  style={{ maxHeight: '240px', borderRadius: '6px', border: '1px solid #475569', display: 'inline-block' }}
                />
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                  Figure 3.1: Excavation Source Node Card showing in-situ reserves, daily draw, and active connection links.
                </div>
              </div>
            </section>

            {/* SECTION 4 */}
            <section id="sec-4" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>4.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Intelligent Proximity Snapping (12px Gap & 24px Threshold)</h2>
              </div>
              <p>
                To keep layouts organized without tedious pixel nudging, the canvas features an intelligent axis-isolated magnetic snapping engine:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', margin: '20px 0' }}>
                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#22c55e', marginBottom: '4px' }}>24px Magnetic Range</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    When dragging a container, if any edge gets within 24 pixels of a neighboring container boundary, magnetic attraction activates.
                  </div>
                </div>

                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>12px Fixed Margin Gap</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    The dragged container smoothly locks into position maintaining an exact 12-pixel visual gap between adjacent container borders.
                  </div>
                </div>

                <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Independent Axis Isolation</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Moving a container vertically downward snaps only top/bottom edges into alignment. Horizontal X-coordinates are not affected unless also within range.
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="sec-5" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>5.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Transfer Link Routing, Corridors & Badges</h2>
              </div>
              <p>Transfer routes define directed haulage corridors between nodes with Manhattan 90° bends and parallel lane separation:</p>

              <div style={{ margin: '20px 0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <img
                  src="/assets/aistudio/image_51266522.png"
                  alt="Multi-link corridor routing"
                  style={{ maxHeight: '240px', borderRadius: '6px', border: '1px solid #475569', display: 'inline-block' }}
                />
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '10px', fontStyle: 'italic' }}>
                  Figure 5.1: Multi-link corridor routing showing parallel lane offsets and flow rate badges.
                </div>
              </div>

              <h3 style={{ fontSize: '15px', color: '#f8fafc', marginTop: '24px' }}>Dynamic Flow Rate Badges ('k' Notation)</h3>
              <p>
                Every active route displays a prominent badge showing its transfer rate in standardized thousands notation (e.g. <b>1.50k</b> for 1,500 m³/day):
              </p>

              <div style={{ margin: '16px 0', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <img
                  src="/assets/aistudio/image_1a6fb2bf.png"
                  alt="Flow Rate Badges"
                  style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid #475569', display: 'inline-block' }}
                />
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                  Figure 5.2: Rate badges displayed along route segments in clean thousands notation.
                </div>
              </div>

              <h3 style={{ fontSize: '15px', color: '#f8fafc', marginTop: '24px' }}>Operational Route Color Codes</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '14px 0', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #475569' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8' }}>Status Indicator</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8' }}>Operational Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#22c55e' }}>● GREEN (Full Flow)</td>
                    <td style={{ padding: '10px 14px' }}>100% of planned material volume is flowing unrestricted. Ample source material and receiving headroom.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f59e0b' }}>● AMBER (Throttled)</td>
                    <td style={{ padding: '10px 14px' }}>Flow restricted (1%–99%). Downstream stockpile is near capacity and invoking Throttleback.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#ef4444' }}>● RED (Halt / Blocked)</td>
                    <td style={{ padding: '10px 14px' }}>0% flow. Receiving buffer is 100% full (overflow condition) or source is exhausted.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#64748b' }}>● BLUE / SLATE (Idle)</td>
                    <td style={{ padding: '10px 14px' }}>Inactive or unsimulated route segment outside active haulage windows.</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* SECTION 6 */}
            <section id="sec-6" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>6.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Volumetric Simulation Engine & Overflow Rules</h2>
              </div>
              <p>
                The discrete simulation engine runs a 30-day projection envelope evaluating volumetric balance each day:
              </p>
              <ul style={{ paddingLeft: '22px' }}>
                <li style={{ marginBottom: '8px' }}>
                  <b>Throttleback (Proportional Reduction):</b> When incoming volume exceeds remaining capacity, inbound links are scaled back proportionally to fill the stockpile exactly to 100% without spilling.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b>Headroom Hold:</b> Halts all upstream haulage when headroom drops below a configured safety threshold.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <b>Overfill Mode:</b> Allows physical stockpiling beyond nominal capacity with visual violation warnings.
                </li>
              </ul>
            </section>

            {/* SECTION 7 */}
            <section id="sec-7" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>7.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Simulation Playback & Visual Telemetry</h2>
              </div>
              <p>
                Entering Playback Mode locks canvas geometry and activates the 30-day scrubber and telemetry graph:
              </p>
              <ul style={{ paddingLeft: '22px' }}>
                <li style={{ marginBottom: '6px' }}>
                  <b>Dual Halo Synchronized Highlighting:</b> Clicking a container or graph series illuminates both the node card (0.52 halo) and graph line (0.42 halo).
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <b>Spacebar Play/Pause:</b> Rapidly start or pause simulation playback at 1x, 2x, or 5x speed.
                </li>
              </ul>
            </section>

            {/* SECTION 8 */}
            <section id="sec-8" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>8.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Batch Preset Ribbon</h2>
              </div>
              <p>
                Located directly beneath the main header, the Preset Ribbon enables 1-click batch property applications:
              </p>
              <ul style={{ paddingLeft: '22px' }}>
                <li><b>Gravel / Clay (1.15x):</b> Sets inbound swell factor to 1.15 across selected nodes.</li>
                <li><b>Blasted Rock (1.25x):</b> Sets bulk factor to 1.25.</li>
                <li><b>Reset Capacity:</b> Standardizes buffer ceilings for selected stockpiles.</li>
              </ul>
            </section>

            {/* SECTION 9 */}
            <section id="sec-9" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>9.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>CSV Data Model & Export Specifications</h2>
              </div>
              <p>
                The application supports full two-way CSV interoperability:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '14px 0', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #475569' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8' }}>File Type</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8' }}>Schema & Contents</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Model CSV</td>
                    <td style={{ padding: '10px 14px' }}>Container positions (X/Y), initial volumes, maximum capacities, swell factors, and transfer links with planned daily rates.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Simulation Telemetry CSV</td>
                    <td style={{ padding: '10px 14px' }}>Day-by-day (Day 0 to 30) recorded volumes, inflows, outflows, headroom, and link throughputs for external spreadsheet auditing.</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* SECTION 10 */}
            <section id="sec-10" style={{ marginBottom: '48px', scrollMarginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>10.</span>
                <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Keyboard & Mouse Interaction Cheat Sheet</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '14px 0', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #475569' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8', width: '220px' }}>Interaction / Key</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', color: '#38bdf8' }}>Function & Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Drag Container</td>
                    <td style={{ padding: '10px 14px' }}>Reposition container. Magnetic snapping activates at 24px proximity with 12px gap.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Ctrl / Cmd + Click</td>
                    <td style={{ padding: '10px 14px' }}>Multi-select multiple containers for batch parameter editing.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Middle Mouse / Right Drag</td>
                    <td style={{ padding: '10px 14px' }}>Pan canvas viewport freely in any direction.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Mouse Wheel</td>
                    <td style={{ padding: '10px 14px' }}>Zoom canvas in and out centered at cursor position.</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Spacebar (Playback)</td>
                    <td style={{ padding: '10px 14px' }}>Toggle playback between Play and Pause.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#f8fafc' }}>Click Route Line / Badge</td>
                    <td style={{ padding: '10px 14px' }}>Inspect and adjust daily flow rate and truck fleet allocation.</td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Bottom Download Bar in Modal */}
            <div
              style={{
                marginTop: '40px',
                padding: '24px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '15px' }}>
                  Need an offline copy for your workstation?
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Both the PDF and OpenOffice .ODT documents are ready for instant direct download.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={isDownloading === 'pdf'}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📥 Download PDF (for PDF-XChange Editor)
                </button>

                <button
                  onClick={() => handleDownload('odt')}
                  disabled={isDownloading === 'odt'}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    backgroundColor: '#334155',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📄 Download .ODT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
