import React, { useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { Sparkles, Wand2, FileText, Image } from 'lucide-react';
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

  const handleExpand = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    const textInput = inputs.find((n) => n.data.type === 'text');
    const referenceInput = inputs.find((n) => n.data.type === 'reference');
    
    if (!textInput?.data.content && !referenceInput) {
      updateNodeData(props.id, { error: 'No input connected' });
      toast({
        title: "No input",
        description: "Connect a Text node or Reference node first",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      let basePrompt = textInput?.data.content || '';
      let contextData = '';
      let hasImageContext = false;
      let imageUrl = '';

      if (referenceInput) {
        const refData = referenceInput.data;
        if (refData.assetType === 'image' && refData.assetUrl) {
          hasImageContext = true;
          imageUrl = refData.assetUrl;
        } else if (refData.extractedText) {
          contextData = refData.extractedText;
        } else if (refData.assetUrl) {
          contextData = `[Reference: ${refData.fileName || refData.assetUrl}]`;
        }
      }

      const { data, error: fnError } = await supabase.functions.invoke('expand-prompt', {
        body: { 
          prompt: basePrompt,
          context: contextData,
          hasImage: hasImageContext,
          imageUrl: hasImageContext ? imageUrl : undefined,
        },
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
        description: hasImageContext 
          ? "Your prompt has been enhanced with image analysis" 
          : "Your creative prompt has been enhanced",
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
  }, [props.id, getConnectedNodes, updateNodeData, toast]);

  const { inputs } = getConnectedNodes(props.id);
  const hasTextInput = inputs.some((n) => n.data.type === 'text');
  const hasReferenceInput = inputs.some((n) => n.data.type === 'reference');
  const referenceInput = inputs.find((n) => n.data.type === 'reference');

  return (
    <BaseNode
      {...props}
      icon={Sparkles}
      iconColor="text-secondary"
      fixedDescription="AI-powered prompt expansion"
      nodeCategory="processor"
      inputs={[
        { id: 'text-in', type: 'text', label: 'Text' },
        { id: 'context-in', type: 'context', label: 'Context' },
      ]}
      outputs={[{ id: 'text-out', type: 'text' }]}
    >
      <div className="space-y-3">
        {(hasTextInput || hasReferenceInput) && (
          <div className="flex flex-wrap gap-1">
            {hasTextInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
                <FileText className="w-3 h-3" /> Text
              </span>
            )}
            {hasReferenceInput && referenceInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-pink-500/20 text-pink-400">
                {referenceInput.data.assetType === 'image' ? (
                  <Image className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {referenceInput.data.assetType === 'image' ? 'Image' : 'Doc'}
              </span>
            )}
          </div>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleExpand();
          }}
          disabled={isProcessing}
          className={cn(
            'nodrag w-full gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30',
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
