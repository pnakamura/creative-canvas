import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Sparkles, Wand2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { cn } from '@/lib/utils';

export const AssistantNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, prompt, error } = nodeData;

  const handleExpand = async () => {
    const { inputs } = getConnectedNodes(props.id);
    const textInput = inputs.find((n) => n.data.type === 'text');
    
    if (!textInput?.data.content) {
      updateNodeData(props.id, { error: 'No input text connected' });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    // Simulate AI processing (will be replaced with actual API call)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      const enhancedPrompt = `A masterfully composed ${textInput.data.content}, rendered in stunning 8K resolution with cinematic lighting. Featuring intricate details, volumetric atmosphere, and professional color grading. Artstation trending, hyperrealistic, octane render.`;
      
      updateNodeData(props.id, {
        prompt: enhancedPrompt,
        isProcessing: false,
        isComplete: true,
      });
    } catch (err) {
      updateNodeData(props.id, {
        error: 'Failed to expand prompt',
        isProcessing: false,
      });
    }
  };

  return (
    <BaseNode
      {...props}
      icon={Sparkles}
      iconColor="text-secondary"
      inputs={[{ id: 'text-in', type: 'text' }]}
      outputs={[{ id: 'text-out', type: 'text' }]}
    >
      <div className="space-y-3">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
          disabled={isProcessing}
          className={cn(
            'w-full gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          <Wand2 className={cn('w-4 h-4', isProcessing && 'animate-spin')} />
          {isProcessing ? 'Expanding...' : 'Expand Idea'}
        </Button>

        {prompt && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Enhanced Prompt:</p>
            <p className="text-sm text-foreground/80 line-clamp-4">{prompt}</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </BaseNode>
  );
};
