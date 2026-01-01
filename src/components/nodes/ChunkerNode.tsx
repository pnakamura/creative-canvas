import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Scissors, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Hash,
  Layers
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, ChunkerSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const ChunkerNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, chunks, chunkerSettings } = nodeData;
  const { toast } = useToast();

  const settings: ChunkerSettings = chunkerSettings || {
    strategy: 'paragraph',
    chunkSize: 500,
    overlap: 50,
    preserveSentences: true,
  };

  const handleChunk = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    // Get text content from connected nodes
    const textNode = inputs.find((n) => n.data.type === 'text');
    const referenceNode = inputs.find((n) => n.data.type === 'reference');
    
    const textContent = textNode?.data.content || referenceNode?.data.extractedText || '';
    
    if (!textContent) {
      updateNodeData(props.id, { error: 'Connect a text source with content' });
      toast({
        title: "Missing Input",
        description: "Connect a Text node or Reference node with content",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('chunk-text', {
        body: { 
          text: textContent,
          strategy: settings.strategy,
          chunkSize: settings.chunkSize,
          overlap: settings.overlap,
          preserveSentences: settings.preserveSentences,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data?.chunks || [];
      
      updateNodeData(props.id, {
        chunks: result,
        chunkCount: result.length,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: "Chunking Complete",
        description: `Created ${result.length} chunks from the text`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to chunk text';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Chunking Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, getConnectedNodes, updateNodeData, toast, settings]);

  const { inputs } = getConnectedNodes(props.id);
  const hasTextInput = inputs.some((n) => n.data.type === 'text' || n.data.type === 'reference');
  const chunksArray = (chunks as Array<{ content: string; index: number; tokenCount: number }>) || [];

  const totalTokens = useMemo(() => {
    return chunksArray.reduce((acc, chunk) => acc + (chunk.tokenCount || 0), 0);
  }, [chunksArray]);

  const strategyLabel = useMemo(() => {
    switch (settings.strategy) {
      case 'sentence': return 'Sentence';
      case 'paragraph': return 'Paragraph';
      case 'fixed': return 'Fixed Size';
      case 'semantic': return 'Semantic';
      default: return 'Paragraph';
    }
  }, [settings.strategy]);

  return (
    <BaseNode
      {...props}
      icon={Scissors}
      iconColor="text-amber-400"
      fixedDescription="Split text into chunks"
      nodeCategory="processor"
      inputs={[
        { id: 'text-in', type: 'text', label: 'Text Input' },
      ]}
      outputs={[{ id: 'chunks-out', type: 'context', label: 'Chunks' }]}
    >
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px] bg-amber-500/20 text-amber-400">
            <Scissors className="w-3 h-3" />
            {strategyLabel}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            <Hash className="w-2.5 h-2.5 mr-1" />
            {settings.chunkSize} tokens
          </Badge>
          {settings.overlap > 0 && (
            <Badge variant="outline" className="text-[10px] bg-muted/50">
              <Layers className="w-2.5 h-2.5 mr-1" />
              {settings.overlap} overlap
            </Badge>
          )}
        </div>

        {/* Connected Input Display */}
        {hasTextInput && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              <FileText className="w-3 h-3" /> Source Connected
            </span>
          </div>
        )}

        {/* Chunk Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleChunk();
          }}
          disabled={isProcessing || !hasTextInput}
          className={cn(
            'nodrag w-full gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Scissors className="w-4 h-4" />
          )}
          {isProcessing ? 'Chunking...' : 'Chunk Text'}
        </Button>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-1">
            <Progress value={45} className="h-1" />
            <p className="text-[10px] text-muted-foreground text-center">Splitting text...</p>
          </div>
        )}

        {/* Output Display */}
        {chunksArray.length > 0 && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Chunking Complete
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Chunks</p>
                <p className="text-xs font-medium text-foreground">{chunksArray.length}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Total Tokens</p>
                <p className="text-xs font-medium text-foreground">{totalTokens}</p>
              </div>
            </div>

            {/* Preview first chunk */}
            {chunksArray[0] && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">Preview (Chunk 1):</p>
                <p className="text-xs text-foreground/80 line-clamp-2">{chunksArray[0].content}</p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>
    </BaseNode>
  );
};
