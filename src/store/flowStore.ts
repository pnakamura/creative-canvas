import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';

export type NodeType = 'text' | 'assistant' | 'imageGenerator' | 'videoGenerator' | 'reference';
export type NodeCategory = 'source' | 'processor' | 'generator';

export interface NodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  category?: NodeCategory;
  content?: string;
  prompt?: string;
  imageUrl?: string;
  videoUrl?: string;
  isProcessing?: boolean;
  isComplete?: boolean;
  error?: string;
  // Reference node specific
  assetUrl?: string;
  assetType?: 'image' | 'pdf' | 'text' | 'link';
  fileName?: string;
  extractedText?: string;
  settings?: {
    seed?: number;
    aspectRatio?: string;
    guidanceScale?: number;
    steps?: number;
  };
}

export type FlowNode = Node<NodeData>;

interface FlowState {
  nodes: FlowNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  isExecuting: boolean;
  
  // Actions
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setSelectedNode: (nodeId: string | null) => void;
  deleteNode: (nodeId: string) => void;
  setExecuting: (isExecuting: boolean) => void;
  getConnectedNodes: (nodeId: string) => { inputs: FlowNode[]; outputs: FlowNode[] };
}

const getNodeLabel = (type: NodeType): string => {
  switch (type) {
    case 'text': return 'Text Input';
    case 'assistant': return 'AI Assistant';
    case 'imageGenerator': return 'Image Generator';
    case 'videoGenerator': return 'Video Generator';
    case 'reference': return 'Reference';
    default: return 'Node';
  }
};

const getNodeCategory = (type: NodeType): NodeCategory => {
  switch (type) {
    case 'text':
    case 'reference':
      return 'source';
    case 'assistant':
      return 'processor';
    case 'imageGenerator':
    case 'videoGenerator':
      return 'generator';
    default:
      return 'source';
  }
};

const initialNodes: FlowNode[] = [
  {
    id: 'text-1',
    type: 'textNode',
    position: { x: 100, y: 200 },
    data: {
      label: 'Text Input',
      type: 'text',
      category: 'source',
      content: '',
    },
  },
  {
    id: 'assistant-1',
    type: 'assistantNode',
    position: { x: 450, y: 200 },
    data: {
      label: 'AI Assistant',
      type: 'assistant',
      category: 'processor',
      prompt: '',
    },
  },
  {
    id: 'image-1',
    type: 'imageGeneratorNode',
    position: { x: 800, y: 200 },
    data: {
      label: 'Image Generator',
      type: 'imageGenerator',
      category: 'generator',
      settings: {
        aspectRatio: '1:1',
        guidanceScale: 7.5,
        steps: 30,
      },
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'text-1',
    target: 'assistant-1',
    animated: false,
  },
  {
    id: 'e2-3',
    source: 'assistant-1',
    target: 'image-1',
    animated: false,
  },
];

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  isExecuting: false,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const sourceNode = get().nodes.find((n) => n.id === connection.source);
    const targetNode = get().nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // Image output can only connect to video input
    if (sourceNode.data.type === 'imageGenerator' && targetNode.data.type !== 'videoGenerator') {
      console.warn('Image output can only connect to Video Generator');
      return;
    }

    // Video generator can only receive image input
    if (targetNode.data.type === 'videoGenerator' && sourceNode.data.type !== 'imageGenerator') {
      console.warn('Video Generator can only receive image input');
      return;
    }

    // Reference node can connect to assistant (context) or image generator (image-to-image)
    if (sourceNode.data.type === 'reference') {
      const validTargets = ['assistant', 'imageGenerator'];
      if (!validTargets.includes(targetNode.data.type)) {
        console.warn('Reference can only connect to Assistant or Image Generator');
        return;
      }
    }

    set({
      edges: addEdge(connection, get().edges),
    });
  },

  addNode: (type, position) => {
    const nodeTypeMap: Record<NodeType, string> = {
      text: 'textNode',
      assistant: 'assistantNode',
      imageGenerator: 'imageGeneratorNode',
      videoGenerator: 'videoGeneratorNode',
      reference: 'referenceNode',
    };

    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type: nodeTypeMap[type],
      position,
      data: {
        label: getNodeLabel(type),
        type,
        category: getNodeCategory(type),
        settings: type === 'imageGenerator' ? {
          aspectRatio: '1:1',
          guidanceScale: 7.5,
          steps: 30,
        } : undefined,
      },
    };

    set({
      nodes: [...get().nodes, newNode],
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  setExecuting: (isExecuting) => set({ isExecuting }),

  getConnectedNodes: (nodeId) => {
    const edges = get().edges;
    const nodes = get().nodes;

    const inputEdges = edges.filter((e) => e.target === nodeId);
    const outputEdges = edges.filter((e) => e.source === nodeId);

    const inputs = inputEdges
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean) as FlowNode[];

    const outputs = outputEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter(Boolean) as FlowNode[];

    return { inputs, outputs };
  },
}));
