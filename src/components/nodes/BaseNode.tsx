import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { LucideIcon } from 'lucide-react';

interface BaseNodeProps extends NodeProps {
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  inputs?: Array<{
    id: string;
    type: 'text' | 'image';
    label?: string;
  }>;
  outputs?: Array<{
    id: string;
    type: 'text' | 'image';
    label?: string;
  }>;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  data,
  selected,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  inputs = [],
  outputs = [],
}) => {
  const nodeData = data as NodeData;
  const { isProcessing, isComplete, error } = nodeData;
  const setSelectedNode = useFlowStore((state) => state.setSelectedNode);

  const handleClick = () => {
    setSelectedNode(id);
  };

  const getHandleStyle = (type: 'text' | 'image') => {
    if (type === 'text') {
      return { background: 'hsl(var(--handle-text))', borderColor: 'hsl(var(--handle-text))' };
    }
    return { background: 'hsl(var(--handle-image))', borderColor: 'hsl(var(--handle-image))' };
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'node-container min-w-[280px] max-w-[320px] cursor-pointer',
        selected && 'selected',
        isProcessing && 'animate-pulse-glow',
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
            top: inputs.length > 1 ? `${30 + index * 30}%` : '50%',
          }}
          className="flow-handle"
        />
      ))}

      {/* Header */}
      <div className="node-header">
        <div className={cn('p-1.5 rounded-md bg-background/50', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-foreground/90">{nodeData.label}</span>
        {isProcessing && (
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
        {isComplete && !isProcessing && (
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        )}
        {error && (
          <div className="ml-auto">
            <div className="w-2 h-2 rounded-full bg-destructive" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="node-body">
        {children}
      </div>

      {/* Output Handles */}
      {outputs.map((output, index) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          style={{
            ...getHandleStyle(output.type),
            top: outputs.length > 1 ? `${30 + index * 30}%` : '50%',
          }}
          className="flow-handle"
        />
      ))}
    </div>
  );
};
