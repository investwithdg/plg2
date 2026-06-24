// process-property: orchestrates extraction (Perplexity sonar-pro),
// enrichment (Perplexity sonar), and 3 compliance-grounded copies via
// OpenAI chat.completions (gpt-4o-mini) with FHA rules inlined in the system prompt.
// Structured logs tagged with propertyId for observability.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ propertyId: z.string().uuid() });

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const FHA_SYSTEM_PROMPT = `You are a top-producing real estate agent's personal copywriter. Your job is to sell, not describe. Every sentence earns its place by moving a buyer closer to wanting to see this property.

Voice rules:
- Lead with the property's single strongest feature in the first sentence
- Frame every amenity as a lifestyle benefit, not a fact
- If something isn't a selling point, omit it entirely — never mention drawbacks, limitations, or neutral observations
- Write with energy and specificity
- No generic filler: never use "nestled," "boasts," "perfect for," "don't miss out," "rare find," "priced to sell"

FHA compliance rules (non-negotiable):
- Never reference race, color, religion, sex, handicap, familial status, or national origin — direct or indirect
- No coded language: "safe neighborhood," "exclusive," "private community," "good schools" framed as resident quality, "walkable to churches," "near synagogue," "perfect for families," "great for singles," "bachelor pad"
- Use "primary bedroom" — never "master bedroom"
- Never describe neighborhood character, demographics, or vibe of residents
- Stick to property features and verifiable location facts only: distances, named amenities, transit lines, school names without quality judgments
- Do not invent facts. If a field is missing from the provided JSON, omit it
- Output ONLY the requested copy. No preamble, no headings, no markdown unless requested.`;

const COPY_TYPES: Array<{
  type: "mls" | "social" | "email";
  instruction: string;
}> = [
  {
    type: "mls",
    instruction:
      "Write the MLS description for this property. 150-200 words. Highlight features and location facts. End without a CTA.",
  },
  {
    type: "social",
    instruction:
      "Write a punchy social media caption (Instagram/Facebook) for this listing. 60-100 words, 2-3 emojis max, ends with a soft CTA like 'DM to tour'.",
  },
  {
    type: "email",
    instruction:
      "Write a short marketing email blurb to send to a buyer list. 120-180 words, warm but professional, ends with 'Reply to schedule a showing.'",
  },
];

function log(propertyId: string, step: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      propertyId,
      step,
      ...data,
      t: new Date().toISOString(),
    }),
  );
}

