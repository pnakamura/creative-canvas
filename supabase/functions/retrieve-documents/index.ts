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

    // Generate embedding using semantic AI (same method as storage)
    console.log('Generating query embedding with Lovable AI (semantic)...');
    const { embedding: queryEmbedding, method: embeddingMethod } = await generateQueryEmbedding(query, LOVABLE_API_KEY, 1536);
    console.log(`Generated embedding with ${queryEmbedding.length} dimensions using method: ${embeddingMethod}`);

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Format embedding as pgvector string
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Call match_documents with a very low threshold to get all candidates, then filter
    // This helps debug similarity issues
    const baseThreshold = 0.0;
    console.log(`Calling match_documents with base threshold: ${baseThreshold}, topK: ${topK * 2}`);
    
    const { data: allDocuments, error: matchError } = await supabase.rpc('match_documents', {
      query_embedding: embeddingStr,
      match_threshold: baseThreshold,
      match_count: Math.max(topK * 2, 20), // Get more candidates for debugging
      filter_knowledge_base_id: knowledgeBaseId || null,
    });

    if (matchError) {
      console.error('Match documents error:', matchError);
      throw new Error(`Erro na busca: ${matchError.message}`);
    }

    // Log top similarities for debugging
    const topSimilarities = (allDocuments || []).slice(0, 5).map((d: any) => ({
      similarity: d.similarity?.toFixed(4),
      content: d.content?.slice(0, 50),
    }));
    console.log('Top 5 similarities (pre-filter):', JSON.stringify(topSimilarities));

    // Filter by user-requested threshold
    const filteredDocuments = (allDocuments || [])
      .filter((doc: any) => doc.similarity >= threshold)
      .slice(0, topK);

    console.log(`Found ${allDocuments?.length || 0} candidates, ${filteredDocuments.length} after threshold filter (${threshold})`);

    return new Response(
      JSON.stringify({
        documents: filteredDocuments,
        query,
        embeddingDimensions: queryEmbedding.length,
        embeddingMethod,
        debug: {
          totalCandidates: allDocuments?.length || 0,
          topSimilarities: topSimilarities.slice(0, 3),
          appliedThreshold: threshold,
        },
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

// Generate query embedding using the same method as storage (Lovable AI with fallback)
async function generateQueryEmbedding(
  text: string,
  apiKey: string,
  dimensions: number
): Promise<{ embedding: number[]; method: 'ai' | 'hash' }> {
  try {
    // Use Lovable AI to generate a semantic representation (same as generate-embeddings)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a text embedding generator. Given text, output ONLY a JSON array of ${Math.min(dimensions, 64)} floating point numbers between -1 and 1 that represent the semantic meaning of the text. No explanation, just the array.`,
          },
          {
            role: 'user',
            content: text.slice(0, 1000), // Limit text length
          },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.warn('AI embedding failed, using hash-based fallback');
      return { embedding: generateHashEmbedding(text, dimensions), method: 'hash' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    try {
      // Try to parse the embedding from the response
      const match = content.match(/\[[\d\s,.\-e]+\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Pad or truncate to target dimensions
          const normalized = padOrTruncate(parsed, dimensions);
          // L2 normalize
          const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
          const finalEmbedding = normalized.map(val => val / (magnitude || 1));
          return { embedding: finalEmbedding, method: 'ai' };
        }
      }
    } catch {
      console.warn('Failed to parse AI embedding, using fallback');
    }
    
    return { embedding: generateHashEmbedding(text, dimensions), method: 'hash' };
  } catch (error) {
    console.error('Query embedding generation error:', error);
    return { embedding: generateHashEmbedding(text, dimensions), method: 'hash' };
  }
}

// Consistent word-based embedding for semantic similarity (fallback)
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

function padOrTruncate(arr: number[], targetLength: number): number[] {
  if (arr.length >= targetLength) {
    return arr.slice(0, targetLength);
  }
  
  // Pad with interpolated values
  const result = [...arr];
  while (result.length < targetLength) {
    const idx = result.length % arr.length;
    const noise = (Math.sin(result.length * 7) + 1) / 2 * 0.1;
    result.push(arr[idx] + noise - 0.05);
  }
  
  return result;
}
