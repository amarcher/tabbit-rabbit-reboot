import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: "image_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the image and convert to base64
    const imageResponse = await fetch(image_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Image = btoa(binary);
    const rawType = imageResponse.headers.get("content-type") || "image/jpeg";
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mediaType = allowedTypes.includes(rawType) ? rawType : "image/jpeg";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: 'Extract all line items with prices from this receipt image. Return ONLY valid JSON with this exact structure: { "items": [{ "description": "Item name", "price": 12.99 }], "subtotal": 25.98, "tax": 2.27, "total": 28.25 }. Prices should be numbers (dollars, not cents). If you cannot read an item, skip it. Do not include tax or tip as line items.',
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from vision model", details: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON from the model response (strip markdown code fences if present)
    const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
