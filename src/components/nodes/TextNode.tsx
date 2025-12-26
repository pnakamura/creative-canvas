import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Type } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Textarea } from '@/components/ui/textarea';
import { useFlowStore, NodeData } from '@/store/flowStore';

export const TextNode: React.FC<NodeProps> = (props) => {
  const updateNodeData = useFlowStore((state) => state.updateNodeData);
  const nodeData = props.data as NodeData;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(props.id, { content: e.target.value });
  };

  return (
    <BaseNode
      {...props}
      icon={Type}
      iconColor="text-handle-text"
      fixedDescription="Text Input - Source node"
      outputs={[{ id: 'text-out', type: 'text' }]}
    >
      <div className="space-y-2">
        <Textarea
          placeholder="Enter your creative prompt..."
          value={nodeData.content || ''}
          onChange={handleContentChange}
          className="nodrag min-h-[80px] resize-none bg-background/50 border-border/50 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50"
          onClick={(e) => e.stopPropagation()}
        />
        <p className="text-xs text-muted-foreground">
          {(nodeData.content?.length || 0)} characters
        </p>
      </div>
    </BaseNode>
  );
};
