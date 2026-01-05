import React, { useCallback, useMemo } from 'react';
import { NodeProps } from '@xyflow/react';
import { 
  Binary, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Cpu,
  Zap,
  FileText
} from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData, EmbeddingSettings } from '@/store/flowStore';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

export const EmbeddingNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, error, embeddingResult, embeddingSettings } = nodeData;
  const { toast } = useToast();
  const { user } = useAuth();

  const settings: EmbeddingSettings = embeddingSettings || {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    storeInDb: true,
    knowledgeBaseId: undefined,
  };

  // Get connected nodes info
  const { inputs, outputs } = getConnectedNodes(props.id);
  
  // Find ChunkerNode as input
  const chunkerNode = inputs.find((n) => n.data.type === 'chunker');
  const chunks = chunkerNode?.data.chunks as Array<{ content: string; index: number }> | undefined;
  const hasChunks = chunks && chunks.length > 0;
  const chunkCount = hasChunks ? chunks.length : 0;

  // Find VectorStoreNode as output target
  const vectorStoreNode = outputs.find((n) => n.data.type === 'vectorStore');
  const targetKnowledgeBaseId = vectorStoreNode?.data.selectedKnowledgeBaseId as string | undefined;
  const targetKbName = vectorStoreNode ? 
    (inputs.find(n => n.data.type === 'vectorStore')?.data.label as string) || 'Vector Store' 
    : undefined;

  // Get document name from FileUploadNode via ChunkerNode
  const getDocumentName = useCallback(() => {
    if (!chunkerNode) return 'Documento sem nome';
    
    // ChunkerNode stores source info
    const sourceLabel = chunkerNode.data.sourceLabel as string | undefined;
    if (sourceLabel) return sourceLabel;
    
    // Try to find FileUploadNode in chunker's inputs
    const chunkerInputs = getConnectedNodes(chunkerNode.id).inputs;
    const fileUploadNode = chunkerInputs.find(n => n.data.type === 'fileUpload');
    if (fileUploadNode?.data.fileUploadData?.fileName) {
      return fileUploadNode.data.fileUploadData.fileName as string;
    }
    
    const textNode = chunkerInputs.find(n => n.data.type === 'text');
    if (textNode?.data.label) {
      return textNode.data.label as string;
    }
    
    return 'Documento sem nome';
  }, [chunkerNode, getConnectedNodes]);

  const handleEmbed = useCallback(async () => {
    if (!chunks || chunks.length === 0) {
      updateNodeData(props.id, { error: 'Conecte um nó Chunker com chunks processados' });
      toast({
        title: "Entrada Faltando",
        description: "Conecte um nó Chunker que tenha texto processado",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      updateNodeData(props.id, { error: 'Usuário não autenticado' });
      toast({
        title: "Autenticação Necessária",
        description: "Faça login para gerar embeddings",
        variant: "destructive",
      });
      return;
    }

    // Check if storeInDb is true but no KB is selected
    if (settings.storeInDb && !targetKnowledgeBaseId && !settings.knowledgeBaseId) {
      updateNodeData(props.id, { error: 'Selecione uma Knowledge Base no VectorStore conectado' });
      toast({
        title: "Knowledge Base Necessária",
        description: "Conecte um VectorStore e selecione uma Knowledge Base para armazenar os embeddings",
        variant: "destructive",
      });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const documentName = getDocumentName();
      const kbId = targetKnowledgeBaseId || settings.knowledgeBaseId;

      const { data, error: fnError } = await supabase.functions.invoke('generate-embeddings', {
        body: { 
          chunks: chunks.map(c => c.content),
          model: settings.model,
          dimensions: settings.dimensions,
          batchSize: settings.batchSize,
          storeInDb: settings.storeInDb,
          knowledgeBaseId: kbId,
          userId: user.id,
          documentName: documentName,
          documentId: crypto.randomUUID(),
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
        title: "Embeddings Gerados",
        description: `Criados ${result.embeddings.length} embeddings${settings.storeInDb ? ` (${result.storedCount} armazenados)` : ''}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao gerar embeddings';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: "Erro no Embedding",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [props.id, chunks, getDocumentName, updateNodeData, toast, settings, user, targetKnowledgeBaseId]);

  const result = embeddingResult as { embeddings: number[][]; storedCount: number; dimensions: number } | undefined;

  const modelLabel = useMemo(() => {
    switch (settings.model) {
      case 'text-embedding-3-small': return 'Small';
      case 'text-embedding-3-large': return 'Large';
      case 'text-embedding-ada-002': return 'Ada';
      default: return 'Small';
    }
  }, [settings.model]);

  // Check if ready to run
  const isReadyToRun = hasChunks && user && (settings.storeInDb ? (targetKnowledgeBaseId || settings.knowledgeBaseId) : true);

  return (
    <BaseNode
      {...props}
      icon={Binary}
      iconColor="text-violet-400"
      fixedDescription="Gerar embeddings vetoriais"
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
              Armazenar
            </Badge>
          )}
        </div>

        {/* Ready to Embed Banner */}
        {hasChunks && !isProcessing && !result && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/15 border border-violet-500/40 animate-fade-in">
            <Zap className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-violet-400">
                Pronto para Embedding
              </p>
              <p className="text-[10px] text-violet-400/80">
                {chunkCount} chunks • ~{Math.ceil(chunkCount * settings.dimensions / 1000)}K dimensões
              </p>
            </div>
          </div>
        )}

        {/* Connected Input Display */}
        {chunkerNode && (
          <div className="p-2 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Chunker</p>
                <p className="text-[10px] text-muted-foreground">
                  {chunkCount} chunks disponíveis
                </p>
              </div>
              {hasChunks && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}

        {/* Target VectorStore Display */}
        {vectorStoreNode && (
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Destino: Vector Store</p>
                {targetKnowledgeBaseId ? (
                  <p className="text-[10px] text-teal-400">
                    KB selecionada ✓
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-400">
                    Selecione uma KB no VectorStore
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warning if no VectorStore connected but storeInDb is true */}
        {settings.storeInDb && !vectorStoreNode && !settings.knowledgeBaseId && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Conecte um VectorStore para armazenar os embeddings
            </p>
          </div>
        )}

        {/* Embed Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleEmbed();
          }}
          disabled={isProcessing || !isReadyToRun}
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
          {isProcessing ? 'Gerando...' : 'Gerar Embeddings'}
        </Button>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-1">
            <Progress value={60} className="h-1" />
            <p className="text-[10px] text-muted-foreground text-center">Gerando vetores...</p>
          </div>
        )}

        {/* Output Display */}
        {result && !isProcessing && (
          <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                Embeddings Prontos
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Vetores</p>
                <p className="text-xs font-medium text-foreground">{result.embeddings.length}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Dimensões</p>
                <p className="text-xs font-medium text-foreground">{result.dimensions}</p>
              </div>
            </div>

            {settings.storeInDb && result.storedCount > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {result.storedCount} embeddings armazenados no banco
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
