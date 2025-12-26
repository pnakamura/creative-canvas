import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OutputType = 'report' | 'document' | 'infographic' | 'presentation' | 'mindmap' | 'analysis' | 'comparison' | 'summary';
type DepthLevel = 'brief' | 'standard' | 'detailed' | 'comprehensive';
type FormatStyle = 'structured' | 'narrative' | 'bullet-points' | 'academic';

interface AnalysisRequest {
  primaryText: string;
  referenceText?: string;
  referenceSource?: string;
  outputType: OutputType;
  depth: DepthLevel;
  format: FormatStyle;
  includeMetrics: boolean;
  includeRecommendations: boolean;
  language: string;
  focusAreas: string[];
}

const getOutputTypeSystemPrompt = (type: OutputType, hasReference: boolean): string => {
  const basePrompts: Record<OutputType, string> = {
    report: `You are an expert report writer. Generate a comprehensive, structured report prompt that can be used to create professional documentation. Include sections for executive summary, key findings, detailed analysis, and conclusions.`,
    
    document: `You are an expert document specialist. Generate a formal document prompt suitable for official communications, legal documents, or business correspondence. Focus on clarity, precision, and professional formatting.`,
    
    infographic: `You are an infographic designer. Generate a detailed prompt for creating a visual infographic. Break down complex information into visual elements: charts, icons, flow diagrams, statistics, and key takeaways. Structure it with clear visual hierarchy.`,
    
    presentation: `You are a presentation expert. Generate a slide-by-slide prompt for creating an impactful presentation. Include: title slide, agenda, key sections with bullet points, data visualizations suggestions, and a compelling conclusion slide.`,
    
    mindmap: `You are a concept mapping specialist. Generate a hierarchical mindmap structure prompt. Define central theme, main branches (3-7), sub-branches with details, and connections between related concepts. Use clear node labels.`,
    
    analysis: `You are a data analyst. Generate a thorough analytical prompt covering: methodology, data points to examine, comparative analysis framework, trend identification, and actionable insights.`,
    
    comparison: `You are a comparison specialist. Generate a systematic comparison prompt with: comparison criteria matrix, similarities, differences, advantages/disadvantages of each element, and a comparative conclusion.`,
    
    summary: `You are an executive summary expert. Generate a concise yet comprehensive summary prompt that captures: key points, critical insights, main conclusions, and recommended actions in a digestible format.`,
  };

  let prompt = basePrompts[type];
  
  if (hasReference) {
    prompt += `\n\nIMPORTANT: You have TWO texts to work with:
    1. PRIMARY TEXT: The main content to analyze
    2. REFERENCE TEXT: A reference document to compare against or use as context
    
    Your analysis should explicitly compare and contrast both texts, identifying alignments, gaps, and deviations.`;
  }

  return prompt;
};

const getDepthInstructions = (depth: DepthLevel): string => {
  const instructions: Record<DepthLevel, string> = {
    brief: 'Keep the output concise (200-400 words). Focus only on the most critical elements.',
    standard: 'Provide moderate detail (400-800 words). Cover main points with adequate explanation.',
    detailed: 'Be thorough (800-1500 words). Include detailed analysis with examples and nuances.',
    comprehensive: 'Create an exhaustive analysis (1500+ words). Leave no stone unturned, include all relevant details, edge cases, and deep insights.',
  };
  return instructions[depth];
};

const getFormatInstructions = (format: FormatStyle): string => {
  const instructions: Record<FormatStyle, string> = {
    structured: 'Use clear headers, numbered sections, and organized subsections.',
    narrative: 'Write in flowing prose with logical paragraph transitions.',
    'bullet-points': 'Prioritize bullet points and short, scannable items.',
    academic: 'Follow academic writing conventions with citations, methodology, and formal language.',
  };
  return instructions[format];
};

