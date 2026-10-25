import { useState, useRef } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { TopHeader } from './components/header/TopHeader';
import { BatchPresetBar } from './components/header/BatchPresetBar';
import { SimulationCanvas } from './components/canvas/SimulationCanvas';
import { PlaybackGraph } from './components/timeline/PlaybackGraph';
import { PropertyInspector } from './components/inspector/PropertyInspector';
import { ContainerNode, TransferLink, OverflowMode, StrictSubRule } from './models/types';

export default function App() {
  const [vm] = useState(() => new CanvasViewModel());
  const [nodes, setNodes] = useState(vm.getNodes());
  const [links, setLinks] = useState(vm.getLinks());
  const [materials, setMaterials] = useState(vm.getMaterials());
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['node-1']);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isPlayback, setIsPlayback] = useState<boolean>(false);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentFrame = vm.getCurrentFrame();
  const frames = vm.getFrames();

  const togglePlayback = () => {
    const nextState = !isPlayback;
    setIsPlayback(nextState);
    vm.setPlayback(nextState);
    setNodes([...vm.getNodes()]);
  };

  const handleApplyPreset = (mode: OverflowMode, subRule?: StrictSubRule) => {
    nodes.forEach(n => {
      n.overflowMode = mode;
      if (subRule) n.strictSubRule = subRule;
    });
    vm.recalculateSimulation();
    setNodes([...vm.getNodes()]);
  };

  const handleAddNode = () => {
    const newNode: ContainerNode = {
      id: `node-${Date.now()}`,
      name: `New Container ${nodes.length + 1}`,
      type: 'stockpile',
      x: 300,
      y: 200,
      capacity: 25000,
      currentVolume: 10000,
      materialType: materials[0]?.code || 'TYPE1',
      plantCount: 2,
      overflowMode: 'strict',
      strictSubRule: 'throttleback'
    };
    vm.addNode(newNode);
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([newNode.id]);
  };

  const handleAddLink = () => {
    if (selectedNodeIds.length < 2) return;
    const newLink: TransferLink = {
      id: `link-${Date.now()}`,
      sourceId: selectedNodeIds[0],
      targetId: selectedNodeIds[1],
      dailyRate: 1000,
      fleetCount: 3
    };
    vm.addLink(newLink);
    setLinks([...vm.getLinks()]);
    setSelectedLinkId(newLink.id);
  };

  const handleDeleteSelected = () => {
    selectedNodeIds.forEach(id => vm.removeNode(id));
    if (selectedLinkId) vm.removeLink(selectedLinkId);
    setNodes([...vm.getNodes()]);
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([]);
    setSelectedLinkId(null);
  };

  const handleNodesUpdated = () => {
    setNodes([...vm.getNodes()]);
  };

const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        
        let parsedNodes: ContainerNode[] = [];
        let parsedLinks: TransferLink[] = [];
        let currentSection = '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('# SECTION: INITIAL MODEL NODES')) {
            currentSection = 'NODES';
            continue;
          } else if (trimmed.startsWith('# SECTION: INITIAL MODEL LINKS')) {
            currentSection = 'LINKS';
            continue;
          } else if (trimmed.startsWith('#')) {
            continue;
          }

          if (trimmed.startsWith('NodeID,') || trimmed.startsWith('LinkId,')) {
            continue; // Header row
          }

          if (currentSection === 'NODES') {
            // Format: NodeID,Name,Type,X,Y,Capacity,InitialVolume,MaterialType,PlantCount
            const parts = trimmed.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 9) {
              parsedNodes.push({
                id: parts[0].trim(),
                name: parts[1].replace(/^"|"$/g, '').trim(),
                type: parts[2].trim() as any,
                x: parseFloat(parts[3]) || 100,
                y: parseFloat(parts[4]) || 100,
                capacity: parseFloat(parts[5]) || 50000,
                currentVolume: parseFloat(parts[6]) || 10000,
                materialType: parts[7].replace(/^"|"$/g, '').trim(),
                plantCount: parseInt(parts[8], 10) || 2,
                overflowMode: 'strict',
                strictSubRule: 'throttleback'
              });
            }
          } else if (currentSection === 'LINKS') {
            // Format: LinkId,SourceId,TargetId,DailyRate,FleetCount
            const parts = trimmed.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 5) {
              parsedLinks.push({
                id: parts[0].trim(),
                sourceId: parts[1].trim(),
                targetId: parts[2].trim(),
                dailyRate: parseFloat(parts[3]) || 1000,
                fleetCount: parseInt(parts[4], 10) || 2
              });
            }
          }
        }

        if (parsedNodes.length > 0) {
          vm.loadModel(parsedNodes, parsedLinks);
          setNodes([...vm.getNodes()]);
          setLinks([...vm.getLinks()]);
          setSelectedNodeIds([parsedNodes[0].id]);
          setSelectedLinkId(null);
          alert(`Successfully imported ${parsedNodes.length} nodes and ${parsedLinks.length} links!`);
        } else {
          alert('No valid nodes found in CSV file.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV file format.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so re-importing the same file triggers onChange
    e.target.value = '';
  };
  const singleSelectedNode = nodes.find(n => selectedNodeIds.includes(n.id));
  const selectedLink = links.find(l => l.id === selectedLinkId);
  const hasSelection = selectedNodeIds.length > 0 || selectedLinkId !== null;

  const handleUpdateSingleNode = (field: keyof ContainerNode, val: any) => {
    if (!singleSelectedNode || isPlayback) return;
    (singleSelectedNode as any)[field] = val;
    vm.recalculateSimulation();
    setNodes([...vm.getNodes()]);
  };

  const handleUpdateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink || isPlayback) return;
    (selectedLink as any)[field] = val;
    vm.recalculateSimulation();
    setLinks([...vm.getLinks()]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0f172a' }}>
      {/* Hidden file input referenced by TopHeader */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".csv" 
        onChange={handleImportCSVFile} 
      />

      <TopHeader 
        fileInputRef={fileInputRef}
        isPlayback={isPlayback}
        onTogglePlayback={togglePlayback}
      />
      
      <BatchPresetBar onApplyPreset={handleApplyPreset} />

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
            isGraphExpanded={isGraphExpanded}
            onNodesUpdated={handleNodesUpdated}
            onAddNode={handleAddNode}
            onAddLink={handleAddLink}
            onDeleteSelected={handleDeleteSelected}
            canLink={selectedNodeIds.length >= 2}
            hasSelection={hasSelection}
          />

          <PlaybackGraph 
            nodes={nodes}
            frames={frames}
            currentDay={currentDay}
            isGraphExpanded={isGraphExpanded}
            setIsGraphExpanded={setIsGraphExpanded}
            setCurrentDay={setCurrentDay}
            vm={vm}
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
          onUpdateSingleNode={handleUpdateSingleNode}
          onUpdateLink={handleUpdateLink}
          onMaterialsUpdated={() => setMaterials([...vm.getMaterials()])}
          onOpenExportModal={() => alert('CSV Export dialog triggered')}
        />
      </div>
    </div>
  );
}