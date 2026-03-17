import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50
const EMBEDDING_MODEL = "text-embedding-3-small"

function chunkText(text: string): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ")
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim())
    }
  }

  return chunks
}

async function getEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: EMBEDDING_MODEL,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data.map((item: { embedding: number[] }) => item.embedding)
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const {
      data: { user },
    } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      }
    ).auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { document_id } = await req.json()
    if (!document_id) {
      return new Response(
        JSON.stringify({ error: "Missing document_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Fetch the document (RLS bypassed with service role, but verify ownership)
    const { data: doc, error: docError } = await supabase
      .from("kb_documents")
      .select("id, user_id, raw_text")
      .eq("id", document_id)
      .single()

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (doc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Update status to indexing
    await supabase
      .from("kb_documents")
      .update({ status: "indexing" })
      .eq("id", document_id)

    // Chunk the document
    const chunks = chunkText(doc.raw_text)

    if (chunks.length === 0) {
      await supabase
        .from("kb_documents")
        .update({ status: "indexed", chunk_count: 0 })
        .eq("id", document_id)

      return new Response(
        JSON.stringify({ chunks: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get embeddings from OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    if (!openaiKey) {
      await supabase
        .from("kb_documents")
        .update({ status: "error" })
        .eq("id", document_id)

      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const embeddings = await getEmbeddings(chunks, openaiKey)

    // Delete existing chunks for this document (re-index)
    await supabase
      .from("kb_chunks")
      .delete()
      .eq("document_id", document_id)

    // Insert new chunks with embeddings
    const chunkRows = chunks.map((content, index) => ({
      document_id,
      chunk_index: index,
      content,
      embedding: JSON.stringify(embeddings[index]),
    }))

    const { error: insertError } = await supabase
      .from("kb_chunks")
      .insert(chunkRows)

    if (insertError) {
      await supabase
        .from("kb_documents")
        .update({ status: "error" })
        .eq("id", document_id)

      return new Response(
        JSON.stringify({ error: "Failed to store chunks: " + insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Update document status and chunk count
    await supabase
      .from("kb_documents")
      .update({ status: "indexed", chunk_count: chunks.length })
      .eq("id", document_id)

    return new Response(
      JSON.stringify({ chunks: chunks.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
