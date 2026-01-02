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

interface ValidatedEdgeProps extends EdgeProps {
  data?: {
    sourceType?: NodeType;
    targetType?: NodeType;
    isAnimated?: boolean;
  };
}

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

  if (sourceType && targetType) {
    const validation = validateConnection(sourceType, targetType);
    validity = validation.validity;
    isRag = isRagConnection(sourceType, targetType);
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

  const edgeColor = getEdgeColor();

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
      
      {/* Connection validity indicator */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full',
            'bg-background/90 border shadow-lg',
            'transition-all duration-200',
            isRag && 'border-[hsl(var(--edge-rag))]',
            validity === 'valid' && !isRag && 'border-[hsl(var(--edge-valid))]',
            validity === 'warning' && 'border-[hsl(var(--edge-warning))]',
            validity === 'invalid' && 'border-[hsl(var(--edge-invalid))]',
          )}
        >
          {getValidityIcon()}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ValidatedEdge;
