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
    const { query, topK = 5, threshold = 0.7, knowledgeBaseId } = await req.json();

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

    // Generate embedding for the query using Lovable AI
    console.log('Generating query embedding...');
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an embedding generator. Return ONLY a JSON array of 1536 floating point numbers between -1 and 1 that represent the semantic embedding of the user text. No explanation, just the array.'
          },
          {
            role: 'user',
            content: `Generate a semantic embedding vector for: "${query}"`
          }
        ],
        temperature: 0,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', embeddingResponse.status, errorText);
      throw new Error(`Erro ao gerar embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embeddingContent = embeddingData.choices?.[0]?.message?.content || '';
    
    // Parse the embedding from the response
    let queryEmbedding: number[];
    try {
      // Try to extract JSON array from response
      const jsonMatch = embeddingContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        queryEmbedding = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No embedding array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse embedding, using hash-based fallback');
      // Fallback: generate deterministic hash-based embedding
      queryEmbedding = generateHashEmbedding(query, 1536);
    }

    // Ensure correct dimensions
    if (queryEmbedding.length !== 1536) {
      console.log(`Adjusting embedding dimensions from ${queryEmbedding.length} to 1536`);
      if (queryEmbedding.length > 1536) {
        queryEmbedding = queryEmbedding.slice(0, 1536);
      } else {
        while (queryEmbedding.length < 1536) {
          queryEmbedding.push(0);
        }
      }
    }

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

// Fallback hash-based embedding generator
function generateHashEmbedding(text: string, dimensions: number): number[] {
  const embedding: number[] = [];
  const normalizedText = text.toLowerCase().trim();
  
  for (let i = 0; i < dimensions; i++) {
    let hash = 0;
    for (let j = 0; j < normalizedText.length; j++) {
      const char = normalizedText.charCodeAt(j);
      hash = ((hash << 5) - hash + char * (i + 1)) | 0;
    }
    // Normalize to [-1, 1]
    embedding.push(Math.sin(hash) * 0.5 + Math.cos(hash * 0.7) * 0.5);
  }
  
  // L2 normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}
