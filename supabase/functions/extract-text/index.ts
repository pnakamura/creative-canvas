import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable AI Gateway for PDF extraction
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ExtractionResult {
  text: string;
  metadata: {
    fileName: string;
    fileType: string;
    pages?: number;
    characterCount: number;
    wordCount: number;
    extractedAt: string;
    extractionMethod?: string;
  };
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Extract text from PDF using Gemini AI (handles large files and scanned PDFs)
async function extractPdfWithGemini(
  arrayBuffer: ArrayBuffer, 
  fileName: string
): Promise<{ text: string; pages: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  
  console.log(`Using Gemini for PDF extraction: ${fileName}, ${arrayBuffer.byteLength} bytes`);
  const startTime = Date.now();
  
  // Convert to base64
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  
  console.log(`Base64 conversion complete: ${base64.length} chars`);
  
  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${base64}`
              }
            },
            {
              type: "text",
              text: "Extract ALL text content from this PDF document. Preserve the structure with headers, paragraphs, bullet points, and numbered lists. Output ONLY the extracted text content, no commentary or explanations."
            }
          ]
        }
      ],
      max_tokens: 100000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini extraction failed: ${response.status}`);
  }

  const result = await response.json();
  const extractedText = result.choices?.[0]?.message?.content || '';
  
  // Estimate pages from content length
  const estimatedPages = Math.max(1, Math.ceil(extractedText.length / 3000));
  
  const elapsed = Date.now() - startTime;
  console.log(`Gemini extracted ${extractedText.length} chars, ~${estimatedPages} pages, ${elapsed}ms`);
  
  return {
    text: extractedText || '[No text content found in PDF]',
    pages: estimatedPages
  };
}

// Extract text from PDF using basic binary parsing (fallback for small PDFs)
async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<{ text: string; pages: number }> {
  try {
    console.log(`Starting basic PDF extraction, size: ${arrayBuffer.byteLength} bytes`);
    const startTime = Date.now();
    
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const content = decoder.decode(bytes);
    
    const pageMatches = content.match(/\/Type\s*\/Page[^s]/g) || [];
    const numPages = Math.max(pageMatches.length, 1);
    
    const textParts: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(content)) !== null) {
      const streamContent = match[1];
      const textOpRegex = /\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ|'([^']*)'/g;
      let textMatch;
      
      while ((textMatch = textOpRegex.exec(streamContent)) !== null) {
        const text = textMatch[1] || textMatch[2] || textMatch[3] || '';
        const cleaned = text
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
        
        if (cleaned.trim()) {
          textParts.push(cleaned);
        }
      }
    }
    
    let extractedText = textParts.join(' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .trim();
    
    const elapsed = Date.now() - startTime;
    console.log(`Basic PDF extraction: ${extractedText.length} chars, ${numPages} pages, ${elapsed}ms`);
    
    return {
      text: extractedText || '[PDF text extraction limited]',
      pages: numPages
    };
  } catch (error) {
    console.error('Basic PDF extraction error:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract text from DOCX
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(arrayBuffer);
    
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
    const extractedParts: string[] = [];
    
    for (const match of textMatches) {
      const text = match.replace(/<[^>]+>/g, '');
      if (text.trim()) {
        extractedParts.push(text);
      }
    }
    
    let text = extractedParts.join(' ').replace(/\s+/g, ' ').trim();
    
    if (text.length < 100) {
      const paragraphs = content.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/gi) || [];
      const paragraphTexts: string[] = [];
      
      for (const p of paragraphs) {
        const pTextMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
        const pText = pTextMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
        if (pText.trim()) {
          paragraphTexts.push(pText.trim());
        }
      }
      
      text = paragraphTexts.join('\n\n');
    }
    
    return text || '[Could not extract text from DOCX]';
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '[Error extracting DOCX content]';
  }
}

// Extract text from HTML
function extractHtmlText(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  
  return text.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, type, fileName } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting text from ${type} file: ${fileName}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    let extractedText = '';
    let pages: number | undefined;
    let extractionMethod = 'direct';
    const contentType = response.headers.get('content-type') || '';

    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    const isDocx = extension === 'docx' || contentType.includes('openxmlformats-officedocument');
    const isHtml = extension === 'html' || extension === 'htm' || contentType.includes('text/html');
    const isPdf = type === 'pdf' || extension === 'pdf' || contentType.includes('application/pdf');
    const isMarkdown = extension === 'md' || extension === 'markdown';

    if (isPdf) {
      const arrayBuffer = await response.arrayBuffer();
      const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
      
      // Use Gemini for PDFs > 500KB (most PDFs with real content)
      if (arrayBuffer.byteLength > 500_000) {
        console.log(`Using Gemini AI for ${fileSizeMB.toFixed(2)}MB PDF`);
        extractionMethod = 'gemini-ai';
        
        const pdfResult = await withTimeout(
          extractPdfWithGemini(arrayBuffer, fileName),
          90000, // 90 second timeout for AI processing
          'PDF extraction timed out - file may be too complex'
        );
        extractedText = pdfResult.text;
        pages = pdfResult.pages;
      } else {
        console.log(`Using basic parsing for small PDF (${fileSizeMB.toFixed(2)}MB)`);
        extractionMethod = 'basic-pdf';
        const pdfResult = await extractPdfText(arrayBuffer);
        extractedText = pdfResult.text;
        pages = pdfResult.pages;
      }
    } else if (isDocx) {
      extractionMethod = 'docx-xml';
      const arrayBuffer = await response.arrayBuffer();
      extractedText = await extractDocxText(arrayBuffer);
    } else if (isHtml) {
      extractionMethod = 'html-strip';
      const html = await response.text();
      extractedText = extractHtmlText(html);
    } else {
      extractionMethod = 'text';
      extractedText = await response.text();
      
      if (extractedText.includes('<html') || extractedText.includes('<body')) {
        extractedText = extractHtmlText(extractedText);
      }
    }

    const characterCount = extractedText.length;
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;

    const maxChars = 50000;
    if (extractedText.length > maxChars) {
      extractedText = extractedText.substring(0, maxChars) + '\n\n[Content truncated...]';
    }

    console.log(`Extracted ${characterCount} chars, ${wordCount} words from ${fileName} using ${extractionMethod}`);

    const result: ExtractionResult = {
      text: extractedText,
      metadata: {
        fileName: fileName || 'unknown',
        fileType: isPdf ? 'pdf' : isDocx ? 'docx' : isHtml ? 'html' : isMarkdown ? 'markdown' : 'text',
        pages,
        characterCount,
        wordCount,
        extractedAt: new Date().toISOString(),
        extractionMethod,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Text extraction error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Extraction failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});