import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Search, Database, AlertCircle, Zap, CheckCircle2, FileText } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowStore, NodeData, RetrieverSettings } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export const RetrieverNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;

  const settings: RetrieverSettings = nodeData.retrieverSettings || {
    topK: 5,
    threshold: 0.7,
    knowledgeBaseId: undefined,
  };

  // Get connected nodes
  const { inputs } = getConnectedNodes(props.id);
  
  // Check for VectorStore connection
  const vectorStoreNode = inputs.find((n) => n.data.type === 'vectorStore');
  const connectedKbId = vectorStoreNode?.data.selectedKnowledgeBaseId as string | undefined;
  const connectedKbHasData = vectorStoreNode?.data.chunkCount && (vectorStoreNode.data.chunkCount as number) > 0;
  
  // Check for text input
  const textNode = inputs.find((n) => n.data.type === 'text');
  const hasTextInput = !!(textNode?.data.content);
  
  // Determine query source
  const queryFromNode = textNode?.data.content || textNode?.data.prompt;
  const queryFromInput = nodeData.query;
  const currentQuery = queryFromNode || queryFromInput || '';
  
  // Ready state
  const isReady = currentQuery.trim().length > 0 && (connectedKbId || settings.knowledgeBaseId);

  const handleRun = useCallback(async () => {
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      let query = currentQuery;
      let knowledgeBaseId = connectedKbId || settings.knowledgeBaseId;

      if (!query.trim()) {
        throw new Error('Nenhuma query encontrada. Conecte um nó de texto ou digite uma query.');
      }

      if (!knowledgeBaseId) {
        throw new Error('Nenhuma Knowledge Base conectada. Conecte um VectorStore com KB selecionada.');
      }

      console.log('Retriever running with:', { query: query.substring(0, 50), knowledgeBaseId, topK: settings.topK });

      const { data: result, error: fnError } = await supabase.functions.invoke('retrieve-documents', {
        body: { 
          query,
          topK: settings.topK,
          threshold: settings.threshold,
          knowledgeBaseId: knowledgeBaseId,
        },
      });

      if (fnError) throw fnError;
      if (result.error) throw new Error(result.error);

      updateNodeData(props.id, {
        retrievedDocuments: result.documents,
        retrievalMetadata: {
          query,
          topK: settings.topK,
          threshold: settings.threshold,
          totalFound: result.documents.length,
        },
        isProcessing: false,
        isComplete: true,
      });

      toast.success(`${result.documents.length} documentos recuperados`);
    } catch (error) {
      console.error('Retrieval error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro na recuperação';
      updateNodeData(props.id, { error: errorMessage, isProcessing: false, isComplete: false });
      toast.error(errorMessage);
    }
  }, [props.id, currentQuery, connectedKbId, settings, updateNodeData]);

  React.useEffect(() => {
    updateNodeData(props.id, { onRun: handleRun });
  }, [handleRun]);

  const retrievedDocs = nodeData.retrievedDocuments as Array<{ content: string; similarity: number; document_name?: string }> | undefined;
  const retrievedCount = retrievedDocs?.length || 0;

  return (
    <BaseNode
      {...props}
      data={nodeData}
      icon={Search}
      iconColor="text-emerald-400"
      fixedDescription="Busca documentos similares usando embeddings vetoriais"
    >
      <Handle type="target" position={Position.Left} className="node-handle !bg-emerald-500" />
      
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            Top {settings.topK}
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            Threshold {(settings.threshold * 100).toFixed(0)}%
          </Badge>
        </div>

        {/* Ready for Search Banner */}
        {isReady && !nodeData.isProcessing && !retrievedCount && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 animate-fade-in">
            <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400">
                Pronto para Busca
              </p>
              <p className="text-[10px] text-emerald-400/80">
                Query: "{currentQuery.substring(0, 30)}{currentQuery.length > 30 ? '...' : ''}"
              </p>
            </div>
          </div>
        )}

        {/* Connected VectorStore */}
        {vectorStoreNode && (
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Vector Store</p>
                {connectedKbId ? (
                  <p className="text-[10px] text-teal-400">
                    {connectedKbHasData ? `${vectorStoreNode.data.chunkCount} chunks` : 'KB selecionada'}
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-400">
                    Selecione uma KB no VectorStore
                  </p>
                )}
              </div>
              {connectedKbId && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}

        {/* Connected Text Input */}
        {hasTextInput && (
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Query do Text Node</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {queryFromNode?.substring(0, 40)}...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Query Input */}
        {!hasTextInput && (
          <Textarea
            value={nodeData.query || ''}
            onChange={(e) => updateNodeData(props.id, { query: e.target.value })}
            placeholder="Digite uma query ou conecte um nó de texto..."
            className="nodrag text-sm bg-background/50 border-border/50 resize-none"
            rows={2}
          />
        )}

        {/* Results Display */}
        {retrievedCount > 0 && (
          <div className="p-3 rounded-lg bg-background/50 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{retrievedCount} documentos recuperados</span>
            </div>
            
            {/* Preview of retrieved docs */}
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {retrievedDocs?.slice(0, 3).map((doc, idx) => (
                <div key={idx} className="text-[10px] text-muted-foreground p-1 bg-muted/30 rounded">
                  <span className="text-emerald-400">[{(doc.similarity * 100).toFixed(0)}%]</span>
                  {doc.document_name && <span className="text-primary ml-1">{doc.document_name}:</span>}
                  <span className="ml-1">{doc.content.substring(0, 60)}...</span>
                </div>
              ))}
              {retrievedCount > 3 && (
                <p className="text-[10px] text-muted-foreground/70">+{retrievedCount - 3} mais documentos</p>
              )}
            </div>
          </div>
        )}

        {nodeData.error && (
          <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-destructive mt-0.5" />
            <span className="text-xs text-destructive">{nodeData.error}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="node-handle !bg-emerald-500" />
    </BaseNode>
  );
};
