import { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasViewModel } from './viewmodel/CanvasViewModel';
import { TopHeader } from './components/header/TopHeader';
import { BatchPresetBar } from './components/header/BatchPresetBar';
import { SimulationCanvas } from './components/canvas/SimulationCanvas';
import { PlaybackGraph } from './components/timeline/PlaybackGraph';
import { PropertyInspector } from './components/inspector/PropertyInspector';
import { ExportModal } from './components/modal/ExportModal';
import { RuleConfirmModal } from './components/modal/RuleConfirmModal';
import { ManualModal } from './components/modal/ManualModal';
import { ContainerNode, TransferLink, OverflowMode, StrictSubRule, MaterialDefinition, ClipboardData, ContainerProperties, LinkProperties } from './models/types';

export default function App() {
  const [vm] = useState(() => new CanvasViewModel());
  const [nodes, setNodes] = useState(vm.getNodes());
  const [links, setLinks] = useState(vm.getLinks());
  const [materials, setMaterials] = useState(vm.getMaterials());
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(['node-1']);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [isPlayback, setIsPlayback] = useState<boolean>(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [isGraphExpanded, setIsGraphExpanded] = useState<boolean>(false);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentFrame = vm.getCurrentFrame();
  const frames = vm.getFrames();

  const togglePlayback = () => {
    const nextState = !isPlayback;
    setIsPlayback(nextState);
    vm.setPlayback(nextState);
    if (nextState) {
      // Upon playback mode, reset timeline to day 0
      setCurrentDay(0);
      vm.setFrameIndex(0);
      // When playback mode starts, deselect any containers or transfers
      setSelectedNodeIds([]);
      setSelectedLinkId(null);
      setHighlightedNodeIds([]);
    } else {
      setHighlightedNodeIds([]);
    }
    setNodes([...vm.getNodes()]);
  };

  const [pendingRule, setPendingRule] = useState<{
    mode: OverflowMode;
    subRule?: StrictSubRule;
    name: string;
    shape: 'circle' | 'diamond' | 'square';
  } | null>(null);

  const getRuleMeta = (mode: OverflowMode, subRule?: StrictSubRule): { name: string; shape: 'circle' | 'diamond' | 'square' } => {
    if (mode === 'overfill') return { name: 'Overfill', shape: 'square' };
    if (subRule === 'headroom_hold') return { name: 'Headroom Hold', shape: 'diamond' };
    return { name: 'Throttleback', shape: 'circle' };
  };

  const handleApplyPreset = (mode: OverflowMode, subRule?: StrictSubRule) => {
    const meta = getRuleMeta(mode, subRule);

    if (selectedNodeIds.length > 0) {
      vm.updateNodes(
        (n) => selectedNodeIds.includes(n.id),
        { overflowMode: mode, ...(subRule ? { strictSubRule: subRule } : {}) }
      );
      setNodes(vm.getNodes().map(n => ({ ...n })));
      showToast(`Applied ${meta.name} to ${selectedNodeIds.length} selected container${selectedNodeIds.length > 1 ? 's' : ''}.`, 'success');
    } else {
      setPendingRule({ mode, subRule, name: meta.name, shape: meta.shape });
    }
  };

  const confirmApplyRuleToAll = () => {
    if (!pendingRule) return;
    vm.updateNodes(
      () => true,
      { overflowMode: pendingRule.mode, ...(pendingRule.subRule ? { strictSubRule: pendingRule.subRule } : {}) }
    );
    setNodes(vm.getNodes().map(n => ({ ...n })));
    showToast(`Applied ${pendingRule.name} across all ${nodes.length} containers.`, 'success');
    setPendingRule(null);
  };

  const handleAddNode = () => {
    const isSingleContainerSelected = selectedNodeIds.length === 1;
    const sourceNode = isSingleContainerSelected ? nodes.find(n => n.id === selectedNodeIds[0]) : null;

    const newId = `node-${Date.now()}`;
    const newName = `New Container ${nodes.length + 1}`;

    const newNode: ContainerNode = sourceNode
      ? {
          id: newId,
          name: newName,
          type: sourceNode.type,
          x: sourceNode.x + 50,
          y: sourceNode.y + 50,
          capacity: sourceNode.capacity,
          currentVolume: sourceNode.currentVolume,
          materialType: sourceNode.materialType,
          plantCount: sourceNode.plantCount,
          overflowMode: sourceNode.overflowMode,
          strictSubRule: sourceNode.strictSubRule,
          headroomThreshold: sourceNode.headroomThreshold,
          status: sourceNode.status,
          allowedMaterials: sourceNode.allowedMaterials ? [...sourceNode.allowedMaterials] : undefined,
          notes: sourceNode.notes
        }
      : {
          id: newId,
          name: newName,
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
    setNodes(vm.getNodes().map(n => ({ ...n })));
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([newNode.id]);
    setSelectedLinkId(null);

    if (sourceNode) {
      showToast(`Created "${newName}" copying properties from "${sourceNode.name}"`, 'success');
    } else {
      showToast(`Created new container "${newName}"`, 'success');
    }
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
    setNodes(vm.getNodes().map(n => ({ ...n })));
    setLinks([...vm.getLinks()]);
    setSelectedNodeIds([]);
    setSelectedLinkId(null);
  };

  const handleNodesUpdated = () => {
    setNodes(vm.getNodes().map(n => ({ ...n })));
  };

  const handleImportCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawLines = text.split(/\r?\n/);
        // Handle multiline quoted fields in CSV properly
        const lines: string[] = [];
        let buffer = '';
        for (const rawLine of rawLines) {
          if (buffer) {
            buffer += '\n' + rawLine;
          } else {
            buffer = rawLine;
          }
          const quoteCount = (buffer.match(/"/g) || []).length;
          if (quoteCount % 2 === 0) {
            lines.push(buffer);
            buffer = '';
          }
        }
        if (buffer) lines.push(buffer);
        
        const parsedMaterials: MaterialDefinition[] = [];
        const parsedNodes: ContainerNode[] = [];
        const parsedLinks: TransferLink[] = [];
        let currentSection = '';
        let nodeHeaderCols: string[] = [];
        let linkHeaderCols: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('# SECTION: MATERIALS') || trimmed.startsWith('# SECTION: MATERIAL DEFINITIONS')) {
            currentSection = 'MATERIALS';
            continue;
          } else if (trimmed.startsWith('# SECTION: INITIAL MODEL NODES') || trimmed.startsWith('# SECTION: NODES')) {
            currentSection = 'NODES';
            nodeHeaderCols = [];
            continue;
          } else if (trimmed.startsWith('# SECTION: INITIAL MODEL LINKS') || trimmed.startsWith('# SECTION: LINKS')) {
            currentSection = 'LINKS';
            linkHeaderCols = [];
            continue;
          } else if (trimmed.startsWith('#')) {
            continue;
          }

          if (trimmed.toLowerCase().startsWith('nodeid,')) {
            nodeHeaderCols = trimmed.split(',').map(c => c.trim().toLowerCase().replace(/^"|"$/g, ''));
            continue; // Header row
          }
          if (trimmed.toLowerCase().startsWith('linkid,')) {
            linkHeaderCols = trimmed.split(',').map(c => c.trim().toLowerCase().replace(/^"|"$/g, ''));
            continue; // Header row
          }
          if (
            trimmed.toLowerCase().startsWith('code,') ||
            trimmed.toLowerCase().startsWith('day,')
          ) {
            continue; // Header row
          }

          if (currentSection === 'MATERIALS') {
            // Format: Code,Name,BulkIN,BulkOUT
            const parts = trimmed.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 4) {
              const code = parts[0].replace(/^"|"$/g, '').trim().toUpperCase();
              const name = parts[1].replace(/^"|"$/g, '').trim();
              const bulkIN = parseFloat(parts[2]) || 1.0;
              const bulkOUT = parseFloat(parts[3]) || 1.0;
              if (code) {
                parsedMaterials.push({ code, name, bulkIN, bulkOUT });
              }
            }
          } else if (currentSection === 'NODES') {
            // Format: NodeID,Name,Type,X,Y,Capacity,InitialVolume,MaterialType,PlantCount,[OverflowMode],[StrictSubRule],[HeadroomThreshold],[Status],...,[Notes]
            const parts = trimmed.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 8) {
              const rawType = parts[2]?.trim().toLowerCase();
              const validTypes: ContainerNode['type'][] = ['excavation', 'stockpile', 'null', 'external'];
              const type = validTypes.includes(rawType as any) ? (rawType as ContainerNode['type']) : 'stockpile';

              const rawOverflow = parts[9]?.replace(/^"|"$/g, '').trim().toLowerCase();
              const overflowMode: OverflowMode = rawOverflow === 'overfill' ? 'overfill' : 'strict';

              const rawSubRule = parts[10]?.replace(/^"|"$/g, '').trim().toLowerCase();
              const strictSubRule: StrictSubRule = rawSubRule === 'headroom_hold' ? 'headroom_hold' : 'throttleback';

              const rawHeadroom = parts[11]?.trim();
              const headroomThreshold = rawHeadroom ? parseFloat(rawHeadroom) : 500;

              const rawStatus = parts[12]?.replace(/^"|"$/g, '').trim().toLowerCase();
              const status: ContainerNode['status'] = (rawStatus === 'maintenance' || rawStatus === 'blocked') ? rawStatus : 'active';

              // Extract notes: dynamic header column index or column 16 (or column 13)
              let notes: string | undefined = undefined;
              const notesIdx = nodeHeaderCols.indexOf('notes');
              if (notesIdx !== -1 && parts[notesIdx] !== undefined) {
                notes = parts[notesIdx].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              } else if (parts[16] !== undefined) {
                notes = parts[16].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              } else if (parts.length === 14 && !nodeHeaderCols.includes('initialsimstate')) {
                notes = parts[13].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              }

              parsedNodes.push({
                id: parts[0].trim(),
                name: parts[1].replace(/^"|"$/g, '').trim(),
                type,
                x: parseFloat(parts[3]) || 100,
                y: parseFloat(parts[4]) || 100,
                capacity: parseFloat(parts[5]) || 50000,
                currentVolume: parseFloat(parts[6]) || 0,
                materialType: parts[7].replace(/^"|"$/g, '').trim().toUpperCase() || 'CLAY',
                plantCount: parseInt(parts[8], 10) || 1,
                overflowMode,
                strictSubRule,
                headroomThreshold: isNaN(headroomThreshold) ? 500 : headroomThreshold,
                status,
                notes: notes || undefined
              });
            }
          } else if (currentSection === 'LINKS') {
            // Format: LinkId,SourceId,TargetId,DailyRate,FleetCount,[Priority],[MaterialId],...,[Notes]
            const parts = trimmed.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (parts.length >= 5) {
              const priority = parts[5] ? parseInt(parts[5], 10) : 1;
              const materialId = parts[6] ? parts[6].replace(/^"|"$/g, '').trim() : undefined;

              // Extract notes: dynamic header column index or column 10
              let notes: string | undefined = undefined;
              const linkNotesIdx = linkHeaderCols.indexOf('notes');
              if (linkNotesIdx !== -1 && parts[linkNotesIdx] !== undefined) {
                notes = parts[linkNotesIdx].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              } else if (parts[10] !== undefined) {
                notes = parts[10].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              } else if (parts.length === 8 && !linkHeaderCols.includes('initialsimstate')) {
                notes = parts[7].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
              }

              parsedLinks.push({
                id: parts[0].trim(),
                sourceId: parts[1].trim(),
                targetId: parts[2].trim(),
                dailyRate: parseFloat(parts[3]) || 1000,
                fleetCount: parseInt(parts[4], 10) || 1,
                priority: isNaN(priority) ? 1 : priority,
                materialId: materialId || undefined,
                notes: notes || undefined
              });
            }
          }
        }

        if (parsedNodes.length > 0) {
          vm.loadModel(parsedNodes, parsedLinks, parsedMaterials.length > 0 ? parsedMaterials : undefined);
          // When a new model is loaded, reset timeline to day 0
          vm.setFrameIndex(0);
          setCurrentDay(0);
          setIsPlayback(false);
          vm.setPlayback(false);

          setNodes([...vm.getNodes()]);
          setLinks([...vm.getLinks()]);
          setMaterials([...vm.getMaterials()]);
          setSelectedNodeIds([parsedNodes[0].id]);
          setSelectedLinkId(null);

          const matSummary = parsedMaterials.length > 0 ? `, ${parsedMaterials.length} materials (with bulking factors)` : '';
          showToast(`Successfully imported ${parsedNodes.length} nodes, ${parsedLinks.length} links${matSummary}!`, 'success');
        } else {
          showToast('No valid nodes found in CSV file.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to parse CSV file format.', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input value so re-importing the same file triggers onChange
    e.target.value = '';
  };
  const singleSelectedNode = nodes.find(n => selectedNodeIds.includes(n.id));
  const selectedLink = links.find(l => l.id === selectedLinkId);
  const hasSelection = selectedNodeIds.length > 0 || selectedLinkId !== null;

  const selectedKind: 'container' | 'link' | 'none' = 
    selectedNodeIds.length > 0 ? 'container' :
    selectedLinkId !== null ? 'link' :
    'none';

  const isClipboardInUse = clipboard !== null;
  const isWrongKind = isClipboardInUse && selectedKind !== 'none' && selectedKind !== clipboard.type;

  const handleCopy = useCallback(() => {
    if (isPlayback) return;
    if (selectedKind === 'none') {
      showToast('Select a container or transfer link to copy properties.', 'error');
      return;
    }
    if (isClipboardInUse && isWrongKind) {
      showToast(
        `Copy disabled: Clipboard contains ${clipboard.type === 'container' ? 'Container' : 'Transfer Link'} properties. Clear clipboard or select a matching element.`,
        'error'
      );
      return;
    }

    if (selectedKind === 'container') {
      const targetNode = nodes.find(n => selectedNodeIds.includes(n.id));
      if (!targetNode) return;

      const properties: ContainerProperties = {
        type: targetNode.type,
        capacity: targetNode.capacity,
        currentVolume: targetNode.currentVolume,
        materialType: targetNode.materialType,
        plantCount: targetNode.plantCount,
        overflowMode: targetNode.overflowMode,
        strictSubRule: targetNode.strictSubRule,
        headroomThreshold: targetNode.headroomThreshold,
        status: targetNode.status,
        allowedMaterials: targetNode.allowedMaterials ? [...targetNode.allowedMaterials] : undefined,
        notes: targetNode.notes
      };

      setClipboard({
        type: 'container',
        sourceName: targetNode.name,
        properties
      });
      showToast(`Copied properties from container "${targetNode.name}"`, 'success');
    } else if (selectedKind === 'link' && selectedLinkId) {
      const link = links.find(l => l.id === selectedLinkId);
      if (!link) return;

      const properties: LinkProperties = {
        dailyRate: link.dailyRate,
        fleetCount: link.fleetCount,
        materialId: link.materialId,
        priority: link.priority,
        rateSchedule: link.rateSchedule ? [...link.rateSchedule] : undefined,
        notes: link.notes
      };

      const src = nodes.find(n => n.id === link.sourceId);
      const tgt = nodes.find(n => n.id === link.targetId);
      const linkLabel = `${src?.name || 'Source'} → ${tgt?.name || 'Target'}`;

      setClipboard({
        type: 'link',
        sourceName: linkLabel,
        properties
      });
      showToast(`Copied properties from link "${linkLabel}"`, 'success');
    }
  }, [isPlayback, selectedKind, isClipboardInUse, isWrongKind, clipboard, nodes, links, selectedNodeIds, selectedLinkId]);

  const handlePaste = useCallback(() => {
    if (isPlayback) return;
    if (!clipboard) {
      showToast('Clipboard is empty. Select an element and press Ctrl+C to copy properties.', 'error');
      return;
    }
    if (selectedKind === 'none') {
      showToast(`Select target ${clipboard.type === 'container' ? 'container(s)' : 'transfer link'} to paste properties.`, 'error');
      return;
    }
    if (isWrongKind) {
      showToast(
        `Cannot paste: Clipboard contains ${clipboard.type === 'container' ? 'Container' : 'Transfer Link'} properties, but selected element is a ${selectedKind === 'container' ? 'Container' : 'Transfer Link'}.`,
        'error'
      );
      return;
    }

    if (clipboard.type === 'container') {
      const updateData: Partial<ContainerNode> = {
        type: clipboard.properties.type,
        capacity: clipboard.properties.capacity,
        currentVolume: clipboard.properties.currentVolume,
        materialType: clipboard.properties.materialType,
        plantCount: clipboard.properties.plantCount,
        overflowMode: clipboard.properties.overflowMode,
        strictSubRule: clipboard.properties.strictSubRule,
        headroomThreshold: clipboard.properties.headroomThreshold,
        status: clipboard.properties.status,
        ...(clipboard.properties.allowedMaterials ? { allowedMaterials: [...clipboard.properties.allowedMaterials] } : {}),
        notes: clipboard.properties.notes
      };

      vm.updateNodes(n => selectedNodeIds.includes(n.id), updateData);
      setNodes(vm.getNodes().map(n => ({ ...n })));
      const count = selectedNodeIds.length;
      showToast(`Pasted properties into ${count} container${count > 1 ? 's' : ''}`, 'success');
    } else if (clipboard.type === 'link' && selectedLinkId) {
      const updateData: Partial<TransferLink> = {
        dailyRate: clipboard.properties.dailyRate,
        fleetCount: clipboard.properties.fleetCount,
        materialId: clipboard.properties.materialId,
        priority: clipboard.properties.priority,
        rateSchedule: clipboard.properties.rateSchedule ? [...clipboard.properties.rateSchedule] : undefined,
        notes: clipboard.properties.notes
      };

      vm.updateLink(selectedLinkId, updateData);
      setLinks([...vm.getLinks()]);
      const link = vm.getLinks().find(l => l.id === selectedLinkId);
      const src = nodes.find(n => n.id === link?.sourceId);
      const tgt = nodes.find(n => n.id === link?.targetId);
      const linkLabel = `${src?.name || 'Source'} → ${tgt?.name || 'Target'}`;
      showToast(`Pasted properties into link "${linkLabel}"`, 'success');
    }
  }, [isPlayback, clipboard, selectedKind, isWrongKind, selectedNodeIds, selectedLinkId, vm, nodes]);

  const handleClearClipboard = useCallback(() => {
    setClipboard(null);
    showToast('Clipboard cleared.', 'success');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (key === 'v') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCopy, handlePaste]);

  const handleUpdateSingleNode = (field: keyof ContainerNode, val: any) => {
    if (!singleSelectedNode || isPlayback) return;
    vm.updateNode(singleSelectedNode.id, { [field]: val });
    setNodes(vm.getNodes().map(n => ({ ...n })));
  };

  const handleUpdateLink = (field: keyof TransferLink, val: any) => {
    if (!selectedLink || isPlayback) return;
    vm.updateLink(selectedLink.id, { [field]: val });
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
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenManualModal={() => setIsManualModalOpen(true)}
      />
      
      <BatchPresetBar onApplyPreset={handleApplyPreset} selectedCount={selectedNodeIds.length} />

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
            highlightedNodeIds={highlightedNodeIds}
            setHighlightedNodeIds={setHighlightedNodeIds}
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
            highlightedNodeIds={highlightedNodeIds}
            setHighlightedNodeIds={setHighlightedNodeIds}
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
          clipboard={clipboard}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onClearClipboard={handleClearClipboard}
          onUpdateSingleNode={handleUpdateSingleNode}
          onUpdateLink={handleUpdateLink}
          onMaterialsUpdated={() => setMaterials([...vm.getMaterials()])}
        />
      </div>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        nodes={nodes}
        links={links}
        frames={frames}
        materials={materials}
      />

      <ManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <RuleConfirmModal
        isOpen={pendingRule !== null}
        onClose={() => setPendingRule(null)}
        onConfirm={confirmApplyRuleToAll}
        ruleName={pendingRule?.name || ''}
        ruleShape={pendingRule?.shape || 'circle'}
        containerCount={nodes.length}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#16a34a',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}