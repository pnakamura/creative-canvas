import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - pdfjs-serverless is a valid Deno import
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Extract text from PDF using pdfjs-serverless (no web worker required)
async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<{ text: string; pages: number }> {
  try {
    console.log(`Starting PDF extraction, size: ${arrayBuffer.byteLength} bytes`);
    const startTime = Date.now();
    
    // Load the PDF using pdfjs-serverless with proper options
    const doc = await withTimeout(
      getDocument({
        data: new Uint8Array(arrayBuffer),
        useSystemFonts: true,
      }).promise,
      30000,
      'PDF loading timed out - file may be too large or corrupted'
    ) as any;
    
    const numPages = doc.numPages;
    console.log(`PDF loaded: ${numPages} pages`);
    
    const textParts: string[] = [];
    const maxPages = Math.min(numPages, 50);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        
        if (pageText.trim()) {
          textParts.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
        }
      } catch (pageError) {
        console.error(`Error extracting page ${pageNum}:`, pageError);
        textParts.push(`--- Page ${pageNum} ---\n[Error extracting this page]`);
      }
    }
    
    if (numPages > maxPages) {
      textParts.push(`\n[Note: Only first ${maxPages} of ${numPages} pages were extracted]`);
    }
    
    const extractedText = textParts.join('\n\n');
    const elapsed = Date.now() - startTime;
    
    console.log(`PDF extraction complete: ${extractedText.length} chars, ${numPages} pages, ${elapsed}ms`);
    
    return {
      text: extractedText || '[No text content found in PDF - may be a scanned/image PDF]',
      pages: numPages
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract text from DOCX (which is a ZIP containing XML)
async function extractDocxText(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // DOCX is a ZIP file, we need to find document.xml
    // For now, we'll use a simple regex approach on the raw content
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(arrayBuffer);
    
    // Look for text between <w:t> tags (Word text elements)
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/gi) || [];
    const extractedParts: string[] = [];
    
    for (const match of textMatches) {
      const text = match.replace(/<[^>]+>/g, '');
      if (text.trim()) {
        extractedParts.push(text);
      }
    }
    
    // Join with spaces, collapse multiple spaces
    let text = extractedParts.join(' ').replace(/\s+/g, ' ').trim();
    
    // If that didn't work well, try paragraph detection
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
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Replace block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));
  
  // Clean up whitespace
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

    // Fetch the file content
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    let extractedText = '';
    let pages: number | undefined;
    let extractionMethod = 'direct';
    const contentType = response.headers.get('content-type') || '';

    // Determine file type from extension or content-type
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    const isDocx = extension === 'docx' || contentType.includes('openxmlformats-officedocument');
    const isHtml = extension === 'html' || extension === 'htm' || contentType.includes('text/html');
    const isPdf = type === 'pdf' || extension === 'pdf' || contentType.includes('application/pdf');
    const isMarkdown = extension === 'md' || extension === 'markdown';

    if (isPdf) {
      // Real PDF extraction using PDF.js
      console.log('Using PDF.js for extraction');
      extractionMethod = 'pdfjs';
      const arrayBuffer = await response.arrayBuffer();
      const pdfResult = await extractPdfText(arrayBuffer);
      extractedText = pdfResult.text;
      pages = pdfResult.pages;
    } else if (isDocx) {
      // DOCX extraction
      extractionMethod = 'docx-xml';
      const arrayBuffer = await response.arrayBuffer();
      extractedText = await extractDocxText(arrayBuffer);
    } else if (isHtml) {
      // HTML extraction
      extractionMethod = 'html-strip';
      const html = await response.text();
      extractedText = extractHtmlText(html);
    } else {
      // Plain text, markdown, or other text files
      extractionMethod = 'text';
      extractedText = await response.text();
      
      // Clean up if it looks like it might have some markup
      if (extractedText.includes('<html') || extractedText.includes('<body')) {
        extractedText = extractHtmlText(extractedText);
      }
    }

    // Calculate metadata
    const characterCount = extractedText.length;
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;

    // Truncate if too long (keep first 50000 chars for context)
    const maxChars = 50000;
    const wasTruncated = extractedText.length > maxChars;
    if (wasTruncated) {
      extractedText = extractedText.substring(0, maxChars) + '\n\n[Content truncated... Original document has more content]';
    }

    console.log(`Extracted ${characterCount} characters, ${wordCount} words from ${fileName} using ${extractionMethod}`);

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