const extractMetrics = (primaryText: string, referenceText?: string): Record<string, any> => {
  const wordCount = (text: string) => text.split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = (text: string) => text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphCount = (text: string) => text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  
  const metrics: Record<string, any> = {
    primary_words: wordCount(primaryText),
    primary_sentences: sentenceCount(primaryText),
    primary_paragraphs: paragraphCount(primaryText),
    avg_sentence_length: Math.round(wordCount(primaryText) / Math.max(1, sentenceCount(primaryText))),
  };

  if (referenceText) {
    metrics.reference_words = wordCount(referenceText);
    metrics.word_difference = metrics.primary_words - metrics.reference_words;
    metrics.length_ratio = Number((metrics.primary_words / Math.max(1, metrics.reference_words)).toFixed(2));
  }

  return metrics;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: AnalysisRequest = await req.json();
    const {
      primaryText,
      referenceText,
      referenceSource,
      outputType = 'report',
      depth = 'detailed',
      format = 'structured',
      includeMetrics = true,
      includeRecommendations = true,
      language = 'pt-BR',
      focusAreas = [],
    } = body;

    if (!primaryText || primaryText.trim().length === 0) {
      throw new Error("Primary text is required");
    }

    const hasReference = !!referenceText && referenceText.trim().length > 0;
    
    // Calculate metrics
    const metrics = includeMetrics ? extractMetrics(primaryText, referenceText) : undefined;

    // Build system prompt
    const systemPrompt = `${getOutputTypeSystemPrompt(outputType, hasReference)}

${getDepthInstructions(depth)}
${getFormatInstructions(format)}

${language !== 'en' ? `IMPORTANT: Generate ALL output in ${language}.` : ''}

${focusAreas.length > 0 ? `Focus especially on these areas: ${focusAreas.join(', ')}` : ''}

${includeRecommendations ? 'Include actionable recommendations based on your analysis.' : ''}

Your response MUST be a valid JSON object with this structure:
{
  "prompt": "A detailed, ready-to-use prompt that another AI or system can use to generate the final ${outputType}",
  "sections": [
    { "title": "Section Name", "description": "Brief description of what this section covers" }
  ],
  "keyInsights": ["insight1", "insight2", "insight3"],
  ${includeRecommendations ? '"recommendations": ["recommendation1", "recommendation2"],' : ''}
  "metadata": {
    "estimatedLength": "number of pages/slides/nodes depending on output type",
    "complexity": "low|medium|high",
    "primaryFocus": "main theme identified"
  }
}`;

    // Build user message
    let userMessage = `PRIMARY TEXT TO ANALYZE:\n\n${primaryText}`;
    
    if (hasReference) {
      userMessage += `\n\n---\n\nREFERENCE TEXT (${referenceSource || 'Reference Document'}):\n\n${referenceText}`;
    }

    userMessage += `\n\n---\n\nGenerate a ${outputType} prompt based on this content. The prompt should be comprehensive enough that another system can use it to create a complete ${outputType}.`;

    console.log(`Processing text analysis: type=${outputType}, depth=${depth}, hasReference=${hasReference}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("API credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from AI");
    }

    console.log("Raw AI response:", content.substring(0, 500));

    // Parse the JSON response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        analysisResult = {
          prompt: content,
          sections: [{ title: "Analysis", description: "Generated analysis content" }],
          keyInsights: ["Analysis completed successfully"],
          metadata: {
            estimatedLength: "1-2 pages",
            complexity: "medium",
            primaryFocus: outputType,
          },
        };
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      analysisResult = {
        prompt: content,
        sections: [{ title: "Analysis", description: "Generated content" }],
        keyInsights: [],
        metadata: { complexity: "medium" },
      };
    }

    // Add metrics to the result
    if (metrics) {
      analysisResult.metrics = metrics;
    }

    return new Response(
      JSON.stringify({ 
        result: {
          prompt: analysisResult.prompt,
          analysis: analysisResult,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Text analyzer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
