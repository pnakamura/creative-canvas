import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Binary, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Cpu,
  Zap
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, EmbeddingSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const EmbeddingNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, embeddingResult, embeddingSettings } = nodeData;
  const { toast } = useToast();

  const settings: EmbeddingSettings = embeddingSettings || {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    storeInDb: true,
    knowledgeBaseId: undefined,
  };

  const handleEmbed = useCallback(async () => {
    const { inputs } = getConnectedNodes(props.id);
    
    // Get chunks from connected ChunkerNode
    const chunkerNode = inputs.find((n) => n.data.type === 'chunker');
    const chunks = chunkerNode?.data.chunks as Array<{ content: string; index: number }> | undefined;
    
    if (!chunks || chunks.length === 0) {
      updateNodeData(props.id, { error: 'Connect a Chunker node with chunks' });
      toast({
        title: "Missing Input",
        description: "Connect a Chunker node that has processed text",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-embeddings', {
        body: { 
          chunks: chunks.map(c => c.content),
          model: settings.model,
          dimensions: settings.dimensions,
          batchSize: settings.batchSize,
          storeInDb: settings.storeInDb,
          knowledgeBaseId: settings.knowledgeBaseId,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = {
        embeddings: data?.embeddings || [],
        storedCount: data?.storedCount || 0,
        dimensions: data?.dimensions || settings.dimensions,
      };
      
      updateNodeData(props.id, {
        embeddingResult: result,
        isProcessing: false,
        isComplete: true,
      });

      toast({
        title: "Embeddings Generated",
        description: `Created ${result.embeddings.length} embeddings${settings.storeInDb ? ` (${result.storedCount} stored)` : ''}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate embeddings';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Embedding Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, getConnectedNodes, updateNodeData, toast, settings]);

  const { inputs } = getConnectedNodes(props.id);
  const chunkerNode = inputs.find((n) => n.data.type === 'chunker');
  const hasChunks = chunkerNode?.data.chunks && (chunkerNode.data.chunks as Array<unknown>).length > 0;
  const chunkCount = hasChunks ? (chunkerNode?.data.chunks as Array<unknown>).length : 0;

  const result = embeddingResult as { embeddings: number[][]; storedCount: number; dimensions: number } | undefined;

  const modelLabel = useMemo(() => {
    switch (settings.model) {
      case 'text-embedding-3-small': return 'Small';
      case 'text-embedding-3-large': return 'Large';
      case 'text-embedding-ada-002': return 'Ada';
      default: return 'Small';
    }
  }, [settings.model]);

  return (
    <BaseNode
      {...props}
      icon={Binary}
      iconColor="text-violet-400"
      fixedDescription="Generate vector embeddings"
      nodeCategory="processor"
      inputs={[
        { id: 'chunks-in', type: 'context', label: 'Chunks' },
      ]}
      outputs={[{ id: 'embeddings-out', type: 'context', label: 'Embeddings' }]}
    >
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px] bg-violet-500/20 text-violet-400">
            <Cpu className="w-3 h-3" />
            {modelLabel}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            {settings.dimensions}d
          </Badge>
          {settings.storeInDb && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-400 gap-1">
              <Database className="w-2.5 h-2.5" />
              Store
            </Badge>
          )}
        </div>

        {/* Connected Input Display */}
        {chunkerNode && (
          <div className="flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
              <Zap className="w-3 h-3" /> {chunkCount} chunks ready
            </span>
          </div>
        )}

        {/* Embed Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleEmbed();
          }}
          disabled={isProcessing || !hasChunks}
          className={cn(
            'nodrag w-full gap-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30',
            isProcessing && 'opacity-50'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Binary className="w-4 h-4" />
          )}
          {isProcessing ? 'Embedding...' : 'Generate Embeddings'}
        </Button>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-1">
            <Progress value={60} className="h-1" />
            <p className="text-[10px] text-muted-foreground text-center">Generating vectors...</p>
          </div>
        )}

        {/* Output Display */}
        {result && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Embeddings Ready
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Vectors</p>
                <p className="text-xs font-medium text-foreground">{result.embeddings.length}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Dimensions</p>
                <p className="text-xs font-medium text-foreground">{result.dimensions}</p>
              </div>
            </div>

            {settings.storeInDb && result.storedCount > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {result.storedCount} embeddings stored in database
                </p>
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
