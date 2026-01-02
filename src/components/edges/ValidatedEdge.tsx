import React from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
} from '@xyflow/react';
import { CheckCircle2, AlertCircle, XCircle, Zap } from 'lucide-react';
import { 
  validateConnection, 
  isRagConnection,
  ConnectionValidity,
} from '@/lib/connectionValidation';
import { NodeType } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ValidatedEdgeProps extends EdgeProps {
  data?: {
    sourceType?: NodeType;
    targetType?: NodeType;
    isAnimated?: boolean;
  };
}

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
    apiConnector: 'API Connector',
    router: 'Conditional Router',
  };
  return labels[type] || type;
};

export const ValidatedEdge: React.FC<ValidatedEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}) => {
  const sourceType = data?.sourceType;
  const targetType = data?.targetType;
  const isAnimated = data?.isAnimated;

  // Validate connection
  let validity: ConnectionValidity = 'valid';
  let isRag = false;
  let validationMessage = '';

  if (sourceType && targetType) {
    const validation = validateConnection(sourceType, targetType);
    validity = validation.validity;
    isRag = isRagConnection(sourceType, targetType);
    validationMessage = validation.message || '';
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  // Get edge color based on validity
  const getEdgeColor = () => {
    if (isRag) return 'hsl(var(--edge-rag))';
    switch (validity) {
      case 'valid':
        return 'hsl(var(--edge-valid))';
      case 'warning':
        return 'hsl(var(--edge-warning))';
      case 'invalid':
        return 'hsl(var(--edge-invalid))';
      default:
        return 'hsl(var(--edge-default))';
    }
  };

  // Get icon based on validity
  const getValidityIcon = () => {
    if (isRag) {
      return <Zap className="w-3 h-3 text-[hsl(var(--edge-rag))]" />;
    }
    switch (validity) {
      case 'valid':
        return <CheckCircle2 className="w-3 h-3 text-[hsl(var(--edge-valid))]" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-[hsl(var(--edge-warning))]" />;
      case 'invalid':
        return <XCircle className="w-3 h-3 text-[hsl(var(--edge-invalid))]" />;
      default:
        return null;
    }
  };

  // Get tooltip content
  const getTooltipContent = () => {
    const sourceName = sourceType ? getNodeLabel(sourceType) : 'Unknown';
    const targetName = targetType ? getNodeLabel(targetType) : 'Unknown';

    if (isRag) {
      return {
        title: 'RAG Pipeline Connection',
        description: `${sourceName} → ${targetName}`,
        detail: 'Part of the Retrieval-Augmented Generation pipeline',
        color: 'text-[hsl(var(--edge-rag))]',
      };
    }

    switch (validity) {
      case 'valid':
        return {
          title: 'Valid Connection',
          description: `${sourceName} → ${targetName}`,
          detail: 'This connection is properly configured',
          color: 'text-[hsl(var(--edge-valid))]',
        };
      case 'warning':
        return {
          title: 'Connection Warning',
          description: `${sourceName} → ${targetName}`,
          detail: validationMessage || 'Connection may work but is not optimal',
          color: 'text-[hsl(var(--edge-warning))]',
        };
      case 'invalid':
        return {
          title: 'Invalid Connection',
          description: `${sourceName} → ${targetName}`,
          detail: validationMessage || 'These nodes are not compatible',
          color: 'text-[hsl(var(--edge-invalid))]',
        };
      default:
        return {
          title: 'Connection',
          description: `${sourceName} → ${targetName}`,
          detail: '',
          color: 'text-muted-foreground',
        };
    }
  };

  const edgeColor = getEdgeColor();
  const tooltipContent = getTooltipContent();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: validity === 'warning' ? '8 4' : validity === 'invalid' ? '4 4' : undefined,
          filter: selected ? `drop-shadow(0 0 6px ${edgeColor})` : undefined,
          transition: 'stroke 0.3s ease, stroke-width 0.2s ease',
        }}
        className={cn(isAnimated && 'animate-flow')}
      />
      
      {/* Connection validity indicator with tooltip */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full cursor-pointer',
                    'bg-background/90 border shadow-lg',
                    'transition-all duration-200 hover:scale-110',
                    isRag && 'border-[hsl(var(--edge-rag))]',
                    validity === 'valid' && !isRag && 'border-[hsl(var(--edge-valid))]',
                    validity === 'warning' && 'border-[hsl(var(--edge-warning))]',
                    validity === 'invalid' && 'border-[hsl(var(--edge-invalid))]',
                  )}
                >
                  {getValidityIcon()}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="top" 
                className="max-w-[250px] p-3 space-y-1"
              >
                <p className={cn('font-semibold text-sm', tooltipContent.color)}>
                  {tooltipContent.title}
                </p>
                <p className="text-xs text-foreground/80 font-medium">
                  {tooltipContent.description}
                </p>
                {tooltipContent.detail && (
                  <p className="text-xs text-muted-foreground">
                    {tooltipContent.detail}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ValidatedEdge;
