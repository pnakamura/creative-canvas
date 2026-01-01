import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChunkRequest {
  text: string;
  strategy: 'sentence' | 'paragraph' | 'fixed' | 'semantic';
  chunkSize: number;
  overlap: number;
  preserveSentences: boolean;
}

interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

// Simple token estimation (4 chars ~ 1 token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split by sentences
function splitBySentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Split by paragraphs
function splitByParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

// Create chunks with overlap
function createChunksWithOverlap(
  segments: string[],
  targetSize: number,
  overlapSize: number,
  preserveSentences: boolean
): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let offset = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment);
    
    if (currentTokens + segmentTokens > targetSize && currentChunk.length > 0) {
      // Save current chunk
      const content = currentChunk.join(' ');
      chunks.push({
        content,
        index: chunks.length,
        tokenCount: estimateTokens(content),
        startOffset: offset - content.length,
        endOffset: offset,
      });
      
      // Calculate overlap
      if (overlapSize > 0 && preserveSentences) {
        let overlapTokens = 0;
        const overlapSegments: string[] = [];
        
        for (let j = currentChunk.length - 1; j >= 0 && overlapTokens < overlapSize; j--) {
          overlapSegments.unshift(currentChunk[j]);
          overlapTokens += estimateTokens(currentChunk[j]);
        }
        
        currentChunk = overlapSegments;
        currentTokens = overlapTokens;
      } else {
        currentChunk = [];
        currentTokens = 0;
      }
    }
    
    currentChunk.push(segment);
    currentTokens += segmentTokens;
    offset += segment.length + 1;
  }
  
  // Add remaining content
  if (currentChunk.length > 0) {
    const content = currentChunk.join(' ');
    chunks.push({
      content,
      index: chunks.length,
      tokenCount: estimateTokens(content),
      startOffset: offset - content.length,
      endOffset: offset,
    });
  }
  
  return chunks;
}

// Fixed size chunking
function chunkByFixedSize(text: string, chunkSize: number, overlap: number): Chunk[] {
  const chunks: Chunk[] = [];
  const charSize = chunkSize * 4; // Approximate chars per token
  const charOverlap = overlap * 4;
  
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + charSize, text.length);
    const content = text.slice(i, end).trim();
    
    if (content.length > 0) {
      chunks.push({
        content,
        index: chunks.length,
        tokenCount: estimateTokens(content),
        startOffset: i,
        endOffset: end,
      });
    }
    
    i += charSize - charOverlap;
    if (i < 0) i = charSize; // Prevent infinite loop
  }
  
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, strategy, chunkSize, overlap, preserveSentences }: ChunkRequest = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Chunking ${text.length} chars with strategy: ${strategy}, size: ${chunkSize}, overlap: ${overlap}`);

    let chunks: Chunk[] = [];

    switch (strategy) {
      case 'sentence': {
        const sentences = splitBySentences(text);
        chunks = createChunksWithOverlap(sentences, chunkSize, overlap, preserveSentences);
        break;
      }
      
      case 'paragraph': {
        const paragraphs = splitByParagraphs(text);
        // For paragraphs, we might need to split large ones first
        const allSegments: string[] = [];
        for (const para of paragraphs) {
          if (estimateTokens(para) > chunkSize * 1.5) {
            // Split large paragraphs by sentences
            allSegments.push(...splitBySentences(para));
          } else {
            allSegments.push(para);
          }
        }
        chunks = createChunksWithOverlap(allSegments, chunkSize, overlap, preserveSentences);
        break;
      }
      
      case 'fixed': {
        chunks = chunkByFixedSize(text, chunkSize, overlap);
        break;
      }
      
      case 'semantic': {
        // For semantic chunking, we use paragraph strategy with sentence fallback
        // A true semantic chunker would use embeddings to find natural breaks
        const paragraphs = splitByParagraphs(text);
        const allSegments: string[] = [];
        
        for (const para of paragraphs) {
          if (estimateTokens(para) > chunkSize) {
            allSegments.push(...splitBySentences(para));
          } else {
            allSegments.push(para);
          }
        }
        
        chunks = createChunksWithOverlap(allSegments, chunkSize, overlap, true);
        break;
      }
      
      default:
        chunks = createChunksWithOverlap(splitByParagraphs(text), chunkSize, overlap, preserveSentences);
    }

    console.log(`Created ${chunks.length} chunks`);

    return new Response(
      JSON.stringify({ 
        chunks,
        totalChunks: chunks.length,
        totalTokens: chunks.reduce((acc, c) => acc + c.tokenCount, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Chunking error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
