import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, NodeData } from '@/store/flowStore';
import { nodeTypes } from './nodes';
import { Toolbar } from './Toolbar';
import { PropertiesSidebar } from './PropertiesSidebar';
import { toast } from 'sonner';

export const FlowCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    selectedNodeId,
    setExecuting,
    updateNodeData,
    getConnectedNodes,
  } = useFlowStore();

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const executeFlow = useCallback(async () => {
    setExecuting(true);
    toast.info('Starting flow execution...');

    // Find root nodes (nodes with no inputs)
    const rootNodes = nodes.filter((node) => {
      const { inputs } = getConnectedNodes(node.id);
      return inputs.length === 0;
    });

    // Simple sequential execution
    const processNode = async (nodeId: string, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Mark node as processing
      updateNodeData(nodeId, { isProcessing: true });

      // Wait a bit to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mark as complete
      updateNodeData(nodeId, { isProcessing: false, isComplete: true });

      // Process connected output nodes
      const { outputs } = getConnectedNodes(nodeId);
      for (const outputNode of outputs) {
        await processNode(outputNode.id, visited);
      }
    };

    const visited = new Set<string>();
    for (const rootNode of rootNodes) {
      await processNode(rootNode.id, visited);
    }

    setExecuting(false);
    toast.success('Flow execution complete!');
  }, [nodes, getConnectedNodes, updateNodeData, setExecuting]);

  // Animate edges when data is flowing
  const animatedEdges = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    
    const isAnimated = 
      (sourceNode?.data.isProcessing || sourceNode?.data.isComplete) &&
      !targetNode?.data.isComplete;

    return {
      ...edge,
      animated: isAnimated,
    };
  });

  return (
    <div className="w-full h-screen relative">
      <Toolbar onExecuteFlow={executeFlow} />
      
      <ReactFlow
        nodes={nodes}
        edges={animatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes as NodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--grid-color))"
        />
        <Controls className="glass-panel" />
        <MiniMap
          className="glass-panel"
          nodeColor={(node) => {
            const data = node.data as NodeData;
            switch (data?.type) {
              case 'text': return 'hsl(var(--handle-text))';
              case 'assistant': return 'hsl(var(--secondary))';
              case 'imageGenerator': return 'hsl(var(--handle-image))';
              case 'videoGenerator': return 'hsl(var(--accent))';
              default: return 'hsl(var(--muted))';
            }
          }}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>

      {selectedNodeId && <PropertiesSidebar />}
    </div>
  );
};
