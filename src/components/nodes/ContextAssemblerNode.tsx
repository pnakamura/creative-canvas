import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, FileText, AlertCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowStore, NodeData, ContextAssemblerSettings } from '@/store/flowStore';
import { toast } from 'sonner';

export const ContextAssemblerNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;

  const settings: ContextAssemblerSettings = nodeData.contextAssemblerSettings || {
    maxTokens: 4000,
    includeMetadata: true,
    separator: '\n\n---\n\n',
    format: 'structured',
  };

  const handleRun = useCallback(async () => {
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const { inputs } = getConnectedNodes(props.id);
      let retrievedDocuments: Array<{ content: string; similarity: number; document_name?: string; chunk_index?: number }> = [];

      for (const input of inputs) {
        const inputData = input.data as NodeData;
        if (inputData.retrievedDocuments) {
          retrievedDocuments = [...retrievedDocuments, ...inputData.retrievedDocuments];
        }
      }

      if (retrievedDocuments.length === 0) {
        throw new Error('Nenhum documento encontrado. Conecte um RetrieverNode.');
      }

      retrievedDocuments.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

      let totalTokens = 0;
      const includedDocs: typeof retrievedDocuments = [];

      for (const doc of retrievedDocuments) {
        const docTokens = Math.ceil(doc.content.length / 4);
        if (totalTokens + docTokens > settings.maxTokens) break;
        includedDocs.push(doc);
        totalTokens += docTokens;
      }

      let assembledContext = '';
      if (settings.format === 'structured') {
        assembledContext = includedDocs.map((doc, idx) => {
          let section = `[Documento ${idx + 1}]`;
          if (settings.includeMetadata && doc.document_name) {
            section += `\nFonte: ${doc.document_name}`;
          }
          section += `\n\n${doc.content}`;
          return section;
        }).join(settings.separator);
      } else {
        assembledContext = includedDocs.map(doc => doc.content).join(settings.separator);
      }

      updateNodeData(props.id, {
        assembledContext,
        contextMetadata: {
          documentsIncluded: includedDocs.length,
          totalDocuments: retrievedDocuments.length,
          estimatedTokens: totalTokens,
          format: settings.format,
        },
        isProcessing: false,
        isComplete: true,
      });

      toast.success(`Contexto montado com ${includedDocs.length} documentos`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao montar contexto';
      updateNodeData(props.id, { error: errorMessage, isProcessing: false, isComplete: false });
      toast.error(errorMessage);
    }
  }, [props.id, settings, getConnectedNodes, updateNodeData]);

  React.useEffect(() => {
    updateNodeData(props.id, { onRun: handleRun });
  }, [handleRun]);

  const metadata = nodeData.contextMetadata;

  return (
    <BaseNode
      {...props}
      data={nodeData}
      icon={Layers}
      iconColor="text-sky-400"
      fixedDescription="Monta contexto dos documentos recuperados para o LLM"
    >
      <Handle type="target" position={Position.Left} className="node-handle !bg-sky-500" />
      
      <div className="space-y-3">
        {metadata && (
          <div className="p-2 rounded-md bg-sky-500/10 border border-sky-500/20">
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <FileText className="w-3 h-3" />
              <span>{metadata.documentsIncluded}/{metadata.totalDocuments} docs</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">~{metadata.estimatedTokens} tokens</div>
          </div>
        )}

        {nodeData.assembledContext && (
          <div className="p-2 rounded-md bg-muted/30 border border-border/50 max-h-24 overflow-y-auto">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {nodeData.assembledContext.slice(0, 300)}...
            </p>
          </div>
        )}

        {nodeData.error && (
          <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertCircle className="w-3 h-3 text-destructive mt-0.5" />
            <span className="text-xs text-destructive">{nodeData.error}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="node-handle !bg-sky-500" />
    </BaseNode>
  );
};
