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

export type NodeType = 
  | 'text' 
  | 'assistant' 
  | 'imageGenerator' 
  | 'videoGenerator' 
  | 'reference' 
  | 'textAnalyzer'
  | 'reportGenerator'
  | 'documentGenerator'
  | 'infographicGenerator'
  | 'presentationGenerator'
  | 'mindmapGenerator'
  | 'chunker'
  | 'embedding'
  | 'retriever'
  | 'contextAssembler'
  | 'vectorStore'
  | 'fileUpload'
  | 'apiConnector'
  | 'router';

// API Connector Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type BodyType = 'none' | 'json' | 'form' | 'raw';
export type ApiAuthType = 'none' | 'bearer' | 'apiKey' | 'basic' | 'custom';
export type ApiKeyLocation = 'header' | 'query';

export type NodeCategory = 'source' | 'processor' | 'generator' | 'output';

export type AssistantMode = 'expand' | 'analyze' | 'brainstorm' | 'refine' | 'freestyle';
export type AssistantTone = 'creative' | 'professional' | 'casual' | 'dramatic' | 'minimal';

export type AnalyzerOutputType = 'report' | 'document' | 'infographic' | 'presentation' | 'mindmap' | 'analysis' | 'comparison' | 'summary';
export type AnalyzerDepth = 'brief' | 'standard' | 'detailed' | 'comprehensive';
export type AnalyzerFormat = 'structured' | 'narrative' | 'bullet-points' | 'academic';

// Output Generator Types
export type OutputFormat = 'markdown' | 'html' | 'json' | 'plain';
export type DocumentStyle = 'formal' | 'technical' | 'business' | 'academic' | 'creative';
export type VisualizationTheme = 'modern' | 'minimal' | 'corporate' | 'creative' | 'dark';

export interface AssistantSettings {
  mode: AssistantMode;
  tone: AssistantTone;
  creativity: number; // 0-100
  outputLength: 'short' | 'medium' | 'long';
  includeNegativePrompt: boolean;
  preserveStyle: boolean;
}

export interface AnalyzerSettings {
  outputType: AnalyzerOutputType;
  depth: AnalyzerDepth;
  format: AnalyzerFormat;
  includeMetrics: boolean;
  includeRecommendations: boolean;
  language: string;
  focusAreas: string[];
}

export interface AnalysisResultData {
  prompt: string;
  sections?: { title: string; description: string }[];
  keyInsights?: string[];
  recommendations?: string[];
  metrics?: Record<string, any>;
  metadata?: {
    estimatedLength?: string;
    complexity?: string;
    primaryFocus?: string;
  };
}

// Output Generator Settings
export interface ReportSettings {
  style: DocumentStyle;
  includeExecutiveSummary: boolean;
  includeTableOfContents: boolean;
  includeCharts: boolean;
  includeReferences: boolean;
  maxSections: number;
  language: string;
}

export interface DocumentSettings {
  style: DocumentStyle;
  format: OutputFormat;
  includeHeader: boolean;
  includeFooter: boolean;
  includeSignature: boolean;
  templateType: 'memo' | 'letter' | 'policy' | 'procedure' | 'contract' | 'custom';
  language: string;
}

export interface InfographicSettings {
  theme: VisualizationTheme;
  layout: 'vertical' | 'horizontal' | 'grid' | 'timeline';
  includeIcons: boolean;
  includeStatistics: boolean;
  colorScheme: 'auto' | 'monochrome' | 'complementary' | 'triadic';
  maxElements: number;
}

export interface PresentationSettings {
  theme: VisualizationTheme;
  slidesCount: number;
  includeImages: boolean;
  includeCharts: boolean;
  includeSpeakerNotes: boolean;
  transitionStyle: 'none' | 'fade' | 'slide' | 'zoom';
  aspectRatio: '16:9' | '4:3' | '1:1';
}

export interface MindmapSettings {
  theme: VisualizationTheme;
  maxDepth: number;
  maxBranches: number;
  includeDescriptions: boolean;
  includeIcons: boolean;
  layout: 'radial' | 'tree' | 'organic';
  connectionStyle: 'curved' | 'straight' | 'angular';
}

// RAG Pipeline Settings
export type ChunkStrategy = 'sentence' | 'paragraph' | 'fixed' | 'semantic';
export type EmbeddingModel = 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';

export interface ChunkerSettings {
  strategy: ChunkStrategy;
  chunkSize: number; // in tokens
  overlap: number; // in tokens
  preserveSentences: boolean;
}

