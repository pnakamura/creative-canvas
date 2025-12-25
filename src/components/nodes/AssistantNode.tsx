import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Sparkles, Wand2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AssistantNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, prompt, error } = nodeData;
  const { toast } = useToast();

  const handleExpand = async () => {
    const { inputs } = getConnectedNodes(props.id);
    const textInput = inputs.find((n) => n.data.type === 'text');
    
    if (!textInput?.data.content) {
      updateNodeData(props.id, { error: 'No input text connected' });
      toast({
        title: "No input",
        description: "Connect a Text node with content first",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('expand-prompt', {
        body: { prompt: textInput.data.content },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const expandedPrompt = data?.expandedPrompt;
      
      if (!expandedPrompt) {
        throw new Error('No response from AI');
      }
      
      updateNodeData(props.id, {
        prompt: expandedPrompt,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: "Prompt expanded",
        description: "Your creative prompt has been enhanced",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to expand prompt';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
