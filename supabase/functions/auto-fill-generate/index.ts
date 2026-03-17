import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const EMBEDDING_MODEL = "text-embedding-3-small"
const MATCH_COUNT = 15

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model: EMBEDDING_MODEL }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data[0].embedding
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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
    } = await supabaseUser.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { items } = (await req.json()) as {
      items: { id: string; label: string; prompt: string }[]
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing items array" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!anthropicKey || !openaiKey) {
      return new Response(
        JSON.stringify({ error: "API keys not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // 1. Build a combined query from all item prompts for one RAG lookup
    const combinedQuery = items.map((i) => `${i.label}: ${i.prompt}`).join("\n")
    const embedding = await getEmbedding(combinedQuery, openaiKey)

    // 2. Vector search for relevant KB chunks (higher count for broader coverage)
    const { data: chunks, error: rpcError } = await supabase.rpc(
      "match_chunks",
      {
        query_embedding: JSON.stringify(embedding),
        match_count: MATCH_COUNT,
        filter_user_id: user.id,
      },
    )

    if (rpcError) {
      console.error("match_chunks error:", rpcError)
    }

    const context =
      chunks && chunks.length > 0
        ? chunks.map((c: { content: string }) => c.content).join("\n\n---\n\n")
        : "No knowledge base documents found. Answer based on general knowledge about education technology companies."

    // 3. Build the items list for Claude
    const itemsList = items
      .map((i) => `- ${i.id}: ${i.label} — ${i.prompt}`)
      .join("\n")

    // 4. Generate all responses in one Claude call
    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8192,
          system: `You are an RFP response assistant for ThinkCERCA, an education technology company. You will receive a list of RFP fields that need responses, along with knowledge base context.

Write all responses as a cohesive set — avoid repeating the same company background, mission statement, or introductory language across fields. Each response should be concise and specific to its field. If one field covers company overview, other fields should not re-state it.

For short fields (names, dates, addresses, URLs, etc.), give just the value — no sentences.
For narrative fields, write clear, professional prose appropriate for RFP submissions.

IMPORTANT: If the knowledge base does not contain the specific information needed for a field (e.g., a phone number, address, specific person's name, date, or any factual detail you are not sure about), do NOT make anything up. Instead, use a bracketed placeholder like [Phone Number], [Address], [Contact Name], [Start Date], etc. It is far better to leave a bracket for the user to fill in than to invent fake information.

Return a JSON object mapping each item ID to its response text:
{
  "s1-1": "ThinkCERCA",
  "s1-2": "response text here",
  ...
}

Return ONLY the JSON object, no other text.`,
          messages: [
            {
              role: "user",
              content: `Knowledge base context:\n\n${context}\n\n---\n\nRFP fields to fill:\n${itemsList}\n\nGenerate responses for all fields.`,
            },
          ],
        }),
      },
    )

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text()
      console.error("Claude error:", errText)
      return new Response(
        JSON.stringify({ error: `Claude API error: ${claudeResponse.status}` }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const claudeResult = await claudeResponse.json()
    const text = claudeResult.content?.[0]?.text ?? ""

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse responses from AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const responseMap = JSON.parse(jsonMatch[0]) as Record<string, string>

    // Build results array matching the input items
    const results = items.map((item) => ({
      id: item.id,
      response: responseMap[item.id] ?? "[No response generated]",
    }))

    return new Response(JSON.stringify({ results }), {
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
