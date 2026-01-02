import { NodeType } from '@/store/flowStore';

export interface ConnectionRule {
  validTargets: NodeType[];
  validSources: NodeType[];
}

// Define valid connections for each node type
export const connectionRules: Record<NodeType, ConnectionRule> = {
  // Sources
  text: {
    validTargets: ['assistant', 'textAnalyzer', 'chunker', 'imageGenerator'],
    validSources: [],
  },
  reference: {
    validTargets: ['assistant', 'imageGenerator', 'chunker'],
    validSources: [],
  },
  fileUpload: {
    validTargets: ['chunker', 'assistant', 'textAnalyzer'],
    validSources: [],
  },
  vectorStore: {
    validTargets: ['retriever'],
    validSources: ['embedding'],
  },
  
  // Processors
  assistant: {
    validTargets: ['imageGenerator', 'videoGenerator', 'textAnalyzer', 'reportGenerator', 'documentGenerator', 'infographicGenerator', 'presentationGenerator', 'mindmapGenerator'],
    validSources: ['text', 'reference', 'contextAssembler', 'retriever', 'assistant'],
  },
  textAnalyzer: {
    validTargets: ['reportGenerator', 'documentGenerator', 'infographicGenerator', 'presentationGenerator', 'mindmapGenerator', 'assistant'],
    validSources: ['text', 'assistant', 'reference'],
  },
  chunker: {
    validTargets: ['embedding'],
    validSources: ['text', 'reference', 'fileUpload'],
  },
  embedding: {
    validTargets: ['vectorStore', 'retriever'],
    validSources: ['chunker'],
  },
  retriever: {
    validTargets: ['contextAssembler', 'assistant'],
    validSources: ['vectorStore', 'embedding'],
  },
  contextAssembler: {
    validTargets: ['assistant'],
    validSources: ['retriever'],
  },
  
  // Generators
  imageGenerator: {
    validTargets: ['videoGenerator'],
    validSources: ['assistant', 'text', 'reference'],
  },
  videoGenerator: {
    validTargets: [],
    validSources: ['imageGenerator'],
  },
  
  // Output nodes
  reportGenerator: {
    validTargets: [],
    validSources: ['textAnalyzer', 'assistant'],
  },
  documentGenerator: {
    validTargets: [],
    validSources: ['textAnalyzer', 'assistant'],
  },
  infographicGenerator: {
    validTargets: [],
    validSources: ['textAnalyzer', 'assistant'],
  },
  presentationGenerator: {
    validTargets: [],
    validSources: ['textAnalyzer', 'assistant'],
  },
  mindmapGenerator: {
    validTargets: [],
    validSources: ['textAnalyzer', 'assistant'],
  },
};

export type ConnectionValidity = 'valid' | 'invalid' | 'warning';

export interface ConnectionValidationResult {
  isValid: boolean;
  validity: ConnectionValidity;
  message?: string;
}

export const validateConnection = (
  sourceType: NodeType,
  targetType: NodeType
): ConnectionValidationResult => {
  const sourceRules = connectionRules[sourceType];
  const targetRules = connectionRules[targetType];

  // Check if target is in source's valid targets
  const sourceAllowsTarget = sourceRules.validTargets.includes(targetType);
  
  // Check if source is in target's valid sources
  const targetAllowsSource = targetRules.validSources.includes(sourceType);

  if (sourceAllowsTarget && targetAllowsSource) {
    return {
      isValid: true,
      validity: 'valid',
      message: 'Connection is valid',
    };
  }

  // Partial match - one direction allows it
  if (sourceAllowsTarget || targetAllowsSource) {
    return {
      isValid: true,
      validity: 'warning',
      message: 'Connection may work but is not optimal',
    };
  }

  return {
    isValid: false,
    validity: 'invalid',
    message: `${getNodeLabel(sourceType)} cannot connect to ${getNodeLabel(targetType)}`,
  };
};

const getNodeLabel = (type: NodeType): string => {
  const labels: Record<NodeType, string> = {
    text: 'Text Input',
    assistant: 'AI Assistant',
    imageGenerator: 'Image Generator',
    videoGenerator: 'Video Generator',
    reference: 'Reference',
    textAnalyzer: 'Text Analyzer',
    reportGenerator: 'Report Generator',
    documentGenerator: 'Document Generator',
    infographicGenerator: 'Infographic Generator',
    presentationGenerator: 'Presentation Generator',
    mindmapGenerator: 'Mindmap Generator',
    chunker: 'Chunker',
    embedding: 'Embedding',
    retriever: 'Retriever',
    contextAssembler: 'Context Assembler',
    vectorStore: 'Vector Store',
    fileUpload: 'File Upload',
  };
  return labels[type] || type;
};

// Get edge styling based on validity
export const getEdgeStyle = (validity: ConnectionValidity) => {
  switch (validity) {
    case 'valid':
      return {
        stroke: 'hsl(var(--edge-valid))',
        strokeWidth: 2,
      };
    case 'warning':
      return {
        stroke: 'hsl(var(--edge-warning))',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      };
    case 'invalid':
      return {
        stroke: 'hsl(var(--edge-invalid))',
        strokeWidth: 2,
        strokeDasharray: '3,3',
      };
    default:
      return {
        stroke: 'hsl(var(--border))',
        strokeWidth: 2,
      };
  }
};

// RAG Pipeline specific connections
export const ragPipelineConnections: Array<[NodeType, NodeType]> = [
  ['text', 'chunker'],
  ['reference', 'chunker'],
  ['fileUpload', 'chunker'],
  ['chunker', 'embedding'],
  ['embedding', 'vectorStore'],
  ['vectorStore', 'retriever'],
  ['retriever', 'contextAssembler'],
  ['contextAssembler', 'assistant'],
  ['retriever', 'assistant'],
];

export const isRagConnection = (sourceType: NodeType, targetType: NodeType): boolean => {
  return ragPipelineConnections.some(
    ([source, target]) => source === sourceType && target === targetType
  );
};
