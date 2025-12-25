import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, NodeData } from '@/store/flowStore';
import { nodeTypes } from './nodes';
import { toast } from 'sonner';

interface FlowCanvasProps {
  showToolbar?: boolean;
  onExecuteFlow?: () => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ showToolbar = false, onExecuteFlow }) => {
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
      type: 'smoothstep',
    };
  });

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={animatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes as NodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
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
            switch (data?.category) {
              case 'source': return 'hsl(var(--node-source))';
              case 'processor': return 'hsl(var(--node-processor))';
              case 'generator': return 'hsl(var(--node-generator))';
              default: return 'hsl(var(--muted))';
            }
          }}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
};

export { FlowCanvas as default };
