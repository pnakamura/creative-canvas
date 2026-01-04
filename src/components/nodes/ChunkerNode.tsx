import React, { useCallback, useMemo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Scissors, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Hash,
  Layers,
  Zap,
  ChevronLeft,
  ChevronRight,
  Type
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, ChunkerSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const getNodeTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    text: 'Text Node',
    fileUpload: 'File Upload',
    reference: 'Reference',
  };
  return labels[type] || type;
};

export const ChunkerNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, chunks, chunkerSettings } = nodeData;
  const { toast } = useToast();
  const [previewIndex, setPreviewIndex] = useState(0);

  const settings: ChunkerSettings = chunkerSettings || {
    strategy: 'paragraph',
    chunkSize: 500,
    overlap: 50,
    preserveSentences: true,
  };

  const { inputs } = getConnectedNodes(props.id);

  // Get actual text content from connected nodes
  const { inputText, sourceNode } = useMemo(() => {
    const textNode = inputs.find((n) => n.data.type === 'text' && n.data.content);
    const fileNode = inputs.find((n) => n.data.type === 'fileUpload' && n.data.fileUploadData?.extractedText);
    const referenceNode = inputs.find((n) => n.data.type === 'reference' && n.data.extractedText);

    if (textNode?.data.content) {
      return { inputText: textNode.data.content as string, sourceNode: textNode };
    }
    if (fileNode?.data.fileUploadData?.extractedText) {
      return { inputText: fileNode.data.fileUploadData.extractedText as string, sourceNode: fileNode };
    }
    if (referenceNode?.data.extractedText) {
      return { inputText: referenceNode.data.extractedText as string, sourceNode: referenceNode };
    }
    return { inputText: '', sourceNode: null };
  }, [inputs]);

  const hasContent = inputText.length > 0;
  const hasConnection = inputs.some((n) => 
    n.data.type === 'text' || n.data.type === 'fileUpload' || n.data.type === 'reference'
  );

  // Calculate input statistics
  const inputStats = useMemo(() => {
    if (!inputText) return { chars: 0, words: 0, estimatedTokens: 0 };
    const words = inputText.split(/\s+/).filter(w => w.length > 0).length;
    return {
      chars: inputText.length,
      words,
      estimatedTokens: Math.ceil(inputText.length / 4),
    };
  }, [inputText]);

  const handleChunk = useCallback(async () => {
    if (!inputText) {
      updateNodeData(props.id, { error: 'No text content available' });
      toast({
        title: "Missing Content",
        description: "Connected node has no text content to chunk",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('chunk-text', {
        body: { 
          text: inputText,
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

      setPreviewIndex(0);

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
  }, [props.id, inputText, updateNodeData, toast, settings]);

  const chunksArray = (chunks as Array<{ content: string; index: number; tokenCount: number }>) || [];

  // Calculate chunk statistics
  const chunkStats = useMemo(() => {
    if (chunksArray.length === 0) return { total: 0, avg: 0, min: 0, max: 0 };
    const tokens = chunksArray.map(c => c.tokenCount || 0);
    const total = tokens.reduce((a, b) => a + b, 0);
    return {
      total,
      avg: Math.round(total / chunksArray.length),
      min: Math.min(...tokens),
      max: Math.max(...tokens),
    };
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

        {/* Ready to Process Banner */}
        {hasContent && !isProcessing && !chunksArray.length && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 animate-fade-in">
            <Zap className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-500">
                Pronto para Chunking
              </p>
              <p className="text-[10px] text-amber-500/80">
                {inputStats.words.toLocaleString()} palavras • ~{inputStats.estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          </div>
        )}

        {/* Source Node Info */}
        {sourceNode && !chunksArray.length && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              {sourceNode.data.type === 'fileUpload' ? (
                <FileText className="w-4 h-4 text-primary" />
              ) : (
                <Type className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {(sourceNode.data.label as string) || getNodeTypeLabel(sourceNode.data.type as string)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {inputStats.chars.toLocaleString()} chars • {inputStats.words.toLocaleString()} words
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          </div>
        )}

        {/* No Content Warning */}
        {hasConnection && !hasContent && !isProcessing && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">
              Aguardando conteúdo do nó conectado
            </p>
          </div>
        )}

        {/* Chunk Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleChunk();
          }}
          disabled={isProcessing || !hasContent}
          className={cn(
            'nodrag w-full gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30',
            isProcessing && 'opacity-50',
            !hasContent && 'opacity-50 cursor-not-allowed'
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
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Chunking Complete
              </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Chunks</p>
                <p className="text-sm font-semibold text-foreground">{chunksArray.length}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-semibold text-foreground">{chunkStats.total.toLocaleString()}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Avg/Chunk</p>
                <p className="text-sm font-semibold text-foreground">{chunkStats.avg}</p>
              </div>
            </div>

            {/* Token Range */}
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Min: {chunkStats.min} tokens</span>
              <span>Max: {chunkStats.max} tokens</span>
            </div>

            {/* Chunk Preview with Navigation */}
            {chunksArray[previewIndex] && (
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    Preview ({previewIndex + 1}/{chunksArray.length})
                  </p>
                  <div className="flex gap-0.5">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="nodrag h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex(i => Math.max(0, i - 1));
                      }}
                      disabled={previewIndex === 0}
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="nodrag h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIndex(i => Math.min(chunksArray.length - 1, i + 1));
                      }}
                      disabled={previewIndex === chunksArray.length - 1}
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="p-2 rounded bg-muted/20 border border-border/20">
                  <p className="text-[11px] text-foreground/80 line-clamp-3 leading-relaxed">
                    {chunksArray[previewIndex].content}
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1.5">
                    {chunksArray[previewIndex].tokenCount} tokens
                  </p>
                </div>
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
