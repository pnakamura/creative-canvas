import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Sparkles, Wand2, FileText, Image, Brain, Lightbulb, Pencil, MessageSquare, Zap } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, AssistantMode } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const modeConfig: Record<AssistantMode, { icon: React.ElementType; label: string; color: string }> = {
  expand: { icon: Wand2, label: 'Expand', color: 'bg-secondary/20 text-secondary' },
  analyze: { icon: Brain, label: 'Analyze', color: 'bg-blue-500/20 text-blue-400' },
  brainstorm: { icon: Lightbulb, label: 'Brainstorm', color: 'bg-yellow-500/20 text-yellow-400' },
  refine: { icon: Pencil, label: 'Refine', color: 'bg-green-500/20 text-green-400' },
  freestyle: { icon: MessageSquare, label: 'Freestyle', color: 'bg-purple-500/20 text-purple-400' },
};

export const AssistantNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, prompt, error, assistantSettings, negativePrompt } = nodeData;
  const { toast } = useToast();

  const currentMode = assistantSettings?.mode || 'expand';
  const ModeIcon = modeConfig[currentMode].icon;

  const handleProcess = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    const textInput = inputs.find((n) => n.data.type === 'text');
    const referenceInput = inputs.find((n) => n.data.type === 'reference');
    const contextAssemblerInput = inputs.find((n) => n.data.type === 'contextAssembler');
    
    if (!textInput?.data.content && !referenceInput && !contextAssemblerInput?.data.assembledContext) {
      updateNodeData(props.id, { error: 'No input connected' });
      toast({
        title: "No input",
        description: "Connect a Text, Reference, or Context Assembler node first",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      let basePrompt = textInput?.data.content || '';
      let contextData = '';
      let ragContext = '';
      let hasImageContext = false;
      let imageUrl = '';

      // Get RAG context from ContextAssemblerNode
      if (contextAssemblerInput?.data.assembledContext) {
        ragContext = contextAssemblerInput.data.assembledContext;
        console.log('Using RAG context:', ragContext.substring(0, 200) + '...');
      }

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

      const settings = assistantSettings || {
        mode: 'expand' as AssistantMode,
        tone: 'creative',
        creativity: 70,
        outputLength: 'medium',
        includeNegativePrompt: false,
        preserveStyle: false,
      };

      const { data, error: fnError } = await supabase.functions.invoke('ai-assistant', {
        body: { 
          prompt: basePrompt,
          context: contextData,
          ragContext: ragContext,
          hasImage: hasImageContext,
          imageUrl: hasImageContext ? imageUrl : undefined,
          mode: settings.mode,
          tone: settings.tone,
          creativity: settings.creativity,
          outputLength: settings.outputLength,
          includeNegativePrompt: settings.includeNegativePrompt,
          preserveStyle: settings.preserveStyle,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const result = data?.result;
      
      if (!result) {
        throw new Error('No response from AI');
      }
      
      updateNodeData(props.id, {
        prompt: result.prompt || result,
        negativePrompt: result.negativePrompt,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: `${modeConfig[currentMode].label} complete`,
        description: hasImageContext 
          ? "Your prompt has been enhanced with image analysis" 
          : "Your creative prompt has been processed",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process';
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
  }, [props.id, getConnectedNodes, updateNodeData, toast, assistantSettings, currentMode]);

  const { inputs } = getConnectedNodes(props.id);
  const hasTextInput = inputs.some((n) => n.data.type === 'text');
  const hasReferenceInput = inputs.some((n) => n.data.type === 'reference');
  const hasContextInput = inputs.some((n) => n.data.type === 'contextAssembler');
  const referenceInput = inputs.find((n) => n.data.type === 'reference');
  const contextInput = inputs.find((n) => n.data.type === 'contextAssembler');

  const creativityLabel = useMemo(() => {
    const creativity = assistantSettings?.creativity || 70;
    if (creativity < 30) return 'Conservative';
    if (creativity < 60) return 'Balanced';
    if (creativity < 80) return 'Creative';
    return 'Wild';
  }, [assistantSettings?.creativity]);

  return (
    <BaseNode
      {...props}
      icon={Sparkles}
      iconColor="text-secondary"
      fixedDescription="AI-powered prompt processor"
      nodeCategory="processor"
      inputs={[
        { id: 'text-in', type: 'text', label: 'Text' },
        { id: 'context-in', type: 'context', label: 'Context' },
      ]}
      outputs={[{ id: 'text-out', type: 'text' }]}
    >
      <div className="space-y-3">
        {/* Mode & Settings Badge */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={cn('gap-1 text-[10px]', modeConfig[currentMode].color)}>
            <ModeIcon className="w-3 h-3" />
            {modeConfig[currentMode].label}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            {assistantSettings?.tone || 'creative'}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 gap-1">
            <Zap className="w-2.5 h-2.5" />
            {creativityLabel}
          </Badge>
        </div>

        {/* Connected Inputs */}
        {(hasTextInput || hasReferenceInput || hasContextInput) && (
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
            {hasContextInput && contextInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-400">
                <Brain className="w-3 h-3" /> RAG Context
                {contextInput.data.contextMetadata?.documentsIncluded && (
                  <span className="text-[9px] opacity-70">
                    ({contextInput.data.contextMetadata.documentsIncluded} docs)
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleProcess();
          }}
          disabled={isProcessing}
          className={cn(
            'nodrag w-full gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          <ModeIcon className={cn('w-4 h-4', isProcessing && 'animate-spin')} />
          {isProcessing ? 'Processing...' : `${modeConfig[currentMode].label} Idea`}
        </Button>

        {/* Output Display */}
        {prompt && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <p className="text-xs text-muted-foreground mb-1">Enhanced Prompt:</p>
            <p className="text-sm text-foreground/80 line-clamp-4">{prompt}</p>
            
            {negativePrompt && (
              <>
                <p className="text-xs text-muted-foreground mt-2">Negative Prompt:</p>
                <p className="text-xs text-destructive/70 line-clamp-2">{negativePrompt}</p>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </BaseNode>
  );
};
