import React, { useState, useCallback } from 'react';
import {
  BaseEdge,
  EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from '@xyflow/react';
import { CheckCircle2, AlertCircle, XCircle, Zap, X, Pencil } from 'lucide-react';
import { 
  validateConnection, 
  isRagConnection,
  ConnectionValidity,
  getNodeLabel,
} from '@/lib/connectionValidation';
import { NodeType, useFlowStore, EdgeData } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ValidatedEdgeProps extends EdgeProps {
  data?: EdgeData;
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
  const { deleteElements } = useReactFlow();
  const { updateEdgeData, setSelectedEdge } = useFlowStore();
  
  const sourceType = data?.sourceType as NodeType | undefined;
  const targetType = data?.targetType as NodeType | undefined;
  const isAnimated = data?.isAnimated;
  const edgeLabel = data?.label as string | undefined;
  const edgeDescription = data?.description as string | undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [localLabel, setLocalLabel] = useState(edgeLabel || '');
  const [localDescription, setLocalDescription] = useState(edgeDescription || '');
  const [isHovered, setIsHovered] = useState(false);

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

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  }, [deleteElements, id]);

  // Handle save label/description
  const handleSave = useCallback(() => {
    updateEdgeData(id, {
      label: localLabel.trim() || undefined,
      description: localDescription.trim() || undefined,
    });
    setIsEditing(false);
  }, [id, localLabel, localDescription, updateEdgeData]);

  // Handle click on edge label
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEdge(id);
  }, [id, setSelectedEdge]);

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
      
      {/* Connection validity indicator with tooltip and controls */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="edge-label-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          {/* Delete button - appears on hover */}
          <button
            onClick={handleDelete}
            className={cn(
              'edge-delete-btn absolute -top-6 left-1/2 -translate-x-1/2',
              'flex items-center justify-center w-5 h-5 rounded-full',
              'bg-destructive/90 hover:bg-destructive text-destructive-foreground',
              'border border-destructive shadow-md',
              'transition-all duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
            title="Delete connection"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Main indicator with tooltip */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <Popover open={isEditing} onOpenChange={setIsEditing}>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full cursor-pointer',
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
                </PopoverTrigger>
                
                {/* Edit popover */}
                <PopoverContent 
                  side="top" 
                  className="w-64 p-3 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-2">
                    <Label htmlFor="edge-label" className="text-xs">
                      Connection Name
                    </Label>
                    <Input
                      id="edge-label"
                      value={localLabel}
                      onChange={(e) => setLocalLabel(e.target.value)}
                      placeholder="e.g., Main Flow"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edge-description" className="text-xs">
                      Description
                    </Label>
                    <Textarea
                      id="edge-description"
                      value={localDescription}
                      onChange={(e) => setLocalDescription(e.target.value)}
                      placeholder="Describe this connection..."
                      className="min-h-[60px] text-sm resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
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
                <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50 mt-2">
                  Click to edit • Hover for delete
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Custom label display (below indicator) */}
          {edgeLabel && (
            <div className="edge-custom-label mt-1 flex items-center gap-1">
              <Pencil className="w-2.5 h-2.5 opacity-50" />
              <span>{edgeLabel}</span>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ValidatedEdge;