export interface EmbeddingSettings {
  model: EmbeddingModel;
  dimensions: number;
  batchSize: number;
  storeInDb: boolean;
  knowledgeBaseId?: string;
}

export interface RetrieverSettings {
  topK: number;
  threshold: number;
  knowledgeBaseId?: string;
}

export type ContextFormat = 'structured' | 'concatenated' | 'markdown';

export interface ContextAssemblerSettings {
  maxTokens: number;
  includeMetadata: boolean;
  separator: string;
  format: ContextFormat;
}

export interface VectorStoreSettings {
  showChunkPreview: boolean;
  maxPreviewChunks: number;
  sortBy: 'date' | 'name' | 'chunks';
  sortOrder: 'asc' | 'desc';
  autoRefresh: boolean;
}

// File Upload Node Settings
export interface FileUploadSettings {
  autoExtract: boolean;
  maxFileSize: number; // in MB
  preserveFormatting: boolean;
  extractMetadata: boolean;
}

export interface FileUploadData {
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  extractedText?: string;
  extractionWarning?: string;
  metadata?: {
    fileName: string;
    fileType: string;
    pages?: number;
    characterCount: number;
    wordCount: number;
    extractedAt: string;
    extractionMethod?: string;
  };
}

// API Connector Settings
export interface ApiConnectorSettings {
  method: HttpMethod;
  url: string;
  bodyType: BodyType;
  timeout: number;
  authType: ApiAuthType;
  bearerToken?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: ApiKeyLocation;
  basicUsername?: string;
  basicPassword?: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  queryParams: Array<{ key: string; value: string; enabled: boolean }>;
  followRedirects: boolean;
  validateSSL: boolean;
  retryOnFail: boolean;
  retryCount: number;
}

export interface ApiConnectorData {
  requestBody?: string | Record<string, unknown>;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: unknown;
    duration: number;
  };
  requestHistory?: Array<{
    timestamp: string;
    method: HttpMethod;
    url: string;
    status: number;
    duration: number;
  }>;
}

// Router Node Types
export type RouterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'startsWith' 
  | 'endsWith' 
  | 'greaterThan' 
  | 'lessThan' 
  | 'greaterOrEqual' 
  | 'lessOrEqual' 
  | 'isEmpty' 
  | 'isNotEmpty' 
  | 'matches';

export interface RouterCondition {
  id: string;
  name: string;
  field: string;
  operator: RouterOperator;
  value: string;
  enabled: boolean;
}

export interface RouterSettings {
  conditions: RouterCondition[];
  evaluateAll: boolean; // If true, evaluate all conditions; if false, stop at first match
  defaultBehavior: 'continue' | 'stop' | 'error';
}

export interface RouterData {
  inputData?: string;
  evaluationResults?: Record<string, boolean>; // conditionId -> matched
  matchedBranch?: string | null;
  matchedBranches?: string[];
  lastEvaluatedAt?: string;
}

// Output Data Types
export interface GeneratedOutput {
  content: string;
  format: OutputFormat;
  metadata?: {
    title?: string;
    sections?: number;
    wordCount?: number;
    generatedAt?: string;
  };
  preview?: string;
}

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
  userDescription?: string;
  onRun?: () => void | Promise<void>;
  // Reference node specific
  assetUrl?: string;
  assetType?: 'image' | 'pdf' | 'text' | 'link';
  fileName?: string;
  extractedText?: string;
  // Image generator settings
  settings?: {
    seed?: number;
    aspectRatio?: string;
    guidanceScale?: number;
    steps?: number;
  };
  // Assistant specific
  assistantSettings?: AssistantSettings;
  negativePrompt?: string;
  // Text Analyzer specific
  analyzerSettings?: AnalyzerSettings;
  analysisResult?: AnalysisResultData;
  // Output generators specific
  reportSettings?: ReportSettings;
  documentSettings?: DocumentSettings;
  infographicSettings?: InfographicSettings;
  presentationSettings?: PresentationSettings;
  mindmapSettings?: MindmapSettings;
  generatedOutput?: GeneratedOutput;
  // RAG Pipeline specific
  chunkerSettings?: ChunkerSettings;
  embeddingSettings?: EmbeddingSettings;
  retrieverSettings?: RetrieverSettings;
  contextAssemblerSettings?: ContextAssemblerSettings;
  vectorStoreSettings?: VectorStoreSettings;
  chunks?: Array<{ content: string; index: number; tokenCount: number }>;
  chunkCount?: number;
  embeddingResult?: { embeddings: number[][]; storedCount: number; dimensions: number };
  query?: string;
  retrievedDocuments?: Array<{ content: string; similarity: number; document_name?: string; chunk_index?: number; metadata?: Record<string, unknown> }>;
  retrievalMetadata?: { query: string; topK: number; threshold: number; totalFound: number };
  assembledContext?: string;
  contextMetadata?: { documentsIncluded: number; totalDocuments: number; estimatedTokens: number; format: string };
  // VectorStore specific
  selectedKnowledgeBaseId?: string;
  knowledgeBaseCount?: number;
  documentChunks?: Array<{ id: string; document_id: string; document_name: string | null; chunk_index: number; content: string; token_count: number | null }>;
  // FileUpload specific
  fileUploadSettings?: FileUploadSettings;
  fileUploadData?: FileUploadData;
  // API Connector specific
  apiConnectorSettings?: ApiConnectorSettings;
  apiConnectorData?: ApiConnectorData;
  // Router specific
  routerSettings?: RouterSettings;
  routerData?: RouterData;
}

