import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  ConnectionLineType,
  EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore, NodeData, NodeType } from '@/store/flowStore';
import { nodeTypes } from './nodes';
import { ValidatedEdge } from './edges/ValidatedEdge';
import { validateConnection } from '@/lib/connectionValidation';
import { toast } from 'sonner';

interface FlowCanvasProps {
  showToolbar?: boolean;
  onExecuteFlow?: () => void;
}

const edgeTypes: EdgeTypes = {
  validated: ValidatedEdge,
};

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

  // Create validated edges with source/target type info
  const validatedEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      
      const isAnimated = 
        (sourceNode?.data.isProcessing || sourceNode?.data.isComplete) &&
        !targetNode?.data.isComplete;

      return {
        ...edge,
        type: 'validated',
        data: {
          sourceType: sourceNode?.data.type as NodeType | undefined,
          targetType: targetNode?.data.type as NodeType | undefined,
          isAnimated,
        },
      };
    });
  }, [edges, nodes]);

  // Validate connection before allowing it
  const handleConnect = useCallback((connection: any) => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (sourceNode && targetNode) {
      const validation = validateConnection(
        sourceNode.data.type as NodeType,
        targetNode.data.type as NodeType
      );

      if (!validation.isValid) {
        toast.error(validation.message || 'Invalid connection');
        return;
      }

      if (validation.validity === 'warning') {
        toast.warning(validation.message || 'Connection may not be optimal');
      }
    }

    onConnect(connection);
  }, [nodes, onConnect]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={validatedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes as NodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'validated',
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
      
      {/* Connection Legend */}
      <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Connection Types</p>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-[hsl(var(--edge-valid))]" />
          <span className="text-muted-foreground">Valid</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-[hsl(var(--edge-rag))]" />
          <span className="text-muted-foreground">RAG Pipeline</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-[hsl(var(--edge-warning))] border-dashed" style={{ borderTop: '2px dashed' }} />
          <span className="text-muted-foreground">Warning</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-4 h-0.5 bg-[hsl(var(--edge-invalid))]" style={{ borderTop: '2px dotted' }} />
          <span className="text-muted-foreground">Invalid</span>
        </div>
      </div>
    </div>
  );
};

export { FlowCanvas as default };
