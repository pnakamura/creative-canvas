-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge_bases table to organize documents
CREATE TABLE public.knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  document_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_chunks table with vector embedding
CREATE TABLE public.document_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  document_id TEXT NOT NULL,
  document_name TEXT,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create query_history table for caching and suggestions
CREATE TABLE public.query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_embedding vector(1536),
  results JSONB,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_bases
CREATE POLICY "Users can view their own knowledge bases"
  ON public.knowledge_bases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own knowledge bases"
  ON public.knowledge_bases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge bases"
  ON public.knowledge_bases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge bases"
  ON public.knowledge_bases FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for document_chunks
CREATE POLICY "Users can view their own document chunks"
  ON public.document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document chunks"
  ON public.document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document chunks"
  ON public.document_chunks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks"
  ON public.document_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for query_history
CREATE POLICY "Users can view their own query history"
  ON public.query_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own query history"
  ON public.query_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own query history"
  ON public.query_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for efficient vector search (using IVFFlat for scalability)
CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_document_chunks_knowledge_base ON public.document_chunks(knowledge_base_id);
CREATE INDEX idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX idx_query_history_knowledge_base ON public.query_history(knowledge_base_id);

-- Create function to update knowledge_base counts
CREATE OR REPLACE FUNCTION public.update_knowledge_base_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.knowledge_bases 
    SET chunk_count = chunk_count + 1,
        updated_at = now()
    WHERE id = NEW.knowledge_base_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.knowledge_bases 
    SET chunk_count = chunk_count - 1,
        updated_at = now()
    WHERE id = OLD.knowledge_base_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-update chunk counts
CREATE TRIGGER update_kb_counts_on_chunk_change
  AFTER INSERT OR DELETE ON public.document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_base_counts();

-- Add updated_at trigger for knowledge_bases
CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for semantic search
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_knowledge_base_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  document_id text,
  document_name text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.document_id,
    dc.document_name,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) as similarity,
    dc.metadata
  FROM public.document_chunks dc
  WHERE 
    (filter_knowledge_base_id IS NULL OR dc.knowledge_base_id = filter_knowledge_base_id)
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;