export type FlowNode = Node<NodeData>;

// Edge data interface for custom edge properties
export interface EdgeData extends Record<string, unknown> {
  sourceType?: NodeType;
  targetType?: NodeType;
  isAnimated?: boolean;
  label?: string;
  description?: string;
}

interface FlowState {
  nodes: FlowNode[];
  edges: Edge<EdgeData>[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isExecuting: boolean;
  
  // Actions
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: Edge<EdgeData>[]) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => void;
  deleteEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  deleteNode: (nodeId: string) => void;
  setExecuting: (isExecuting: boolean) => void;
  getConnectedNodes: (nodeId: string) => { inputs: FlowNode[]; outputs: FlowNode[] };
  loadRagPipelineTemplate: () => void;
  clearCanvas: () => void;
}

const getNodeLabel = (type: NodeType): string => {
  switch (type) {
    case 'text': return 'Text Input';
    case 'assistant': return 'AI Assistant';
    case 'imageGenerator': return 'Image Generator';
    case 'videoGenerator': return 'Video Generator';
    case 'reference': return 'Reference';
    case 'textAnalyzer': return 'Text Analyzer';
    case 'reportGenerator': return 'Report Generator';
    case 'documentGenerator': return 'Document Generator';
    case 'infographicGenerator': return 'Infographic Generator';
    case 'presentationGenerator': return 'Presentation Generator';
    case 'mindmapGenerator': return 'Mindmap Generator';
    case 'chunker': return 'Chunker';
    case 'embedding': return 'Embedding';
    case 'retriever': return 'Retriever';
    case 'contextAssembler': return 'Context Assembler';
    case 'vectorStore': return 'Vector Store';
    case 'fileUpload': return 'File Upload';
    case 'apiConnector': return 'API Connector';
    case 'router': return 'Conditional Router';
    default: return 'Node';
  }
};

