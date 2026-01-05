import React, { useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useFlowStore, NodeData, NodeCategory } from '@/store/flowStore';
import { LucideIcon, Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface BaseNodeProps extends NodeProps {
  icon: LucideIcon;
  iconColor?: string;
  nodeCategory?: NodeCategory;
  fixedDescription?: string;
  children: React.ReactNode;
  inputs?: Array<{
    id: string;
    type: 'text' | 'image' | 'context';
    label?: string;
  }>;
  outputs?: Array<{
    id: string;
    type: 'text' | 'image' | 'context';
    label?: string;
  }>;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  data,
  selected,
  icon: Icon,
  iconColor = 'text-primary',
  nodeCategory,
  fixedDescription,
  children,
  inputs = [],
  outputs = [],
}) => {
  const nodeData = data as NodeData;
  const { isProcessing, isComplete, error, label, userDescription } = nodeData;
  const category = nodeCategory || nodeData.category;
  const { setSelectedNode, updateNodeData } = useFlowStore();
  
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(label || '');
  const [isRunning, setIsRunning] = useState(false);

  const handleClick = () => {
    setSelectedNode(id);
  };

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLabel(e.target.value);
  }, []);

  const handleLabelBlur = useCallback(() => {
    setIsEditingLabel(false);
    if (localLabel.trim() && localLabel !== label) {
      updateNodeData(id, { label: localLabel.trim() });
    } else {
      setLocalLabel(label || '');
    }
  }, [id, localLabel, label, updateNodeData]);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    } else if (e.key === 'Escape') {
      setLocalLabel(label || '');
      setIsEditingLabel(false);
    }
  }, [handleLabelBlur, label]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { userDescription: e.target.value });
  }, [id, updateNodeData]);

  const handleRun = useCallback(async () => {
    const onRun = nodeData.onRun as (() => void | Promise<void>) | undefined;
    if (!onRun) return;
    
    setIsRunning(true);
    try {
      await onRun();
    } finally {
      setIsRunning(false);
    }
  }, [nodeData.onRun]);

  const getHandleStyle = (type: 'text' | 'image' | 'context') => {
    if (type === 'text') {
      return { background: 'hsl(var(--handle-text))', borderColor: 'hsl(var(--handle-text))' };
    }
    if (type === 'context') {
      return { background: 'hsl(var(--handle-context))', borderColor: 'hsl(var(--handle-context))' };
    }
    return { background: 'hsl(var(--handle-image))', borderColor: 'hsl(var(--handle-image))' };
  };

  const categoryClass = category ? `node-${category}` : '';
  const showRunButton = typeof nodeData.onRun === 'function';
  const currentlyProcessing = isProcessing || isRunning;

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'node-container min-w-[280px] max-w-[320px] cursor-pointer border-2',
        categoryClass,
        selected && 'selected',
        currentlyProcessing && 'animate-pulse-glow',
        error && 'border-destructive'
      )}
    >
      {/* Input Handles */}
      {inputs.map((input, index) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          style={{
            ...getHandleStyle(input.type),
            top: inputs.length > 1 ? `${25 + index * 25}%` : '50%',
          }}
          className="flow-handle"
        />
      ))}

      {/* Header */}
      <CardHeader className="node-header p-3 space-y-0">
        <div className="flex items-center gap-2 w-full">
          <div className={cn('p-1.5 rounded-md bg-background/50 flex-shrink-0', iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditingLabel ? (
              <Input
                value={localLabel}
                onChange={handleLabelChange}
                onBlur={handleLabelBlur}
                onKeyDown={handleLabelKeyDown}
                className="nodrag h-6 px-1 py-0 text-sm font-medium bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="text-sm font-medium text-foreground/90 cursor-text truncate block hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLabel(true);
                  setLocalLabel(label || '');
                }}
              >
                {label}
              </span>
            )}
            
            {fixedDescription && (
              <span className="text-[10px] text-muted-foreground truncate block">
                {fixedDescription}
              </span>
            )}
          </div>

          {/* Status indicators - using native title for tooltips */}
          <div className="flex-shrink-0">
            {currentlyProcessing && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 border border-primary/30"
                title="Processing..."
              >
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                <span className="text-[10px] font-medium text-primary">Running</span>
              </div>
            )}
            {isComplete && !currentlyProcessing && !error && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30"
                title="Completed successfully"
              >
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-[10px] font-medium text-green-500">Done</span>
              </div>
            )}
            {error && !currentlyProcessing && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/20 border border-destructive/30"
                title={typeof error === 'string' ? error : 'Error occurred'}
              >
                <AlertCircle className="w-3 h-3 text-destructive" />
                <span className="text-[10px] font-medium text-destructive">Error</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="node-body p-4 pt-3 space-y-3">
        {/* User Description */}
        <div className="space-y-1">
          <Textarea
            placeholder="Add notes or description..."
            value={userDescription || ''}
            onChange={handleDescriptionChange}
            className="nodrag min-h-[40px] max-h-[80px] resize-none bg-background/50 border-border/50 text-xs placeholder:text-muted-foreground/50 focus:border-primary/50"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Node-specific content */}
        {children}
      </CardContent>

      {/* Footer with Run button */}
      {showRunButton && (
        <CardFooter className="p-3 pt-0">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleRun();
            }}
            disabled={currentlyProcessing}
            className={cn(
              'nodrag w-full gap-2',
              'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
            )}
            variant="outline"
            size="sm"
          >
            {currentlyProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run
              </>
            )}
          </Button>
        </CardFooter>
      )}

      {/* Output Handles */}
      {outputs.map((output, index) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            ...getHandleStyle(output.type),
            top: outputs.length > 1 ? `${25 + index * 25}%` : '50%',
          }}
          className="flow-handle"
        />
      ))}
    </Card>
  );
};