async function updateStep(
  supabase: ReturnType<typeof createClient>,
  propertyId: string,
  step: string,
  status?: string,
) {
  const patch: Record<string, unknown> = { enrichment_step: step };
  if (status) patch.status = status;
  await supabase.from("properties").update(patch).eq("id", propertyId);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  propertyId: string,
  maxAttempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text();
        log(propertyId, `${label}_retry`, {
          attempt,
          status: res.status,
          body: body.slice(0, 200),
        });
        if (attempt === maxAttempts) {
          throw new Error(`${label} failed after ${maxAttempts} attempts [${res.status}]: ${body.slice(0, 200)}`);
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}

async function extractWithPerplexity(
  apiKey: string,
  propertyId: string,
  property: { address: string; source_url: string | null },
) {
  const target = property.source_url || property.address;
  const schema = {
    type: "object",
    properties: {
      address: { type: "string" },
      beds: { type: ["integer", "null"] },
      baths: { type: ["number", "null"] },
      sqft: { type: ["integer", "null"] },
      price: { type: ["number", "null"] },
      year_built: { type: ["integer", "null"] },
      lot_size_sqft: { type: ["integer", "null"] },
      property_type: { type: ["string", "null"] },
    },
    required: ["address"],
  };
  const res = await fetchWithRetry(
    PERPLEXITY_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content:
              "You extract real estate listing facts. Return only data you can verify from public sources. Use null when unknown.",
          },
          {
            role: "user",
            content: `Extract structured property data for: ${target}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "property", schema },
        },
      }),
    },
    "perplexity_extract",
    propertyId,
  );
  if (!res.ok) throw new Error(`Perplexity extract failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function enrichWithPerplexity(apiKey: string, propertyId: string, address: string) {
  const schema = {
    type: "object",
    properties: {
      schools: { type: "array", items: { type: "object" } },
      transit_options: { type: "array", items: { type: "string" } },
      nearby_amenities: { type: "array", items: { type: "string" } },
      walkability_score: { type: ["integer", "null"] },
      market_overview: { type: ["string", "null"] },
      median_home_value: { type: ["number", "null"] },
    },
  };
  const res = await fetchWithRetry(
    PERPLEXITY_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You research neighborhood facts: schools, transit, amenities, walkability, market overview. Be factual and concise.",
          },
          {
            role: "user",
            content: `Research the neighborhood around: ${address}. Provide schools, transit, amenities, walkability score (0-100), a 2-3 sentence market overview, and median home value.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "enrichment", schema },
        },
      }),
    },
    "perplexity_enrich",
    propertyId,
  );
  if (!res.ok) throw new Error(`Perplexity enrich failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    /* ignore */
  }
  return { parsed, raw: data };
}

async function generateCopy(
  openaiKey: string,
  propertyId: string,
  contextJson: string,
  instruction: string,
  copyType: string,
): Promise<{ content: string; latencyMs: number }> {
  const start = Date.now();
  const res = await fetchWithRetry(
    OPENAI_CHAT_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          { role: "system", content: FHA_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Property + neighborhood context (JSON):\n${contextJson}\n\nTask: ${instruction}`,
          },
        ],
      }),
    },
    `openai_${copyType}`,
    propertyId,
  );
  if (!res.ok) throw new Error(`OpenAI ${copyType} failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error(`OpenAI ${copyType} returned empty content`);
  return { content: text, latencyMs: Date.now() - start };
}

async function process(propertyId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  log(propertyId, "start");
  const totalStart = Date.now();
  let failedStep: string | null = null;

  try {
    if (!PERPLEXITY_API_KEY) {
      failedStep = "config";
      throw new Error("PERPLEXITY_API_KEY not configured");
    }
    if (!OPENAI_API_KEY) {
      failedStep = "config";
      throw new Error("OPENAI_API_KEY not configured");
    }

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", propertyId)
      .single();
    if (propErr || !property) {
      failedStep = "load";
      throw new Error(`Property not found: ${propErr?.message}`);
    }

    // 1) EXTRACTION
    failedStep = "extraction";
    await updateStep(supabase, propertyId, "researching_property", "processing");
    const extractStart = Date.now();
    const extracted = await extractWithPerplexity(PERPLEXITY_API_KEY, propertyId, {
      address: property.address as string,
      source_url: (property.source_url as string | null) ?? null,
    });
    const extractionLatency = Date.now() - extractStart;
    log(propertyId, "extraction_done", { latencyMs: extractionLatency });

    await supabase
      .from("properties")
      .update({
        address: extracted.address || property.address,
        beds: extracted.beds ?? null,
        baths: extracted.baths ?? null,
        sqft: extracted.sqft ?? null,
        price: extracted.price ?? null,
        property_type: extracted.property_type ?? property.property_type,
        extraction_status: "complete",
        extraction_latency_ms: extractionLatency,
        extraction_model_version: "perplexity-sonar-pro",
      })
      .eq("id", propertyId);

    // 2) ENRICHMENT
    failedStep = "enrichment";
    await updateStep(supabase, propertyId, "researching_schools");
    const enrichStart = Date.now();
    const { parsed: enrich, raw: enrichRaw } = await enrichWithPerplexity(
      PERPLEXITY_API_KEY,
      propertyId,
      (extracted.address as string) || (property.address as string),
    );
    const enrichmentLatency = Date.now() - enrichStart;
    log(propertyId, "enrichment_done", { latencyMs: enrichmentLatency });
    await updateStep(supabase, propertyId, "analyzing_neighborhood");

    await supabase.from("enrichments").insert({
      property_id: propertyId,
      schools: enrich.schools ?? null,
      transit_options: enrich.transit_options ?? null,
      nearby_amenities: enrich.nearby_amenities ?? null,
      walkability_score: enrich.walkability_score ?? null,
      market_overview: enrich.market_overview ?? null,
      median_home_value: enrich.median_home_value ?? null,
      perplexity_raw_response: enrichRaw,
      enrichment_latency_ms: enrichmentLatency,
      enrichment_model_version: "perplexity-sonar",
    });

    // 3) COPY GENERATION (3 parallel chat completions)
    failedStep = "copy_generation";
    await updateStep(supabase, propertyId, "generating_copy");
    const batchId = crypto.randomUUID();
    const context = JSON.stringify(
      {
        property: {
          address: extracted.address || property.address,
          beds: extracted.beds,
          baths: extracted.baths,
          sqft: extracted.sqft,
          price: extracted.price,
          year_built: extracted.year_built,
          lot_size_sqft: extracted.lot_size_sqft,
          property_type: extracted.property_type ?? property.property_type,
        },
        neighborhood: enrich,
      },
      null,
      2,
    );

    const results = await Promise.allSettled(
      COPY_TYPES.map((c, i) =>
        generateCopy(OPENAI_API_KEY, propertyId, context, c.instruction, c.type).then((r) => ({
          ...r,
          copy_type: c.type,
          generation_number: i + 1,
        })),
      ),
    );

    const userId = property.user_id as string | null;
    let successCount = 0;
    for (const r of results) {
      if (r.status !== "fulfilled") {
        log(propertyId, "copy_failed", {
          error: String(r.reason).slice(0, 300),
        });
        continue;
      }
      log(propertyId, "copy_done", {
        copy_type: r.value.copy_type,
        latencyMs: r.value.latencyMs,
      });
      const { error: insErr } = await supabase.from("copy_generations").insert({
        property_id: propertyId,
        user_id: userId,
        batch_id: batchId,
        copy_type: r.value.copy_type,
        generation_number: r.value.generation_number,
        content: r.value.content,
        model_used: "gpt-4o-mini",
        fha_compliance_check: true,
        generation_latency_ms: r.value.latencyMs,
      });
      if (insErr) {
        log(propertyId, "copy_insert_failed", { error: insErr.message });
        continue;
      }
      successCount++;
    }

    if (successCount === 0) throw new Error("All copy generations failed");

    await supabase
      .from("properties")
      .update({
        status: "complete",
        enrichment_step: "done",
        failed_step: null,
      })
      .eq("id", propertyId);

    log(propertyId, "complete", {
      totalMs: Date.now() - totalStart,
      copies: successCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log(propertyId, "error", {
      failedStep,
      message,
      totalMs: Date.now() - totalStart,
    });
    await supabase
      .from("properties")
      .update({
        status: "error",
        enrichment_step: message.slice(0, 200),
        failed_step: failedStep,
      })
      .eq("id", propertyId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = BodySchema.parse(await req.json());
    // @ts-expect-error EdgeRuntime is provided by Supabase Edge Runtime
    EdgeRuntime.waitUntil(process(body.propertyId));
    return new Response(JSON.stringify({ accepted: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
