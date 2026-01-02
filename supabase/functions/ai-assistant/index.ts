import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AssistantMode = 'expand' | 'analyze' | 'brainstorm' | 'refine' | 'freestyle';
type AssistantTone = 'creative' | 'professional' | 'casual' | 'dramatic' | 'minimal';

const getModeSystemPrompt = (mode: AssistantMode, tone: AssistantTone, creativity: number, outputLength: string): string => {
  const lengthGuides: Record<string, string> = {
    short: '1-2 sentences, around 30-50 words',
    medium: '3-5 sentences, around 80-150 words', 
    long: '6-10 sentences, around 200-400 words',
  };
  const lengthGuide = lengthGuides[outputLength] || lengthGuides.medium;

  const toneGuide = {
    creative: 'Use vivid, imaginative, and artistic language. Embrace metaphors and evocative descriptions.',
    professional: 'Use precise, technical, and refined language. Focus on clarity and sophistication.',
    casual: 'Use friendly, approachable, and conversational language. Keep it relatable.',
    dramatic: 'Use intense, powerful, and emotionally charged language. Create impact and tension.',
    minimal: 'Use concise, clean, and essential language only. Strip away unnecessary words.',
  }[tone];

  const creativityGuide = creativity > 70 
    ? 'Be highly experimental and unique. Take creative risks. Surprise with unexpected combinations.'
    : creativity > 40 
    ? 'Balance creativity with coherence. Be imaginative but grounded.'
    : 'Stay close to conventional approaches. Focus on refinement over novelty.';

  const modePrompts: Record<AssistantMode, string> = {
    expand: `You are an expert creative prompt engineer for AI image generation. Transform concepts into detailed, vivid, and artistic prompts.

Guidelines:
- Add specific artistic styles (cinematic, photorealistic, anime, oil painting, etc.)
- Include lighting details (golden hour, dramatic shadows, soft diffused light)
- Mention composition elements (rule of thirds, centered, wide-angle)
- Add atmosphere and mood (ethereal, moody, vibrant, serene)
- Include technical quality keywords (8K, highly detailed, masterpiece)
- Keep the core concept intact but enhance it dramatically

${toneGuide}
${creativityGuide}
Target length: ${lengthGuide}

Output ONLY the enhanced prompt, nothing else.`,

    analyze: `You are an expert visual analyst. Analyze the given content and extract key visual elements, themes, and potential for image generation.

Your analysis should cover:
- Main subject and focal points
- Color palette and mood suggestions
- Composition recommendations
- Style references (artists, movements, techniques)
- Lighting and atmosphere notes

${toneGuide}
${creativityGuide}
Target length: ${lengthGuide}

Output a structured analysis that can inform creative decisions.`,

    brainstorm: `You are a creative ideation expert. Generate multiple variations and alternative concepts from the given input.

Guidelines:
- Provide 3-5 distinct creative directions
- Each variation should explore a different angle, style, or interpretation
- Include unexpected combinations and fresh perspectives
- Consider different mediums, time periods, or cultural influences

${toneGuide}
${creativityGuide}
Target length: ${lengthGuide}

Format as a list of ideas, each with a brief explanation.`,

    refine: `You are a prompt refinement specialist. Take the given prompt and improve its clarity, impact, and effectiveness.

Focus on:
- Removing redundancy and vague terms
- Strengthening descriptive language
- Optimizing keyword placement for AI image generators
- Ensuring logical flow and coherence
- Enhancing technical specifications

${toneGuide}
${creativityGuide}
Target length: ${lengthGuide}

Output the refined prompt only.`,

    freestyle: `You are a versatile AI creative assistant. Respond to the user's input in the most helpful and creative way possible.

${toneGuide}
${creativityGuide}
Target length: ${lengthGuide}

Adapt your response to best serve the user's apparent intent.`,
  };

  return modePrompts[mode] || modePrompts.expand;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      context,
      ragContext,
      hasImage, 
      imageUrl,
      mode = 'expand',
      tone = 'creative',
      creativity = 70,
      outputLength = 'medium',
      includeNegativePrompt = false,
      preserveStyle = false,
    } = await req.json();
    
    if (!prompt && !context && !hasImage) {
      return new Response(
        JSON.stringify({ error: "Prompt, context, or image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("AI Assistant processing:", { mode, tone, creativity, outputLength });
    console.log("Input prompt:", prompt?.substring(0, 100));
    console.log("Has context:", !!context);
    console.log("Has RAG context:", !!ragContext);
    console.log("Has image:", hasImage);

    let systemPrompt = getModeSystemPrompt(mode, tone, creativity, outputLength);

    // Add RAG context instruction (high priority - retrieved knowledge)
    if (ragContext) {
      systemPrompt += `\n\n## Retrieved Knowledge Context (RAG)
You have access to semantically relevant documents retrieved from a knowledge base. Use this context as your primary source of information to ground your response in factual, retrieved knowledge. The context contains the most relevant excerpts for the user's query:

---
${ragContext}
---

IMPORTANT: Base your response primarily on this retrieved context. If the context doesn't contain relevant information, acknowledge this limitation.`;
    }

    if (context) {
      systemPrompt += `\n\nYou have been provided with reference document content. Use it to inform the style, tone, or subject matter. Extract relevant visual elements, themes, or aesthetic cues from the document.`;
    }

    if (hasImage) {
      systemPrompt += `\n\nYou have been provided with a reference image. Analyze its visual style, colors, composition, lighting, and mood. Use these elements to inform and enhance your output${preserveStyle ? ', maintaining strong consistency with the reference style' : ''}.`;
    }

    if (includeNegativePrompt) {
      systemPrompt += `\n\nAlso generate a negative prompt that lists elements to avoid. Format your response as JSON: {"prompt": "your main prompt", "negativePrompt": "elements to avoid"}`;
    }

    // Build user message content
    const userContent: any[] = [];
    
    let textMessage = "";
    if (prompt) {
      const modeVerbs: Record<AssistantMode, string> = {
        expand: 'Enhance this concept into a detailed image generation prompt',
        analyze: 'Analyze this content and extract visual elements',
        brainstorm: 'Generate creative variations of this concept',
        refine: 'Refine and improve this prompt',
        freestyle: 'Help me with this',
      };
      textMessage = `${modeVerbs[mode as AssistantMode] || modeVerbs.expand}: "${prompt}"`;
    }
    
    if (context) {
      textMessage += `\n\nReference document content:\n---\n${context.substring(0, 5000)}\n---`;
    }
    
    if (!prompt && context) {
      textMessage = `Based on the following reference document, ${mode === 'analyze' ? 'analyze and extract visual elements' : 'create a detailed image generation prompt'} that captures its essence, themes, and visual style:\n\n${context.substring(0, 5000)}`;
    }

    if (hasImage && imageUrl) {
      userContent.push({
        type: "text",
        text: textMessage || `${mode === 'analyze' ? 'Analyze' : 'Create a prompt inspired by'} this reference image:`
      });
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl }
      });
    } else {
      userContent.push({
        type: "text",
        text: textMessage
      });
    }

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
          { role: "user", content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let resultContent = data.choices?.[0]?.message?.content?.trim();

    if (!resultContent) {
      throw new Error("No response from AI");
    }

    console.log("AI response received, length:", resultContent.length);

    // Parse JSON response if negative prompt was requested
    let result: { prompt: string; negativePrompt?: string };
    
    if (includeNegativePrompt) {
      try {
        // Try to extract JSON from the response
        const jsonMatch = resultContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = { prompt: resultContent };
        }
      } catch {
        result = { prompt: resultContent };
      }
    } else {
      result = { prompt: resultContent };
    }

    console.log("Processed result:", result.prompt.substring(0, 100) + "...");

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-assistant function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
