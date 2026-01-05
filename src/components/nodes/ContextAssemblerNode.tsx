import React, { useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Layers, FileText, AlertCircle, Zap, CheckCircle2, Brain } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useFlowStore, NodeData, ContextAssemblerSettings } from '@/store/flowStore';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export const ContextAssemblerNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;

  const settings: ContextAssemblerSettings = nodeData.contextAssemblerSettings || {
    maxTokens: 4000,
    includeMetadata: true,
    separator: '\n\n---\n\n',
    format: 'structured',
  };

  // Get connected nodes
  const { inputs } = getConnectedNodes(props.id);
  
  // Check for Retriever connection
  const retrieverNode = inputs.find((n) => n.data.type === 'retriever');
  const retrieverDocs = retrieverNode?.data.retrievedDocuments as Array<{ content: string; similarity: number; document_name?: string }> | undefined;
  const hasRetrieverDocs = retrieverDocs && retrieverDocs.length > 0;

  // Ready state
  const isReady = hasRetrieverDocs && !nodeData.isProcessing && !nodeData.assembledContext;

  const handleRun = useCallback(async () => {
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      // IMPORTANTE: Buscar inputs FRESCOS do store no momento da execução
      const { getConnectedNodes } = useFlowStore.getState();
      const { inputs: freshInputs } = getConnectedNodes(props.id);
      
      let retrievedDocuments: Array<{ content: string; similarity: number; document_name?: string; chunk_index?: number }> = [];

      for (const input of freshInputs) {
        const inputData = input.data as NodeData;
        if (inputData.retrievedDocuments) {
          retrievedDocuments = [...retrievedDocuments, ...inputData.retrievedDocuments];
        }
      }

      if (retrievedDocuments.length === 0) {
        // Check if there's a connected retriever that returned 0 docs
        const connectedRetriever = freshInputs.find((n) => n.data.type === 'retriever');
        if (connectedRetriever && connectedRetriever.data.retrievalMetadata) {
          throw new Error('O Retriever retornou 0 documentos. Diminua o Threshold (recomendado 0.3) e rode o Retriever novamente.');
        }
        throw new Error('Nenhum documento encontrado. Conecte um RetrieverNode com documentos recuperados.');
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
          if (doc.similarity) {
            section += ` (${(doc.similarity * 100).toFixed(0)}% relevante)`;
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

      toast.success(`Contexto montado com ${includedDocs.length} documentos (~${totalTokens} tokens)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao montar contexto';
      updateNodeData(props.id, { error: errorMessage, isProcessing: false, isComplete: false });
      toast.error(errorMessage);
    }
  }, [props.id, settings, updateNodeData]);

  // Use ref to avoid infinite loop - ref doesn't cause re-renders
  const handleRunRef = React.useRef(handleRun);
  handleRunRef.current = handleRun;

  React.useEffect(() => {
    const { updateNodeData } = useFlowStore.getState();
    updateNodeData(props.id, { onRun: () => handleRunRef.current() });
  }, [props.id]);

  const metadata = nodeData.contextMetadata as { documentsIncluded: number; totalDocuments: number; estimatedTokens: number; format: string } | undefined;

  // Merge onRun into data for BaseNode
  const dataWithRun = { ...nodeData, onRun: handleRun };

  return (
    <BaseNode
      {...props}
      data={dataWithRun}
      icon={Layers}
      iconColor="text-sky-400"
      fixedDescription="Monta contexto dos documentos recuperados para o LLM"
    >
      <Handle type="target" position={Position.Left} className="node-handle !bg-sky-500" />
      
      <div className="space-y-3">
        {/* Settings Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] bg-muted/50">
            Max {settings.maxTokens} tokens
          </Badge>
          <Badge variant="outline" className="text-[10px] bg-muted/50 capitalize">
            {settings.format}
          </Badge>
          {settings.includeMetadata && (
            <Badge variant="outline" className="text-[10px] bg-sky-500/20 text-sky-400">
              +Metadata
            </Badge>
          )}
        </div>

        {/* Ready to Assemble Banner */}
        {isReady && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-500/15 border border-sky-500/40 animate-fade-in">
            <Zap className="w-5 h-5 text-sky-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sky-400">
                Pronto para Montar
              </p>
              <p className="text-[10px] text-sky-400/80">
                {retrieverDocs?.length} documentos disponíveis
              </p>
            </div>
          </div>
        )}

        {/* Connected Retriever */}
        {retrieverNode && (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">Retriever</p>
                {hasRetrieverDocs ? (
                  <p className="text-[10px] text-emerald-400">
                    {retrieverDocs.length} documentos recuperados
                  </p>
                ) : (
                  <p className="text-[10px] text-amber-400">
                    Execute o Retriever primeiro
                  </p>
                )}
              </div>
              {hasRetrieverDocs && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
            </div>
          </div>
        )}

        {/* No Retriever Connected */}
        {!retrieverNode && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Conecte um Retriever Node
            </p>
          </div>
        )}

        {/* Results Display */}
        {metadata && (
          <div className="p-3 rounded-lg bg-background/50 border border-sky-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>Contexto Montado</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Docs</p>
                <p className="text-xs font-medium">{metadata.documentsIncluded}/{metadata.totalDocuments}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Tokens</p>
                <p className="text-xs font-medium">~{metadata.estimatedTokens}</p>
              </div>
              <div className="text-center p-1.5 rounded bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Formato</p>
                <p className="text-xs font-medium capitalize">{metadata.format}</p>
              </div>
            </div>
          </div>
        )}

        {/* Context Preview */}
        {nodeData.assembledContext && (
          <div className="p-2 rounded-md bg-muted/30 border border-border/50 max-h-24 overflow-y-auto">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {(nodeData.assembledContext as string).slice(0, 300)}...
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
