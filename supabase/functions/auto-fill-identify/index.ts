import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Verify the user is authenticated
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { html } = await req.json()
    if (!html || typeof html !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing html field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Truncate very long documents to stay within context limits
    const maxChars = 80000
    const truncatedHtml =
      html.length > maxChars ? html.slice(0, maxChars) + "\n[Document truncated]" : html

    const systemPrompt = `You are an RFP analysis assistant. You will receive an HTML document that is an RFP (Request for Proposal) template or questionnaire.

Your job is to identify the MAJOR SECTIONS of the document that need responses, and within each section, list the specific items or questions that need to be answered.

Group related questions, fields, and placeholders into logical sections (e.g., "Cover Page", "Cover Letter", "Technical Approach"). Aim for roughly 3-10 top-level sections depending on the document's size and structure.

What counts as needing a response:
- Bracketed placeholders like [Company Name] or [Insert response here]
- Questions that need narrative answers (e.g., "Describe your approach to...")
- Blank fields, underscores, or "TBD" markers
- Sections with instructions to fill in information
- Any area where content clearly needs to be provided by the responder

For each top-level section, provide:
- id: A unique short identifier (e.g., "section-1")
- location: A human-readable label (e.g., "Cover Page", "Section 3: Technical Approach")
- items: An array of specific items within this section, each with:
  - id: A unique identifier (e.g., "s1-1", "s1-2")
  - label: A short description of what needs to be filled (e.g., "Company Name", "Project timeline")
  - prompt: A clear prompt for an AI to answer this item about an education technology company
  - originalText: The EXACT text from the document that should be replaced, including brackets if present (e.g., "[Company Name]", "[Insert response here]", "[District / Organization Name]"). This must match the document text exactly so it can be found and replaced.

Return your response as a JSON object with this exact structure:
{
  "sections": [
    {
      "id": "section-1",
      "location": "Cover Page",
      "items": [
        { "id": "s1-1", "label": "Company Name", "prompt": "Provide the full legal company name", "originalText": "[Company Name]" },
        { "id": "s1-2", "label": "Date", "prompt": "Provide today's date", "originalText": "[Date]" }
      ]
    }
  ]
}

Return ONLY the JSON object, no other text.`

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Here is the RFP document to analyze:\n\n${truncatedHtml}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(
        JSON.stringify({
          error: `Claude API error: ${response.status} ${errText}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const result = await response.json()
    const text = result.content?.[0]?.text ?? ""

    // Parse the JSON from Claude's response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse sections from AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
