import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, topK = 5, threshold = 0.3, knowledgeBaseId } = await req.json();

    console.log('Retrieve documents request:', { query: query?.slice(0, 100), topK, threshold, knowledgeBaseId });

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Generate embedding using consistent hash method (same as storage)
    console.log('Generating query embedding with consistent hash method...');
    const queryEmbedding = generateHashEmbedding(query, 1536);
    console.log('Generated embedding with', queryEmbedding.length, 'dimensions');

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Format embedding as pgvector string
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Call the match_documents function
    console.log('Calling match_documents with threshold:', threshold, 'topK:', topK);
    const { data: documents, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: embeddingStr,
      match_threshold: threshold,
      match_count: topK,
      filter_knowledge_base_id: knowledgeBaseId || null,
    });

    if (matchError) {
      console.error('Match documents error:', matchError);
      throw new Error(`Erro na busca: ${matchError.message}`);
    }

    console.log(`Found ${documents?.length || 0} matching documents`);

    return new Response(
      JSON.stringify({
        documents: documents || [],
        query,
        embeddingDimensions: queryEmbedding.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Retrieve documents error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Consistent word-based embedding for semantic similarity (same as generate-embeddings)
function generateHashEmbedding(text: string, dimensions: number): number[] {
  const normalizedText = text.toLowerCase().trim();
  const embedding: number[] = [];
  
  // Use words as base for basic semantic consistency
  const words = normalizedText.split(/\s+/).filter(w => w.length > 2);
  const wordHashes = words.map(w => {
    let hash = 5381;
    for (let i = 0; i < w.length; i++) {
      hash = ((hash << 5) + hash) + w.charCodeAt(i);
    }
    return hash >>> 0;
  });
  
  for (let i = 0; i < dimensions; i++) {
    let value = 0;
    for (const hash of wordHashes) {
      value += Math.sin((hash * (i + 1)) * 0.0001);
    }
    value = value / (wordHashes.length || 1);
    embedding.push(Math.tanh(value));
  }
  
  // L2 normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}
