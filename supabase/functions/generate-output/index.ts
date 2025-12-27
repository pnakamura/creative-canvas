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
    const { type, prompt, analysisResult, settings } = await req.json();

    console.log(`Generating ${type} output...`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = buildSystemPrompt(type, settings);
    const userPrompt = buildUserPrompt(type, prompt, analysisResult, settings);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const result = {
      content,
      format: settings?.format || 'markdown',
      preview: content.slice(0, 300),
      metadata: {
        title: extractTitle(content),
        sections: countSections(content),
        wordCount: content.split(/\s+/).length,
        generatedAt: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-output error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildSystemPrompt(type: string, settings: any): string {
  const basePrompts: Record<string, string> = {
    report: `You are an expert report writer. Create comprehensive, well-structured reports with clear sections, executive summaries, and actionable insights. Style: ${settings?.style || 'formal'}. Language: ${settings?.language || 'pt-BR'}.`,
    document: `You are a professional document writer specializing in ${settings?.templateType || 'business'} documents. Create formal, well-formatted documents following standard conventions. Style: ${settings?.style || 'business'}. Language: ${settings?.language || 'pt-BR'}.`,
    infographic: `You are an infographic content strategist. Create structured content optimized for visual representation with clear data points, statistics, and hierarchical information. Theme: ${settings?.theme || 'modern'}. Layout: ${settings?.layout || 'vertical'}.`,
    presentation: `You are a presentation expert. Create slide deck content with clear titles, bullet points, and speaker notes for each slide. Theme: ${settings?.theme || 'modern'}. Target: ${settings?.slidesCount || 10} slides.`,
    mindmap: `You are a knowledge architect. Create hierarchical mind map structures with central concepts, main branches, and sub-topics. Layout: ${settings?.layout || 'radial'}. Max depth: ${settings?.maxDepth || 4}.`,
  };

  return basePrompts[type] || 'You are a helpful content generator.';
}

function buildUserPrompt(type: string, prompt: string, analysisResult: any, settings: any): string {
  let userPrompt = `Based on the following content, generate a ${type}:\n\n${prompt}`;

  if (analysisResult) {
    if (analysisResult.sections?.length) {
      userPrompt += `\n\nKey sections to cover:\n${analysisResult.sections.map((s: any) => `- ${s.title}: ${s.description}`).join('\n')}`;
    }
    if (analysisResult.keyInsights?.length) {
      userPrompt += `\n\nKey insights:\n${analysisResult.keyInsights.map((i: string) => `- ${i}`).join('\n')}`;
    }
  }

  // Type-specific instructions
  const typeInstructions: Record<string, string> = {
    report: `\n\nInclude:\n${settings?.includeExecutiveSummary ? '- Executive Summary\n' : ''}${settings?.includeTableOfContents ? '- Table of Contents\n' : ''}${settings?.includeCharts ? '- Chart/data visualization suggestions\n' : ''}${settings?.includeReferences ? '- References section\n' : ''}Maximum sections: ${settings?.maxSections || 10}`,
    document: `\n\nDocument type: ${settings?.templateType || 'memo'}\n${settings?.includeHeader ? 'Include header\n' : ''}${settings?.includeFooter ? 'Include footer\n' : ''}${settings?.includeSignature ? 'Include signature block\n' : ''}`,
    infographic: `\n\nGenerate content for a ${settings?.layout || 'vertical'} infographic with:\n- Clear headline\n- ${settings?.maxElements || 12} visual elements maximum\n${settings?.includeStatistics ? '- Key statistics and numbers\n' : ''}${settings?.includeIcons ? '- Icon suggestions for each section\n' : ''}Color scheme: ${settings?.colorScheme || 'auto'}`,
    presentation: `\n\nCreate exactly ${settings?.slidesCount || 10} slides with:\n- Slide title\n- 3-5 bullet points per slide\n${settings?.includeSpeakerNotes ? '- Speaker notes\n' : ''}${settings?.includeImages ? '- Image suggestions\n' : ''}${settings?.includeCharts ? '- Chart suggestions where relevant\n' : ''}Aspect ratio: ${settings?.aspectRatio || '16:9'}`,
    mindmap: `\n\nCreate a ${settings?.layout || 'radial'} mind map with:\n- Central concept\n- Up to ${settings?.maxBranches || 6} main branches\n- Maximum depth of ${settings?.maxDepth || 4} levels\n${settings?.includeDescriptions ? '- Brief descriptions for each node\n' : ''}${settings?.includeIcons ? '- Icon suggestions\n' : ''}Connection style: ${settings?.connectionStyle || 'curved'}`,
  };

  userPrompt += typeInstructions[type] || '';

  return userPrompt;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m) || content.match(/^(.+)\n={3,}/m);
  return match?.[1] || 'Generated Content';
}

function countSections(content: string): number {
  const headings = content.match(/^#{1,3}\s+.+$/gm);
  return headings?.length || 1;
}
