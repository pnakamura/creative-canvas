import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (type === 'text') {
      // For plain text and markdown files
      extractedText = await response.text();
    } else if (type === 'pdf') {
      // For PDFs, we'll return a placeholder message
      // Full PDF parsing would require a library like pdf-parse
      // which adds complexity. For now, provide guidance.
      extractedText = `[PDF Content from: ${fileName}]\n\nNote: Full PDF text extraction requires additional processing. The file URL is available for direct viewing or processing by AI vision models.`;
      
      // In a production app, you could:
      // 1. Use pdf-parse library (npm package)
      // 2. Use external API like Adobe PDF Services
      // 3. Use AI vision to extract text from PDF pages
    }

    // Truncate if too long (keep first 10000 chars for context)
    if (extractedText.length > 10000) {
      extractedText = extractedText.substring(0, 10000) + '\n\n[Content truncated...]';
    }

    console.log(`Extracted ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({ text: extractedText }),
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
