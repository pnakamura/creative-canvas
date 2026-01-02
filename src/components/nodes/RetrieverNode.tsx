import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Search, Database, AlertCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowStore, NodeData, RetrieverSettings } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export const RetrieverNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;

  const settings: RetrieverSettings = nodeData.retrieverSettings || {
    topK: 5,
    threshold: 0.7,
    knowledgeBaseId: undefined,
  };

  const handleRun = useCallback(async () => {
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { inputs } = getConnectedNodes(props.id);
      let query = nodeData.query || '';
      
      for (const input of inputs) {
        const inputData = input.data as NodeData;
        if (inputData.content) {
          query = inputData.content;
          break;
        }
        if (inputData.prompt) {
          query = inputData.prompt;
          break;
        }
      }

      if (!query.trim()) {
        throw new Error('Nenhuma query encontrada. Conecte um nó de texto ou digite uma query.');
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('retrieve-documents', {
        body: { 
          query,
          topK: settings.topK,
          threshold: settings.threshold,
          knowledgeBaseId: settings.knowledgeBaseId,
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
  }, [props.id, nodeData.query, settings, getConnectedNodes, updateNodeData]);

  React.useEffect(() => {
    updateNodeData(props.id, { onRun: handleRun });
  }, [handleRun]);

  const retrievedCount = nodeData.retrievedDocuments?.length || 0;

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
        <Textarea
          value={nodeData.query || ''}
          onChange={(e) => updateNodeData(props.id, { query: e.target.value })}
          placeholder="Digite uma query ou conecte um nó de texto..."
          className="nodrag text-sm bg-background/50 border-border/50 resize-none"
          rows={2}
        />

        {retrievedCount > 0 && (
          <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Database className="w-3 h-3" />
              <span>{retrievedCount} documentos recuperados</span>
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
