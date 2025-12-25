import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Expanding prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert creative prompt engineer for AI image generation. Your task is to take a simple concept and transform it into a detailed, vivid, and artistic prompt that will produce stunning visuals.

Guidelines:
- Add specific artistic styles (e.g., cinematic, photorealistic, anime, oil painting)
- Include lighting details (e.g., golden hour, dramatic shadows, soft diffused light)
- Mention composition elements (e.g., rule of thirds, centered, wide-angle)
- Add atmosphere and mood (e.g., ethereal, moody, vibrant, serene)
- Include technical quality keywords (e.g., 8K, highly detailed, masterpiece)
- Keep the core concept intact but enhance it dramatically
- Output ONLY the enhanced prompt, nothing else. No explanations or prefixes.`
          },
          {
            role: "user",
            content: `Enhance this concept into a detailed image generation prompt: "${prompt}"`
          }
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
    const expandedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!expandedPrompt) {
      throw new Error("No response from AI");
    }

    console.log("Expanded prompt:", expandedPrompt);

    return new Response(
      JSON.stringify({ expandedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in expand-prompt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