const getNodeCategory = (type: NodeType): NodeCategory => {
  switch (type) {
    case 'text':
    case 'reference':
    case 'vectorStore':
    case 'fileUpload':
      return 'source';
    case 'assistant':
    case 'textAnalyzer':
    case 'chunker':
    case 'embedding':
    case 'retriever':
    case 'contextAssembler':
    case 'apiConnector':
    case 'router':
      return 'processor';
    case 'imageGenerator':
    case 'videoGenerator':
      return 'generator';
    case 'reportGenerator':
    case 'documentGenerator':
    case 'infographicGenerator':
    case 'presentationGenerator':
    case 'mindmapGenerator':
      return 'output';
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
      assistantSettings: {
        mode: 'expand',
        tone: 'creative',
        creativity: 70,
        outputLength: 'medium',
        includeNegativePrompt: false,
        preserveStyle: false,
      },
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
  selectedEdgeId: null,
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

    // ContextAssembler can connect to assistant (for RAG context)
    if (sourceNode.data.type === 'contextAssembler') {
      const validTargets = ['assistant'];
      if (!validTargets.includes(targetNode.data.type)) {
        console.warn('Context Assembler can only connect to Assistant');
        return;
      }
    }

    // Retriever can connect to contextAssembler
    if (sourceNode.data.type === 'retriever') {
      const validTargets = ['contextAssembler'];
      if (!validTargets.includes(targetNode.data.type)) {
        console.warn('Retriever can only connect to Context Assembler');
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
      textAnalyzer: 'textAnalyzerNode',
      reportGenerator: 'reportGeneratorNode',
      documentGenerator: 'documentGeneratorNode',
      infographicGenerator: 'infographicGeneratorNode',
      presentationGenerator: 'presentationGeneratorNode',
      mindmapGenerator: 'mindmapGeneratorNode',
      chunker: 'chunkerNode',
      embedding: 'embeddingNode',
      retriever: 'retrieverNode',
      contextAssembler: 'contextAssemblerNode',
      vectorStore: 'vectorStoreNode',
      fileUpload: 'fileUploadNode',
      apiConnector: 'apiConnectorNode',
      router: 'routerNode',
    };

    const getDefaultSettings = (nodeType: NodeType) => {
      switch (nodeType) {
        case 'imageGenerator':
          return { settings: { aspectRatio: '1:1', guidanceScale: 7.5, steps: 30 } };
        case 'reportGenerator':
          return { reportSettings: { style: 'formal' as DocumentStyle, includeExecutiveSummary: true, includeTableOfContents: true, includeCharts: true, includeReferences: true, maxSections: 10, language: 'pt-BR' } };
        case 'documentGenerator':
          return { documentSettings: { style: 'business' as DocumentStyle, format: 'markdown' as OutputFormat, includeHeader: true, includeFooter: true, includeSignature: false, templateType: 'memo' as const, language: 'pt-BR' } };
        case 'infographicGenerator':
          return { infographicSettings: { theme: 'modern' as VisualizationTheme, layout: 'vertical' as const, includeIcons: true, includeStatistics: true, colorScheme: 'auto' as const, maxElements: 12 } };
        case 'presentationGenerator':
          return { presentationSettings: { theme: 'modern' as VisualizationTheme, slidesCount: 10, includeImages: true, includeCharts: true, includeSpeakerNotes: true, transitionStyle: 'fade' as const, aspectRatio: '16:9' as const } };
        case 'mindmapGenerator':
          return { mindmapSettings: { theme: 'modern' as VisualizationTheme, maxDepth: 4, maxBranches: 6, includeDescriptions: true, includeIcons: true, layout: 'radial' as const, connectionStyle: 'curved' as const } };
        case 'chunker':
          return { chunkerSettings: { strategy: 'paragraph' as const, chunkSize: 500, overlap: 50, preserveSentences: true } };
        case 'embedding':
          return { embeddingSettings: { model: 'text-embedding-3-small' as const, dimensions: 1536, batchSize: 100, storeInDb: true } };
        case 'retriever':
          return { retrieverSettings: { topK: 5, threshold: 0.3 } };
        case 'contextAssembler':
          return { contextAssemblerSettings: { maxTokens: 4000, includeMetadata: true, separator: '\n\n---\n\n', format: 'structured' as const } };
        case 'vectorStore':
          return { vectorStoreSettings: { showChunkPreview: true, maxPreviewChunks: 3, sortBy: 'date' as const, sortOrder: 'desc' as const, autoRefresh: false } };
        case 'fileUpload':
          return { fileUploadSettings: { autoExtract: true, maxFileSize: 20, preserveFormatting: true, extractMetadata: true } };
        case 'apiConnector':
          return { 
            apiConnectorSettings: { 
              method: 'GET' as const, 
              url: '', 
              bodyType: 'none' as const, 
              timeout: 30, 
              authType: 'none' as const, 
              headers: [], 
              queryParams: [], 
              followRedirects: true, 
              validateSSL: true, 
              retryOnFail: false, 
              retryCount: 3 
            } 
          };
        case 'router':
          return { 
            routerSettings: { 
              conditions: [], 
              evaluateAll: false, 
              defaultBehavior: 'continue' as const 
            } 
          };
        default:
          return {};
      }
    };

    const newNode: FlowNode = {
      id: `${type}-${Date.now()}`,
      type: nodeTypeMap[type],
      position,
      data: {
        label: getNodeLabel(type),
        type,
        category: getNodeCategory(type),
        ...getDefaultSettings(type),
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

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...data } }
          : edge
      ),
    });
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
      selectedEdgeId: get().selectedEdgeId === edgeId ? null : get().selectedEdgeId,
    });
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setSelectedEdge: (edgeId) => set({ selectedEdgeId: edgeId }),

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

  clearCanvas: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
  },

  loadRagPipelineTemplate: () => {
    const timestamp = Date.now();
    const baseX = 100;
    const baseY = 150;
    const xSpacing = 280;
    const yOffset = 80;

    // RAG Pipeline nodes
    const templateNodes: FlowNode[] = [
      // Input branch
      {
        id: `text-${timestamp}`,
        type: 'textNode',
        position: { x: baseX, y: baseY },
        data: {
          label: 'Source Text',
          type: 'text',
          category: 'source',
          content: '',
          userDescription: 'Enter your source documents or text here',
        },
      },
      {
        id: `chunker-${timestamp}`,
        type: 'chunkerNode',
        position: { x: baseX + xSpacing, y: baseY },
        data: {
          label: 'Chunker',
          type: 'chunker',
          category: 'processor',
          userDescription: 'Splits text into manageable chunks',
          chunkerSettings: {
            strategy: 'paragraph',
            chunkSize: 500,
            overlap: 50,
            preserveSentences: true,
          },
        },
      },
      {
        id: `embedding-${timestamp}`,
        type: 'embeddingNode',
        position: { x: baseX + xSpacing * 2, y: baseY },
        data: {
          label: 'Embedding',
          type: 'embedding',
          category: 'processor',
          userDescription: 'Generates vector embeddings for chunks',
          embeddingSettings: {
            model: 'text-embedding-3-small',
            dimensions: 1536,
            batchSize: 100,
            storeInDb: true,
          },
        },
      },
      {
        id: `vectorStore-${timestamp}`,
        type: 'vectorStoreNode',
        position: { x: baseX + xSpacing * 3, y: baseY - yOffset },
        data: {
          label: 'Vector Store',
          type: 'vectorStore',
          category: 'source',
          userDescription: 'Stores and manages embeddings',
          vectorStoreSettings: {
            showChunkPreview: true,
            maxPreviewChunks: 3,
            sortBy: 'date',
            sortOrder: 'desc',
            autoRefresh: false,
          },
        },
      },
      // Retrieval branch
      {
        id: `retriever-${timestamp}`,
        type: 'retrieverNode',
        position: { x: baseX + xSpacing * 4, y: baseY },
        data: {
          label: 'Retriever',
          type: 'retriever',
          category: 'processor',
          userDescription: 'Finds relevant documents via semantic search',
          retrieverSettings: {
            topK: 5,
            threshold: 0.7,
          },
        },
      },
      {
        id: `contextAssembler-${timestamp}`,
        type: 'contextAssemblerNode',
        position: { x: baseX + xSpacing * 5, y: baseY },
        data: {
          label: 'Context Assembler',
          type: 'contextAssembler',
          category: 'processor',
          userDescription: 'Assembles context for the AI assistant',
          contextAssemblerSettings: {
            maxTokens: 4000,
            includeMetadata: true,
            separator: '\n\n---\n\n',
            format: 'structured',
          },
        },
      },
      {
        id: `assistant-${timestamp}`,
        type: 'assistantNode',
        position: { x: baseX + xSpacing * 6, y: baseY },
        data: {
          label: 'RAG Assistant',
          type: 'assistant',
          category: 'processor',
          userDescription: 'AI assistant with RAG context',
          assistantSettings: {
            mode: 'freestyle',
            tone: 'professional',
            creativity: 50,
            outputLength: 'medium',
            includeNegativePrompt: false,
            preserveStyle: false,
          },
        },
      },
      // Query input
      {
        id: `query-${timestamp}`,
        type: 'textNode',
        position: { x: baseX + xSpacing * 3, y: baseY + yOffset * 2 },
        data: {
          label: 'Query Input',
          type: 'text',
          category: 'source',
          content: '',
          userDescription: 'Enter your search query here',
        },
      },
    ];

    // RAG Pipeline edges
    const templateEdges: Edge[] = [
      // Indexing pipeline
      {
        id: `e-text-chunker-${timestamp}`,
        source: `text-${timestamp}`,
        target: `chunker-${timestamp}`,
      },
      {
        id: `e-chunker-embedding-${timestamp}`,
        source: `chunker-${timestamp}`,
        target: `embedding-${timestamp}`,
      },
      {
        id: `e-embedding-vectorStore-${timestamp}`,
        source: `embedding-${timestamp}`,
        target: `vectorStore-${timestamp}`,
      },
      // Retrieval pipeline
      {
        id: `e-vectorStore-retriever-${timestamp}`,
        source: `vectorStore-${timestamp}`,
        target: `retriever-${timestamp}`,
      },
      {
        id: `e-query-retriever-${timestamp}`,
        source: `query-${timestamp}`,
        target: `retriever-${timestamp}`,
      },
      {
        id: `e-retriever-contextAssembler-${timestamp}`,
        source: `retriever-${timestamp}`,
        target: `contextAssembler-${timestamp}`,
      },
      {
        id: `e-contextAssembler-assistant-${timestamp}`,
        source: `contextAssembler-${timestamp}`,
        target: `assistant-${timestamp}`,
      },
    ];

    set({
      nodes: templateNodes,
      edges: templateEdges,
      selectedNodeId: null,
    });
  },
}));
