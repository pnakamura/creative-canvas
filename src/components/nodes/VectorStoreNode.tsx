import React, { useState, useEffect, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Database, Loader2, FileText, Trash2, RefreshCw } from 'lucide-react';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const { updateNodeData } = useFlowStore();
  const { user } = useAuth();
  
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKb, setSelectedKb] = useState<string | null>(nodeData.selectedKnowledgeBaseId as string || null);
  const [documents, setDocuments] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

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
      toast.error('Failed to fetch knowledge bases');
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
      
      updateNodeData(props.id, {
        selectedKnowledgeBaseId: kbId,
        documentChunks: data || [],
        chunkCount: data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents');
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
      
      toast.success('Knowledge base deleted');
      setSelectedKb(null);
      setDocuments([]);
      fetchKnowledgeBases();
    } catch (error) {
      console.error('Error deleting knowledge base:', error);
      toast.error('Failed to delete knowledge base');
    }
  }, [user, fetchKnowledgeBases]);

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
    setSelectedKb(kbId === selectedKb ? null : kbId);
    if (kbId !== selectedKb) {
      setDocuments([]);
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
      fixedDescription="Manage knowledge bases and view stored documents"
      inputs={[]}
      outputs={[{ id: 'context', type: 'context', label: 'Knowledge Base ID' }]}
    >
      <div className="space-y-3">
        {/* Refresh Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {knowledgeBases.length} knowledge base{knowledgeBases.length !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fetchKnowledgeBases();
            }}
            disabled={isLoading}
            className="nodrag h-6 px-2"
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
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
              <span className="text-xs text-muted-foreground">No knowledge bases yet</span>
              <span className="text-[10px] text-muted-foreground/70">Use Embedding node to create one</span>
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
              <span className="text-xs font-medium text-foreground/80">Documents</span>
              {isLoadingDocs && <Loader2 className="w-3 h-3 animate-spin" />}
            </div>
            
            <ScrollArea className="h-[100px] rounded-md border border-border/50 bg-background/30">
              {Object.keys(groupedDocuments).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs text-muted-foreground">No documents</span>
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
            <span className="text-[10px] text-teal-400">Selected KB ID:</span>
            <span className="text-[9px] text-muted-foreground block truncate">{selectedKb}</span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
