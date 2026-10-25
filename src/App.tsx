import React, { useState, useRef } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { ContainerNode, TransferLink, MaterialDefinition } from './models/types';
import { TopHeader } from './components/header/TopHeader';
import { BatchPresetBar } from './components/header/BatchPresetBar';
import { SimulationCanvas } from './components/canvas/SimulationCanvas';
import { PlaybackGraph } from './components/timeline/PlaybackGraph';
import { PropertyInspector } from './components/inspector/PropertyInspector';

export default function App() {
  const [vm] = useState(() => new CanvasViewModel());
  const [nodes, setNodes] = useState<ContainerNode[]>(vm.getNodes());
  const [links, setLinks] = useState<TransferLink[]>(vm.getLinks());
  const [materials, setMaterials] = useState<MaterialDefinition[]>(vm.getMaterials());
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['node-1']);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const [isPlayback, setIsPlayback] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportFileName, setExportFileName] = useState<string>('material_transfer_simulation_complete.csv');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentFrame = vm.getCurrentFrame();
  const frames = vm.getFrames();

  const selectedLink = selectedLinkId ? links.find(l => l.id === selectedLinkId) : undefined;
  const singleSelectedNode = selectedNodeIds.length === 1 ? nodes.find(n => n.id === selectedNodeIds[0]) : undefined;

  const togglePlayback = () => {
    const nextState = !isPlayback;
    setIsPlayback(nextState);
    vm.setPlayback(nextState);
    if (nextState) {
      setCurrentDay(0);
      vm.setFrameIndex(0);
      setSelectedNodeIds([]);
      setSelectedLinkId(null);
      setIsGraphExpanded(true);
    } else {
      setIsGraphExpanded(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = parseInt(e.target.value, 10);
    setCurrentDay(day);
    vm.setFrameIndex(day);
  };

  const updateSingleNode = (field: keyof ContainerNode, val: any) => {
    if (!singleSelectedNode || isPlayback) return;
    (singleSelectedNode as any)[field] = val;
    vm.recalculateSimulation();
    setNodes([...vm.getNodes()]);
  };

  const updateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink || isPlayback) return;
    (selectedLink as any)[field] = val;
    vm.recalculateSimulation();
    setLinks([...vm.getLinks()]);
  };

  const handleAddNode = () => {
    if (isPlayback) return;
    const newId = `node-${Date.now()}`;
    const newNode: ContainerNode = {
      id: newId,
      name: `Container ${nodes.length + 1}`,
      type: 'stockpile',
      x: 300,
      y: 200,
      capacity: 40000,
      currentVolume: 10000,
      materialType: materials[0]?.code || 'CLAY',
      plantCount: 3,
      overflowMode: 'strict',
      strictSubRule: 'throttleback'
    };
    vm.addNode(newNode);
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([newId]);
    setSelectedLinkId(null);
  };

  const handleAddLinkBetweenSelected = () => {
    if (isPlayback || selectedNodeIds.length !== 2) return;
    const newLink: TransferLink = {
      id: `link-${Date.now()}`,
      sourceId: selectedNodeIds[0],
      targetId: selectedNodeIds[1],
      dailyRate: 1000,
      fleetCount: 3,
    };
    vm.addLink(newLink);
    setLinks([...vm.getLinks()]);
    setSelectedLinkId(newLink.id);
    setSelectedNodeIds([]);
  };

  const handleDeleteSelected = () => {
    if (isPlayback) return;
    if (selectedLinkId) {
      vm.removeLink(selectedLinkId);
      setSelectedLinkId(null);
    } else if (selectedNodeIds.length > 0) {
      selectedNodeIds.forEach(id => vm.removeNode(id));
      setSelectedNodeIds([]);
    }
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
  };

  const parseCSVLine = (text: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, ''));
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/);
      let section = '';
      const importedNodes: ContainerNode[] = [];
      const importedLinks: TransferLink[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# SECTION: INITIAL MODEL NODES')) { section = 'NODES'; continue; }
        else if (trimmed.startsWith('# SECTION: INITIAL MODEL LINKS')) { section = 'LINKS'; continue; }
        else if (trimmed.startsWith('# SECTION:') || trimmed.startsWith('#')) { section = 'OTHER'; continue; }

        if (!trimmed || trimmed.startsWith('NodeID') || trimmed.startsWith('LinkId')) continue;

        if (section === 'NODES') {
          const parts = parseCSVLine(trimmed);
          if (parts.length >= 9) {
            importedNodes.push({
              id: parts[0],
              name: parts[1],
              type: parts[2] as any,
              x: Number(parts[3]),
              y: Number(parts[4]),
              capacity: Number(parts[5]),
              currentVolume: Number(parts[6]),
              materialType: parts[7],
              plantCount: Number(parts[8]),
              overflowMode: 'strict',
              strictSubRule: 'throttleback'
            });
          }
        } else if (section === 'LINKS') {
          const parts = parseCSVLine(trimmed);
          if (parts.length >= 5) {
            importedLinks.push({
              id: parts[0],
              sourceId: parts[1],
              targetId: parts[2],
              dailyRate: Number(parts[3]),
              fleetCount: Number(parts[4])
            });
          }
        }
      }

      if (importedNodes.length > 0) {
        vm.loadModel(importedNodes, importedLinks);
        setNodes([...vm.getNodes()]);
        setLinks([...vm.getLinks()]);
        setSelectedNodeIds([]);
        setSelectedLinkId(null);
        alert(`Successfully imported model: ${importedNodes.length} nodes and ${importedLinks.length} links loaded into the live canvas!`);
      } else {
        alert('Could not find valid node data sections in the uploaded CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmExportCSV = () => {
    const nodesList = vm.getNodes();
    const linksList = vm.getLinks();
    let csvRows: string[] = [];

    csvRows.push('# SECTION: INITIAL MODEL NODES');
    csvRows.push('NodeID,Name,Type,X,Y,Capacity,InitialVolume,MaterialType,PlantCount');
    nodesList.forEach(n => {
      csvRows.push(`${n.id},"${n.name}",${n.type},${n.x},${n.y},${n.capacity},${n.currentVolume},"${n.materialType}",${n.plantCount}`);
    });

    csvRows.push('');
    csvRows.push('# SECTION: INITIAL MODEL LINKS');
    csvRows.push('LinkId,SourceId,TargetId,DailyRate,FleetCount');
    linksList.forEach(l => {
      csvRows.push(`${l.id},${l.sourceId},${l.targetId},${l.dailyRate},${l.fleetCount}`);
    });

    csvRows.push('');
    csvRows.push('# SECTION: SIMULATION TIMELINE TELEMETRY');
    csvRows.push('Day,EntityType,EntityId,EntityName,Value,CapacityOrDailyRate,Alerts');
    frames.forEach(frame => {
      const alertStr = `"${(frame.alerts || []).join(' | ')}"`;
      nodesList.forEach(node => {
        const vol = Math.round(frame.nodeVolumes[node.id] ?? node.currentVolume);
        csvRows.push(`${frame.day},Node,${node.id},"${node.name}",${vol},${node.capacity},${alertStr}`);
      });
      linksList.forEach(link => {
        const flow = Math.round(frame.linkFlows[link.id] ?? 0);
        csvRows.push(`${frame.day},Link,${link.id},"${link.sourceId}->${link.targetId}",${flow},${link.dailyRate},${alertStr}`);
      });
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFileName.endsWith('.csv') ? exportFileName : `${exportFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const canLink = selectedNodeIds.length === 2 && !isPlayback;
  const hasSelection = selectedNodeIds.length > 0 || selectedLinkId !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', maxHeight: '100vh', overflow: 'hidden', backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportCSVFile}
        accept=".csv"
        style={{ display: 'none' }}
      />

      <TopHeader
        isPlayback={isPlayback}
        onTogglePlayback={togglePlayback}
        fileInputRef={fileInputRef}
      />

      <BatchPresetBar
        onApplyPreset={(mode, subRule) => {
          vm.applyGlobalPreset(mode, subRule);
          setNodes([...vm.getNodes()]);
        }}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', position: 'relative', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <SimulationCanvas
            vm={vm}
            nodes={nodes}
            links={links}
            selectedNodeIds={selectedNodeIds}
            selectedLinkId={selectedLinkId}
            setSelectedNodeIds={setSelectedNodeIds}
            setSelectedLinkId={setSelectedLinkId}
            isPlayback={isPlayback}
            currentFrame={currentFrame}
            onNodesUpdated={() => setNodes([...vm.getNodes()])}
            onAddNode={handleAddNode}
            onAddLink={handleAddLinkBetweenSelected}
            onDeleteSelected={handleDeleteSelected}
            canLink={canLink}
            hasSelection={hasSelection}
          />

          <PlaybackGraph
            isPlayback={isPlayback}
            isGraphExpanded={isGraphExpanded}
            setIsGraphExpanded={setIsGraphExpanded}
            currentDay={currentDay}
            onSliderChange={handleSliderChange}
            nodes={nodes}
            frames={frames}
            currentFrame={currentFrame}
          />
        </div>

        <PropertyInspector
          vm={vm}
          isPlayback={isPlayback}
          currentDay={currentDay}
          currentFrame={currentFrame}
          selectedNodeIds={selectedNodeIds}
          singleSelectedNode={singleSelectedNode}
          selectedLink={selectedLink}
          hasSelection={hasSelection}
          materials={materials}
          onUpdateSingleNode={updateSingleNode}
          onUpdateLink={updateLink}
          onMaterialsUpdated={() => setMaterials([...vm.getMaterials()])}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />
      </div>

      {isExportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', width: '460px', padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>📥 Export Complete Model + Sim CSV</div>
              <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>
              <div>
                Exports a robust, clean CSV containing both the <strong>Initial Model Configuration</strong> and the <strong>30-Day Simulation Timeline Telemetry</strong>.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600, color: '#94a3b8' }}>Save As Filename</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={e => setExportFileName(e.target.value)}
                  style={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#f8fafc', padding: '10px', fontSize: '12px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmExportCSV}
                style={{ backgroundColor: '#22c55e', color: '#0f172a', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}