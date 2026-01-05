import React, { useState, useEffect, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Database, Loader2, FileText, Trash2, RefreshCw, Plus, Binary, Zap, CheckCircle2 } from 'lucide-react';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  document_count: number | null;
  chunk_count: number | null;
  created_at: string;
  updated_at: string;
}

interface DocumentChunk {
  id: string;
  document_id: string;
  document_name: string | null;
  chunk_index: number;
  content: string;
  token_count: number | null;
}

export const VectorStoreNode: React.FC<NodeProps> = (props) => {
  const nodeData = props.data as NodeData;
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const { user } = useAuth();
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<string | null>(nodeData.selectedKnowledgeBaseId as string || null);
  const [documents, setDocuments] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDescription, setNewKbDescription] = useState('');

  // Check if connected to EmbeddingNode
  const { inputs } = getConnectedNodes(props.id);
  const embeddingNode = inputs.find(n => n.data.type === 'embedding');
  const isEmbeddingTarget = !!embeddingNode;

  // Fetch knowledge bases
  const fetchKnowledgeBases = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setKnowledgeBases(data || []);
      
      updateNodeData(props.id, {
        knowledgeBaseCount: data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching knowledge bases:', error);
      toast.error('Falha ao buscar knowledge bases');
    } finally {
      setIsLoading(false);
    }
  }, [user, props.id, updateNodeData]);

  // Fetch documents for selected knowledge base
  const fetchDocuments = useCallback(async (kbId: string) => {
    if (!user) return;
    
    setIsLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('id, document_id, document_name, chunk_index, content, token_count')
        .eq('knowledge_base_id', kbId)
        .order('document_name', { ascending: true })
        .order('chunk_index', { ascending: true })
        .limit(50);

      if (error) throw error;
      setDocuments(data || []);
      
      // Update knowledge base counts
      const { count: chunkCount } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('knowledge_base_id', kbId);

      const uniqueDocs = new Set(data?.map(d => d.document_id) || []);
      
      await supabase
        .from('knowledge_bases')
        .update({ 
          chunk_count: chunkCount || 0,
          document_count: uniqueDocs.size,
          updated_at: new Date().toISOString()
        })
        .eq('id', kbId);
      
      updateNodeData(props.id, {
        selectedKnowledgeBaseId: kbId,
        documentChunks: data || [],
        chunkCount: data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Falha ao buscar documentos');
    } finally {
      setIsLoadingDocs(false);
    }
  }, [user, props.id, updateNodeData]);

  // Delete a knowledge base
  const deleteKnowledgeBase = useCallback(async (kbId: string) => {
    if (!user) return;
    
    try {
      // First delete all chunks
      await supabase
        .from('document_chunks')
        .delete()
        .eq('knowledge_base_id', kbId);

      // Then delete the knowledge base
      const { error } = await supabase
        .from('knowledge_bases')
        .delete()
        .eq('id', kbId);

      if (error) throw error;
      
      toast.success('Knowledge base deletada');
      setSelectedKb(null);
      setDocuments([]);
      fetchKnowledgeBases();
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      toast.error('Falha ao deletar knowledge base');
    }
  }, [user, fetchKnowledgeBases]);

  // Create a new knowledge base
  const createKnowledgeBase = useCallback(async () => {
    if (!user || !newKbName.trim()) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_bases')
        .insert({
          name: newKbName.trim(),
          description: newKbDescription.trim() || null,
          user_id: user.id,
          document_count: 0,
          chunk_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Knowledge base criada');
      setNewKbName('');
      setNewKbDescription('');
      setIsDialogOpen(false);
      fetchKnowledgeBases();
      
      // Auto-select the new KB
      if (data) {
        setSelectedKb(data.id);
        updateNodeData(props.id, { selectedKnowledgeBaseId: data.id });
      }
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      toast.error('Falha ao criar knowledge base');
    } finally {
      setIsCreating(false);
    }
  }, [user, newKbName, newKbDescription, fetchKnowledgeBases, props.id, updateNodeData]);

  // Initialize
  useEffect(() => {
    fetchKnowledgeBases();
  }, [fetchKnowledgeBases]);

  // Load documents when KB is selected
  useEffect(() => {
    if (selectedKb) {
      fetchDocuments(selectedKb);
    }
  }, [selectedKb, fetchDocuments]);

  const handleKbSelect = (kbId: string) => {
    const newSelection = kbId === selectedKb ? null : kbId;
    setSelectedKb(newSelection);
    if (newSelection) {
      updateNodeData(props.id, { selectedKnowledgeBaseId: newSelection });
    } else {
      setDocuments([]);
      updateNodeData(props.id, { selectedKnowledgeBaseId: undefined });
    }
  };

  const selectedKbData = knowledgeBases.find(kb => kb.id === selectedKb);

  // Group documents by document_name
  const groupedDocuments = documents.reduce((acc, doc) => {
    const name = doc.document_name || 'Unknown';
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(doc);
    return acc;
  }, {} as Record<string, DocumentChunk[]>);

  return (
    <BaseNode
      {...props}
      icon={Database}
      iconColor="text-teal-400"
      nodeCategory="source"
      fixedDescription="Gerenciar knowledge bases e documentos armazenados"
      inputs={[{ id: 'embeddings-in', type: 'context', label: 'Embeddings' }]}
      outputs={[{ id: 'context', type: 'context', label: 'Knowledge Base ID' }]}
    >
      <div className="space-y-3">
        {/* Embedding Target Banner */}
        {isEmbeddingTarget && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-teal-500/15 border border-teal-500/40 animate-fade-in">
            <Binary className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-teal-400">
                Destino de Embeddings
              </p>
              <p className="text-[10px] text-teal-400/80">
                {selectedKb ? 'KB selecionada - pronto para receber' : 'Selecione uma KB abaixo'}
              </p>
            </div>
            {selectedKb && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
          </div>
        )}

        {/* Ready for Retrieval Banner */}
        {selectedKb && documents.length > 0 && !isEmbeddingTarget && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 animate-fade-in">
            <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-emerald-400">
                Pronto para Retrieval
              </p>
              <p className="text-[10px] text-emerald-400/80">
                {documents.length} chunks disponíveis
              </p>
            </div>
          </div>
        )}

        {/* Header with Create and Refresh */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {knowledgeBases.length} knowledge base{knowledgeBases.length !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-1">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="nodrag h-6 px-2 text-primary hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>Criar Knowledge Base</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="kb-name">Nome</Label>
                    <Input
                      id="kb-name"
                      placeholder="Minha Knowledge Base"
                      value={newKbName}
                      onChange={(e) => setNewKbName(e.target.value)}
                      className="nodrag"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kb-description">Descrição (opcional)</Label>
                    <Textarea
                      id="kb-description"
                      placeholder="Uma coleção de documentos sobre..."
                      value={newKbDescription}
                      onChange={(e) => setNewKbDescription(e.target.value)}
                      className="nodrag resize-none"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={createKnowledgeBase}
                    disabled={!newKbName.trim() || isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fetchKnowledgeBases();
                if (selectedKb) fetchDocuments(selectedKb);
              }}
              disabled={isLoading}
              className="nodrag h-6 px-2"
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Knowledge Bases List */}
        <ScrollArea className="h-[120px] rounded-md border border-border/50 bg-background/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : knowledgeBases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <Database className="w-6 h-6 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">Nenhuma knowledge base</span>
              <span className="text-[10px] text-muted-foreground/70">Clique em + para criar uma</span>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKbSelect(kb.id);
                  }}
                  className={cn(
                    "nodrag p-2 rounded-md cursor-pointer transition-colors border",
                    selectedKb === kb.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background/50 border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate flex-1">{kb.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteKnowledgeBase(kb.id);
                      }}
                      className="nodrag h-5 w-5 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {kb.document_count || 0} docs
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {kb.chunk_count || 0} chunks
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected KB Details */}
        {selectedKb && selectedKbData && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground/80">Documentos</span>
              {isLoadingDocs && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
            
            <ScrollArea className="h-[100px] rounded-md border border-border/50 bg-background/30">
              {Object.keys(groupedDocuments).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs text-muted-foreground">Nenhum documento</span>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {Object.entries(groupedDocuments).map(([docName, chunks]) => (
                    <div key={docName} className="space-y-1">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium truncate">{docName}</span>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                          {chunks.length} chunks
                        </Badge>
                      </div>
                      <div className="pl-4 space-y-0.5">
                        {chunks.slice(0, 3).map((chunk) => (
                          <div
                            key={chunk.id}
                            className="text-[9px] text-muted-foreground truncate bg-muted/30 rounded px-1 py-0.5"
                            title={chunk.content}
                          >
                            [{chunk.chunk_index}] {chunk.content.slice(0, 50)}...
                          </div>
                        ))}
                        {chunks.length > 3 && (
                          <span className="text-[9px] text-muted-foreground/70">
                            +{chunks.length - 3} more chunks
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Output KB ID */}
        {selectedKb && (
          <div className="p-2 rounded-md bg-teal-500/10 border border-teal-500/30">
            <span className="text-[10px] text-teal-400">KB ID Selecionado:</span>
            <span className="text-[9px] text-muted-foreground block truncate">{selectedKb}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
