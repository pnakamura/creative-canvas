import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Sparkles, Wand2, FileText, Image, Brain, Lightbulb, Pencil, MessageSquare, Zap, Database } from 'lucide-react';
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

  // Get connected nodes for display
  const { inputs } = getConnectedNodes(props.id);
  const hasTextInput = inputs.some((n) => (n.data as NodeData).type === 'text');
  const hasReferenceInput = inputs.some((n) => (n.data as NodeData).type === 'reference');
  const hasContextInput = inputs.some((n) => (n.data as NodeData).type === 'contextAssembler');
  const hasRetrieverInput = inputs.some((n) => (n.data as NodeData).type === 'retriever');
  
  const referenceInput = inputs.find((n) => (n.data as NodeData).type === 'reference');
  const contextInput = inputs.find((n) => (n.data as NodeData).type === 'contextAssembler');
  const retrieverInput = inputs.find((n) => (n.data as NodeData).type === 'retriever');

  // Calculate RAG context stats
  const ragStats = useMemo(() => {
    if (hasContextInput && contextInput?.data.contextMetadata) {
      const meta = contextInput.data.contextMetadata as { documentsIncluded: number; estimatedTokens: number };
      return { docs: meta.documentsIncluded, tokens: meta.estimatedTokens };
    }
    if (hasRetrieverInput && retrieverInput?.data.retrievedDocuments) {
      const docs = retrieverInput.data.retrievedDocuments as Array<{ content: string }>;
      const tokens = docs.reduce((sum, d) => sum + Math.ceil(d.content.length / 4), 0);
      return { docs: docs.length, tokens };
    }
    return null;
  }, [hasContextInput, hasRetrieverInput, contextInput, retrieverInput]);

  const handleProcess = useCallback(async () => {
    const textInput = inputs.find((n) => (n.data as NodeData).type === 'text');
    const referenceInput = inputs.find((n) => (n.data as NodeData).type === 'reference');
    const contextAssemblerInput = inputs.find((n) => (n.data as NodeData).type === 'contextAssembler');
    const retrieverInput = inputs.find((n) => (n.data as NodeData).type === 'retriever');
    
    // Get content from any valid input
    const hasValidInput = textInput?.data.content || 
                          referenceInput || 
                          contextAssemblerInput?.data.assembledContext ||
                          retrieverInput?.data.retrievedDocuments;
    
    if (!hasValidInput) {
      updateNodeData(props.id, { error: 'Nenhuma entrada conectada' });
      toast({
        title: "Sem entrada",
        description: "Conecte um nó de Texto, Referência, Context Assembler, ou Retriever",
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

      // Get RAG context from ContextAssemblerNode or directly from RetrieverNode
      if (contextAssemblerInput?.data.assembledContext) {
        ragContext = contextAssemblerInput.data.assembledContext as string;
        console.log('Using RAG context from ContextAssembler:', ragContext.substring(0, 200) + '...');
      } else if (retrieverInput?.data.retrievedDocuments) {
        // Build context directly from retriever documents
        const docs = retrieverInput.data.retrievedDocuments as Array<{ content: string; similarity: number; document_name?: string }>;
        ragContext = docs.map((doc, idx) => 
          `[Documento ${idx + 1}]${doc.document_name ? `\nFonte: ${doc.document_name}` : ''}\n\n${doc.content}`
        ).join('\n\n---\n\n');
        console.log('Using RAG context from Retriever:', ragContext.substring(0, 200) + '...');
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
        throw new Error('Sem resposta da IA');
      }
      
      updateNodeData(props.id, {
        prompt: result.prompt || result,
        negativePrompt: result.negativePrompt,
        isProcessing: false,
        isComplete: true,
        usedRagContext: !!ragContext,
      });

      toast({
        title: `${modeConfig[currentMode].label} completo`,
        description: ragContext 
          ? `Processado com ${ragStats?.docs || 0} documentos do RAG` 
          : hasImageContext 
            ? "Prompt aprimorado com análise de imagem" 
            : "Prompt criativo processado",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao processar';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, inputs, updateNodeData, toast, assistantSettings, currentMode, ragStats]);

  const creativityLabel = useMemo(() => {
    const creativity = assistantSettings?.creativity || 70;
    if (creativity < 30) return 'Conservador';
    if (creativity < 60) return 'Balanceado';
    if (creativity < 80) return 'Criativo';
    return 'Ousado';
  }, [assistantSettings?.creativity]);

  return (
    <BaseNode
      {...props}
      icon={Sparkles}
      iconColor="text-secondary"
      fixedDescription="Processador de prompts com IA"
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

        {/* RAG Context Badge - Prominent when available */}
        {ragStats && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40">
            <Database className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-cyan-400">
                Contexto RAG Disponível
              </p>
              <p className="text-[10px] text-cyan-400/80">
                {ragStats.docs} documentos • ~{ragStats.tokens} tokens
              </p>
            </div>
          </div>
        )}

        {/* Connected Inputs */}
        {(hasTextInput || hasReferenceInput || hasContextInput || hasRetrieverInput) && (
          <div className="flex flex-wrap gap-1">
            {hasTextInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
                <FileText className="w-3 h-3" /> Texto
              </span>
            )}
            {hasReferenceInput && referenceInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-pink-500/20 text-pink-400">
                {(referenceInput.data as NodeData).assetType === 'image' ? (
                  <Image className="w-3 h-3" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {(referenceInput.data as NodeData).assetType === 'image' ? 'Imagem' : 'Doc'}
              </span>
            )}
            {hasContextInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-sky-500/20 text-sky-400">
                <Brain className="w-3 h-3" /> Context Assembler
              </span>
            )}
            {hasRetrieverInput && !hasContextInput && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400">
                <Brain className="w-3 h-3" /> Retriever
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
          {isProcessing ? 'Processando...' : `${modeConfig[currentMode].label} Idea`}
        </Button>

        {/* Output Display */}
        {prompt && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Prompt Aprimorado:</p>
              {nodeData.usedRagContext && (
                <Badge variant="outline" className="text-[9px] bg-cyan-500/20 text-cyan-400 gap-1">
                  <Database className="w-2.5 h-2.5" />
                  RAG
                </Badge>
              )}
            </div>
            <p className="text-sm text-foreground/80 line-clamp-4">{prompt}</p>
            
            {negativePrompt && (
              <>
                <p className="text-xs text-muted-foreground mt-2">Prompt Negativo:</p>
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
